<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  pages: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  category: { type: String, default: 'Magazine' },
})
const emit = defineEmits(['update:modelValue'])

// Compute header colors based on category
const headerColors = computed(() => {
  const cat = props.category.toLowerCase()
  if (cat === 'folio') {
    return {
      gradient: 'linear-gradient(135deg, #39acff 0%, #6bc5ff 100%)',
      shadow: 'rgba(57, 172, 255, 0.2)',
      dotGradient: 'linear-gradient(135deg, #39acff 0%, #6bc5ff 100%)',
      dotShadow: 'rgba(57, 172, 255, 0.4)',
      textColor: '#2c2c2c',
      textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
    }
  } else if (cat === 'newsletter') {
    return {
      gradient: 'linear-gradient(135deg, #353535 0%, #555555 100%)',
      shadow: 'rgba(53, 53, 53, 0.2)',
      dotGradient: 'linear-gradient(135deg, #353535 0%, #555555 100%)',
      dotShadow: 'rgba(53, 53, 53, 0.4)',
      textColor: '#ffffff',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    }
  }
  // Default: Magazine (yellow)
  return {
    gradient: 'linear-gradient(135deg, #f5c52b 0%, #ffd966 100%)',
    shadow: 'rgba(245, 197, 43, 0.2)',
    dotGradient: 'linear-gradient(135deg, #f5c52b 0%, #ffd966 100%)',
    dotShadow: 'rgba(245, 197, 43, 0.4)',
    textColor: '#2c2c2c',
    textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
  }
})

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
    // cleanup previous pdf
    if (pdfDoc) {
      pdfDoc.cleanup?.()
      pdfDoc.destroy?.()
    }
    pdfDoc = null
    pdfLib = null
    localPages.value = []

    if (!p) return
    // handle case where p is a string (pdf url)
    if (typeof p === 'string' && p.toLowerCase().endsWith('.pdf')) {
      await loadPdf(p)
      // initialize placeholders - add null check
      if (pdfDoc && pdfDoc.numPages) {
        localPages.value = Array.from({ length: pdfDoc.numPages }).map(() => '')
        // render first page
        renderPdfPage(0)
      }
    } else if (
      Array.isArray(p) &&
      p.length > 0 &&
      typeof p[0] === 'string' &&
      p[0].toLowerCase().endsWith('.pdf')
    ) {
      await loadPdf(p[0])
      if (pdfDoc && pdfDoc.numPages) {
        localPages.value = Array.from({ length: pdfDoc.numPages }).map(() => '')
        renderPdfPage(0)
      }
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
    pdfLib = await import('pdfjs-dist')
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
    if (!pdfDoc || !pdfDoc.numPages) return
    if (index < 0 || index >= pdfDoc.numPages) return
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

onBeforeUnmount(() => {
  // cleanup pdf resources
  if (pdfDoc) {
    pdfDoc.cleanup?.()
    pdfDoc.destroy?.()
  }
})
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    width="900"
    max-width="85vw"
    persistent
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <v-card class="viewer-card elevation-24">
      <v-card-title
        class="viewer-header d-flex justify-space-between align-center pa-4"
        :style="{
          background: headerColors.gradient,
          boxShadow: `0 2px 8px ${headerColors.shadow}`,
        }"
      >
        <div>
          <div
            class="text-h6 font-weight-bold viewer-title"
            :style="{ color: headerColors.textColor, textShadow: headerColors.textShadow }"
          >
            {{ title }}
          </div>
          <div class="text-caption page-indicator mt-1" :style="{ color: headerColors.textColor }">
            <v-icon size="small" class="mr-1" :color="headerColors.textColor"
              >mdi-book-open-page-variant</v-icon
            >
            Page {{ current + 1 }} of {{ localPages.length || pages.length }}
          </div>
        </div>
        <v-btn icon size="default" variant="text" class="close-btn" @click="close">
          <v-icon :color="headerColors.textColor">mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-5">
        <div class="flipbook-wrap">
          <div class="flipbook-container">
            <div class="page-frame">
              <img v-if="localPages[current]" :src="localPages[current]" class="flipbook-page" />
              <div v-else class="flipbook-placeholder">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                  width="3"
                ></v-progress-circular>
                <div class="placeholder-inner mt-3">Loading page…</div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="action-bar pa-4 d-flex justify-space-between align-center">
        <v-btn
          variant="tonal"
          size="default"
          class="nav-btn prev-btn"
          @click="prevPage"
          :disabled="current === 0 || animating"
          prepend-icon="mdi-chevron-left"
        >
          Previous
        </v-btn>
        <div class="page-dots">
          <span
            v-for="i in Math.min(localPages.length || pages.length, 10)"
            :key="i"
            :class="['dot', { active: i === current + 1 }]"
            :style="
              i === current + 1
                ? {
                    background: headerColors.dotGradient,
                    boxShadow: `0 2px 6px ${headerColors.dotShadow}`,
                  }
                : {}
            "
          ></span>
        </div>
        <v-btn
          variant="flat"
          size="default"
          color="primary"
          class="nav-btn next-btn"
          :style="{ background: headerColors.gradient + ' !important' }"
          @click="nextPage"
          :disabled="current >= (localPages.length || pages.length) - 1 || animating"
          append-icon="mdi-chevron-right"
        >
          Next
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.viewer-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
}

.viewer-header {
  border-bottom: none;
  /* Background and box-shadow are now applied dynamically via :style */
}

.viewer-title {
  /* Color and text-shadow are now applied dynamically via :style */
}

.page-indicator {
  /* Color is now applied dynamically via :style */
  display: flex;
  align-items: center;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: rotate(90deg);
}

.flipbook-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 55vh;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.flipbook-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(245, 197, 43, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.flipbook-container {
  width: 80%;
  max-width: 700px;
  perspective: 1600px;
  position: relative;
  z-index: 1;
}

.page-frame {
  position: relative;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.2);
}

.flipbook-page {
  width: 100%;
  height: auto;
  display: block;
  backface-visibility: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform-origin: center center;
  transition:
    transform 450ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 350ms ease-in-out,
    box-shadow 0.3s ease;
  background: white;
}

.flipbook-page:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.flipbook-placeholder {
  width: 100%;
  height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%);
  border-radius: 8px;
  border: 2px dashed #d0d0d0;
}

.placeholder-inner {
  color: #888;
  font-size: 14px;
  font-weight: 500;
}

.flip-out-next .flipbook-page {
  transform: rotateY(-80deg) translateZ(-20px);
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

.action-bar {
  background: linear-gradient(135deg, #f8f8f8 0%, #ffffff 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
}

.nav-btn {
  min-width: 140px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.nav-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.next-btn {
  /* Background is now applied dynamically via :style */
  color: #2c2c2c !important;
}

.page-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d0d0d0;
  transition: all 0.3s ease;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  /* Background and box-shadow are now applied dynamically via :style */
}

/* Responsive */
@media (max-width: 960px) {
  .flipbook-container {
    width: 85%;
  }

  .flipbook-wrap {
    min-height: 50vh;
    padding: 15px;
  }

  .page-frame {
    padding: 10px;
  }

  .page-dots {
    display: none;
  }

  .nav-btn {
    min-width: 110px;
  }
}

@media (max-width: 600px) {
  .flipbook-container {
    width: 90%;
  }

  .flipbook-wrap {
    min-height: 45vh;
    padding: 12px;
  }

  .flipbook-placeholder {
    height: 45vh;
  }

  .page-frame {
    padding: 8px;
  }

  .nav-btn {
    min-width: 95px;
    font-size: 0.875rem;
  }

  .viewer-header {
    padding: 12px !important;
  }
}
</style>
