<script setup>
import { ref, watch, onMounted } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  pages: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const current = ref(0)
const animating = ref(false)
const direction = ref('next')
const localPages = ref([]) // resolved image data URLs or original image URLs
let pdfDoc = null
let pdfLib = null

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      current.value = 0
    }
  },
)

watch(
  () => props.pages,
  (p) => {
    // when pages prop changes, prepare localPages
    preparePages(p)
  },
  { immediate: true },
)

async function preparePages(p) {
  // p may be an array of image urls or a single pdf url string
  try {
    pdfDoc = null
    pdfLib = null
    localPages.value = []

    if (!p) return
    // handle case where p is a string (pdf url)
    if (typeof p === 'string' && p.toLowerCase().endsWith('.pdf')) {
      await loadPdf(p)
      // initialize placeholders
      localPages.value = Array.from({ length: pdfDoc.numPages }).map(() => '')
      // render first page
      renderPdfPage(0)
    } else if (
      Array.isArray(p) &&
      p.length > 0 &&
      typeof p[0] === 'string' &&
      p[0].toLowerCase().endsWith('.pdf')
    ) {
      await loadPdf(p[0])
      localPages.value = Array.from({ length: pdfDoc.numPages }).map(() => '')
      renderPdfPage(0)
    } else if (Array.isArray(p)) {
      localPages.value = p.slice()
    }
  } catch (err) {
    console.error('Error preparing pages:', err)
    localPages.value = Array.isArray(p) ? p.slice() : []
  }
}

async function loadPdf(url) {
  try {
    // dynamic import of pdfjs-dist
    pdfLib = await import('pdfjs-dist/legacy/build/pdf')
    // configure worker
    if (pdfLib.GlobalWorkerOptions) {
      pdfLib.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@3.5.141/build/pdf.worker.min.js'
    }
    const loadingTask = pdfLib.getDocument(url)
    pdfDoc = await loadingTask.promise
  } catch (err) {
    console.error('Error loading PDF:', err)
    throw err
  }
}

async function renderPdfPage(index) {
  try {
    if (!pdfDoc) return
    if (localPages.value[index]) return // already rendered
    const page = await pdfDoc.getPage(index + 1)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const renderContext = { canvasContext: context, viewport }
    await page.render(renderContext).promise
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    localPages.value[index] = dataUrl
    // pre-render next page
    if (index + 1 < pdfDoc.numPages) renderPdfPage(index + 1)
  } catch (err) {
    console.error('Error rendering pdf page:', err)
  }
}

function close() {
  emit('update:modelValue', false)
}

function prevPage() {
  if (animating.value) return
  if (current.value === 0) return
  direction.value = 'prev'
  flipTo(current.value - 1)
}

function nextPage() {
  if (animating.value) return
  if (current.value >= (localPages.value.length || props.pages.length) - 1) return
  direction.value = 'next'
  flipTo(current.value + 1)
}

function flipTo(targetIndex) {
  animating.value = true
  // simple timing to simulate page flip: animate out, swap, animate in
  const outClass = direction.value === 'next' ? 'flip-out-next' : 'flip-out-prev'
  const inClass = direction.value === 'next' ? 'flip-in-next' : 'flip-in-prev'

  const container = document.querySelector('.flipbook-container')
  if (!container) {
    current.value = targetIndex
    animating.value = false
    return
  }

  container.classList.add(outClass)
  setTimeout(() => {
    container.classList.remove(outClass)
    current.value = targetIndex
    container.classList.add(inClass)
    setTimeout(() => {
      container.classList.remove(inClass)
      animating.value = false
      // after page flip, if page is placeholder and pdf present, render it
      const idx = current.value
      if (localPages.value[idx] === '' && pdfDoc) renderPdfPage(idx)
    }, 450)
  }, 300)
}

onMounted(() => {})
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    width="900"
    persistent
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h6">{{ title }}</div>
          <div class="text-subtitle-2">
            Page {{ current + 1 }} / {{ localPages.length || pages.length }}
          </div>
        </div>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="flipbook-wrap">
          <div class="flipbook-container">
            <img v-if="localPages[current]" :src="localPages[current]" class="flipbook-page" />
            <div v-else class="flipbook-placeholder">
              <div class="placeholder-inner">Loading page…</div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="prevPage" :disabled="current === 0 || animating">Prev</v-btn>
        <v-btn
          color="primary"
          @click="nextPage"
          :disabled="current >= (localPages.length || pages.length) - 1 || animating"
          >Next</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.flipbook-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
.flipbook-container {
  width: 70%;
  perspective: 1400px;
}
.flipbook-page {
  width: 100%;
  height: auto;
  display: block;
  backface-visibility: hidden;
  border-radius: 6px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  transform-origin: center center;
  transition:
    transform 400ms ease-in-out,
    opacity 300ms ease-in-out;
}
.flipbook-placeholder {
  width: 100%;
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 6px;
}
.placeholder-inner {
  color: #666;
}
.flip-out-next .flipbook-page {
  transform: rotateY(-80deg) translateZ(-20px);
  opacity: 0.2;
}
.flip-in-next .flipbook-page {
  transform: rotateY(80deg) translateZ(-20px);
  opacity: 0.2;
}
.flip-in-next .flipbook-page {
  animation: flipInNext 450ms forwards;
}
.flip-out-prev .flipbook-page {
  transform: rotateY(80deg) translateZ(-20px);
  opacity: 0.2;
}
.flip-in-prev .flipbook-page {
  transform: rotateY(-80deg) translateZ(-20px);
  opacity: 0.2;
}
.flip-in-prev .flipbook-page {
  animation: flipInPrev 450ms forwards;
}

@keyframes flipInNext {
  from {
    transform: rotateY(80deg) translateZ(-20px);
    opacity: 0.2;
  }
  to {
    transform: rotateY(0deg) translateZ(0);
    opacity: 1;
  }
}
@keyframes flipInPrev {
  from {
    transform: rotateY(-80deg) translateZ(-20px);
    opacity: 0.2;
  }
  to {
    transform: rotateY(0deg) translateZ(0);
    opacity: 1;
  }
}
</style>
