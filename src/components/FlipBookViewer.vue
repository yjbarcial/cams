<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import Flipbook from 'flipbook-vue'

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

const currentPage = ref(1) // flipbook-vue uses 1-based indexing
const flipbookRef = ref(null)
const localPages = ref([null]) // Start with null at index 0 for 1-based indexing
const totalPages = ref(0)
let pdfDoc = null
let pdfLib = null
const renderQueue = new Set()

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      currentPage.value = 1
    }
  },
)

watch(
  () => props.pages,
  (p) => {
    preparePages(p)
  },
  { immediate: true },
)

async function preparePages(p) {
  try {
    // cleanup previous pdf
    if (pdfDoc) {
      pdfDoc.cleanup?.()
      pdfDoc.destroy?.()
    }
    pdfDoc = null
    pdfLib = null
    localPages.value = [null] // Start with null at index 0
    totalPages.value = 0

    if (!p) return

    // Handle PDF URL (string or array with PDF)
    const pdfUrl =
      typeof p === 'string' && p.toLowerCase().endsWith('.pdf')
        ? p
        : Array.isArray(p) &&
            p.length > 0 &&
            typeof p[0] === 'string' &&
            p[0].toLowerCase().endsWith('.pdf')
          ? p[0]
          : null

    if (pdfUrl) {
      await loadPdf(pdfUrl)
      if (pdfDoc && pdfDoc.numPages) {
        totalPages.value = pdfDoc.numPages
        localPages.value = Array(pdfDoc.numPages + 1).fill(null)

        // Render first 3 pages immediately
        for (let i = 0; i < Math.min(3, pdfDoc.numPages); i++) {
          await renderPdfPage(i)
        }

        // Render remaining pages progressively without blocking
        requestAnimationFrame(() => {
          renderRemainingPages(3)
        })
      }
    } else if (Array.isArray(p) && p.length > 0) {
      // Handle image array - convert to 1-based indexing
      totalPages.value = p.length
      localPages.value = [null, ...p]
    }
  } catch (err) {
    console.error('Error preparing pages:', err)
    localPages.value = [null]
    totalPages.value = 0
  }
}

async function loadPdf(url) {
  try {
    pdfLib = await import('pdfjs-dist')
    if (pdfLib.GlobalWorkerOptions) {
      pdfLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
    const loadingTask = pdfLib.getDocument(url)
    pdfDoc = await loadingTask.promise
  } catch (err) {
    console.error('Error loading PDF:', err)
    throw err
  }
}

async function renderRemainingPages(startIndex) {
  if (!pdfDoc) return
  for (let i = startIndex; i < pdfDoc.numPages; i++) {
    if (!renderQueue.has(i)) {
      await renderPdfPage(i)
      // Give browser time to breathe
      if (i % 2 === 0) await new Promise((r) => setTimeout(r, 10))
    }
  }
}

async function renderPdfPage(index) {
  if (renderQueue.has(index)) return
  renderQueue.add(index)

  try {
    if (!pdfDoc || !pdfDoc.numPages) return
    if (index < 0 || index >= pdfDoc.numPages) return

    const arrayIndex = index + 1
    if (localPages.value[arrayIndex]) return

    const page = await pdfDoc.getPage(index + 1)
    const viewport = page.getViewport({ scale: 0.8 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    })
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    localPages.value[arrayIndex] = canvas.toDataURL('image/jpeg', 0.6)
  } catch (err) {
    console.error('Error rendering pdf page:', err)
  } finally {
    renderQueue.delete(index)
  }
}

function close() {
  emit('update:modelValue', false)
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

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
    scrim="rgba(0,0,0,0.7)"
    content-class="transparent-dialog"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <!-- Separate Topbar (Outside viewer container) -->
    <div
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
          Page {{ currentPage }} of {{ totalPages }}
        </div>
      </div>
      <v-btn
        icon="mdi-arrow-left"
        size="default"
        variant="elevated"
        color="white"
        class="return-btn"
        @click="close"
      ></v-btn>
    </div>

    <!-- Viewer Container -->
    <v-card class="viewer-card elevation-24">
      <div class="flipbook-wrap">
        <Flipbook
          v-if="localPages.length > 1"
          ref="flipbookRef"
          class="flipbook"
          :pages="localPages"
          v-model:page="currentPage"
          :startPage="1"
          :zooms="null"
          :clickToZoom="false"
          :singlePage="false"
          :flipDuration="300"
          :perspective="1200"
          :nPolygons="3"
          :ambient="0.8"
          :gloss="0.1"
          :swipeMin="20"
        />
        <div v-else class="flipbook-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
            width="4"
          ></v-progress-circular>
          <div class="mt-4 text-h6">Loading pages...</div>
        </div>
      </div>

      <!-- Viewer Controls at Bottom -->
      <div class="viewer-controls-bar">
        <v-btn
          icon="mdi-chevron-left"
          size="small"
          variant="text"
          class="control-btn-bar"
          @click="prevPage"
          :disabled="currentPage <= 1"
        ></v-btn>

        <div class="page-info-bar">{{ currentPage }} / {{ totalPages }}</div>

        <v-btn
          icon="mdi-chevron-right"
          size="small"
          variant="text"
          class="control-btn-bar"
          @click="nextPage"
          :disabled="currentPage >= totalPages"
        ></v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.transparent-dialog) {
  background: transparent !important;
  box-shadow: none !important;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.viewer-header {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
  /* Background and box-shadow are now applied dynamically via :style */
}

.viewer-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25) !important;
}

.viewer-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding: 0;
  background: transparent;
}

.viewer-title {
  /* Color and text-shadow are now applied dynamically via :style */
  font-size: 1rem;
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
  min-height: 60vh;
  background: #f5f5f5;
  padding: 40px 20px;
}

/* Viewer Controls Bar (Issuu style) */
.viewer-controls-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.85);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.control-btn-bar {
  color: white !important;
  opacity: 0.9;
  transition: all 0.2s ease;
}

.control-btn-bar:hover:not(:disabled) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1) !important;
}

.control-btn-bar:disabled {
  opacity: 0.3;
}

.page-info-bar {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
  user-select: none;
}

.flipbook {
  width: 100% !important;
  max-width: 1000px !important;
  height: 600px !important;
  margin: 0 auto !important;
  transform-style: preserve-3d !important;
}

:deep(.flipbook .viewport) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: visible !important;
  perspective: 1200px !important;
  perspective-origin: center !important;
  transform-style: preserve-3d !important;
}

:deep(.flipbook .bounding-box) {
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  transform-style: preserve-3d !important;
  transition: transform 0.3s ease-out;
}

:deep(.flipbook .page) {
  background: #ffffff;
  box-shadow: none;
  backface-visibility: hidden !important;
  transform-style: preserve-3d !important;
  transition: transform 0.3s ease-out;
}

:deep(.flipbook .page img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: auto;
  user-select: none;
}

.flipbook-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
  background: #fafafa;
  width: 100%;
  border-radius: 8px;
}

.return-btn {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.return-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Responsive */
@media (max-width: 960px) {
  .flipbook {
    max-width: 800px !important;
    height: 500px !important;
  }

  .flipbook-wrap {
    min-height: 50vh;
    padding: 15px;
  }

  .viewer-controls-bar {
    padding: 10px 16px;
    gap: 16px;
  }

  .page-info-bar {
    font-size: 0.75rem;
    min-width: 60px;
  }

  .viewer-header {
    padding: 12px !important;
  }
}
</style>
