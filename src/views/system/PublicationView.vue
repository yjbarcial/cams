<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import { supabase } from '@/utils/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import { PageFlip } from 'page-flip'

const route = useRoute()
const router = useRouter()

const publication = ref(null)
const loading = ref(true)
const currentPage = ref(1)
const zoomLevel = ref(1)
const viewMode = ref('single') // 'single' or 'double'
const pages = ref([])
const numPages = ref(null)
const pdfLoading = ref(false)
const showKeyboardHint = ref(false)
const currentZoom = ref(1)
const pageFlipContainer = ref(null)
let pdfDocument = null
let pageFlipInstance = null
const renderQueue = new Set()

const totalPages = computed(() => {
  return numPages.value || 1
})

// Watch currentPage changes and preload adjacent pages (debounced)
let pageChangeTimeout = null
watch(currentPage, (newVal, oldVal) => {
  console.log('📖 Page changed from', oldVal, 'to', newVal)

  if (!pdfDocument) return

  // Debounce to prevent rapid firing
  if (pageChangeTimeout) clearTimeout(pageChangeTimeout)

  pageChangeTimeout = setTimeout(() => {
    // Render adjacent pages if not already rendered
    // Account for 1-based indexing: newVal is the flipbook page number
    const pagesToRender = [newVal, newVal + 1, newVal + 2].filter(
      (pageNum) => pageNum > 0 && pageNum <= numPages.value && !pages.value[pageNum],
    )

    // Render in background without awaiting
    pagesToRender.forEach((pageNum) => {
      const pageIdx = pageNum - 1 // Convert to 0-based for PDF rendering
      if (!renderQueue.has(pageIdx)) {
        renderPage(pdfDocument, pageIdx).catch((err) =>
          console.warn('Background render error:', err),
        )
      }
    })
  }, 100)
})

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// Load PDF with progressive rendering to prevent lag
async function loadPDF(pdfUrl) {
  try {
    console.log('🔄 Loading PDF:', pdfUrl)
    pdfLoading.value = true
    pages.value = [] // Clear previous pages

    const loadingTask = pdfjsLib.getDocument(pdfUrl)
    pdfDocument = await loadingTask.promise
    numPages.value = pdfDocument.numPages
    console.log('✅ PDF loaded successfully. Total pages:', numPages.value)

    // Initialize pages array with null for flipbook (flipbook uses 1-based indexing)
    // Add a null at index 0 to align with flipbook's 1-based page numbering
    pages.value = Array(pdfDocument.numPages + 1).fill(null)
    pages.value[0] = null // Placeholder for index 0 (flipbook starts at page 1)

    // Render ALL pages before initializing PageFlip
    for (let i = 0; i < pdfDocument.numPages; i++) {
      await renderPage(pdfDocument, i)
    }

    pdfLoading.value = false

    // Show keyboard hints briefly when PDF loads
    showKeyboardHint.value = true
    setTimeout(() => {
      showKeyboardHint.value = false
    }, 5000)

    console.log('✅ All pages rendered, initializing PageFlip')

    // Initialize PageFlip after ALL pages are loaded
    await nextTick()
    initPageFlip()
  } catch (error) {
    console.error('❌ Error loading PDF:', error)
    pdfLoading.value = false
    alert('Failed to load PDF: ' + error.message)
  }
}

// Render remaining pages progressively without blocking UI
async function renderRemainingPages(pdf, startIndex) {
  for (let i = startIndex; i < pdf.numPages; i++) {
    // Check if page is already being rendered
    if (renderQueue.has(i) || pages.value[i + 1] !== null) continue

    // Render page
    await renderPage(pdf, i)

    // Give browser time to breathe after each page for smoother UI
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  console.log('✅ All pages rendered')
}

// Render a single PDF page to canvas (optimized for performance)
async function renderPage(pdf, pageIndex) {
  if (renderQueue.has(pageIndex)) return
  renderQueue.add(pageIndex)

  try {
    const page = await pdf.getPage(pageIndex + 1) // PDF pages are 1-indexed
    const viewport = page.getViewport({ scale: 2.0 }) // Balanced scale for performance and quality

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance
    })
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    // Store rendered page at index+1 to align with flipbook's 1-based indexing
    pages.value[pageIndex + 1] = canvas.toDataURL('image/jpeg', 0.85)
    console.log(`✅ Rendered page ${pageIndex + 1} at array index ${pageIndex + 1}`)
  } catch (error) {
    console.error(`Error rendering page ${pageIndex + 1}:`, error)
  } finally {
    renderQueue.delete(pageIndex)
  }
}

onMounted(async () => {
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyPress)

  const id = route.params.id

  // Handle test publication
  if (id === 'test-publication-1') {
    publication.value = {
      id: 'test-publication-1',
      title: 'Test Publication: The Art of Digital Publishing',
      category: 'Magazine',
      cover: '/images/lib-hd.jpg',
      publishedAt: new Date().toISOString(),
      content: `
        <h2>Welcome to Our Test Publication</h2>
        <p>This is a comprehensive test article designed to showcase the capabilities of our digital publishing platform. The content you're reading demonstrates how text, formatting, and various elements come together to create an engaging reading experience.</p>
        
        <h3>Why Digital Publishing Matters</h3>
        <p>In today's fast-paced world, digital publishing has revolutionized the way we consume and share information. It offers unprecedented accessibility, allowing readers to access content from anywhere in the world at any time. This democratization of knowledge has transformed education, journalism, and creative writing.</p>
        
        <h3>The Power of Typography</h3>
        <p>Typography is more than just choosing fonts—it's about creating a visual hierarchy that guides readers through your content. Good typography enhances readability, establishes mood, and reinforces your brand identity. Every font choice, line height, and spacing decision contributes to the overall reading experience.</p>
        
        <blockquote>
          "Design is not just what it looks like and feels like. Design is how it works." - Steve Jobs
        </blockquote>
        
        <h3>Key Features of Modern Publishing</h3>
        <ul>
          <li><strong>Responsive Design:</strong> Content adapts seamlessly across all devices</li>
          <li><strong>Interactive Elements:</strong> Engaging multimedia enriches the narrative</li>
          <li><strong>Accessibility:</strong> Inclusive design ensures everyone can access content</li>
          <li><strong>Analytics:</strong> Data-driven insights help improve future publications</li>
          <li><strong>Search Optimization:</strong> Smart indexing makes content discoverable</li>
        </ul>
        
        <h3>Looking Ahead</h3>
        <p>As we continue to evolve in this digital age, the future of publishing looks bright. Emerging technologies like artificial intelligence, augmented reality, and voice interfaces are opening new possibilities for storytelling and content delivery. The key is to embrace these innovations while maintaining the core values of quality, accuracy, and reader engagement.</p>
        
        <p>This test publication serves as a foundation for exploring these possibilities. Whether you're a writer, editor, designer, or reader, understanding the mechanics of digital publishing empowers you to create and consume content more effectively.</p>
        
        <h3>Final Thoughts</h3>
        <p>Thank you for taking the time to explore this test publication. We hope it demonstrates the potential of our platform and inspires you to create your own compelling content. The journey of digital publishing is just beginning, and we're excited to be part of it with you.</p>
      `,
      mediaUploaded: '',
      writers: 'The Gold Panicles',
      artists: 'Creative Team',
      volumeIssue: 'Vol. 1, Issue 1',
      tags: ['Digital Publishing', 'Typography', 'Design', 'Technology'],
    }
    loading.value = false

    // Load the sample PDF for flipbook
    const samplePdfPath = '/LearnVue-Vue-3-Cheatsheet.pdf'
    await loadPDF(samplePdfPath)
    return
  }

  // Fetch from Supabase
  try {
    const { data, error } = await supabase.from('archives').select('*').eq('id', id).single()

    if (error) throw error

    if (data) {
      publication.value = {
        id: data.id,
        title: data.title || 'Untitled',
        category: data.category
          ? String(data.category).charAt(0).toUpperCase() + String(data.category).slice(1)
          : 'Magazine',
        cover: data.cover_image_url || '/images/lib-hd.jpg',
        publishedAt: data.publication_date_iso || data.created_at,
        content: data.description || '',
        mediaUploaded: data.file_url || '',
        writers: data.authors || 'The Gold Panicles',
        artists: data.authors || 'The Gold Panicles',
        volumeIssue: data.volume_issue || '',
        tags: data.tags || [],
      }

      // Load PDF if available
      if (
        publication.value.mediaUploaded &&
        publication.value.mediaUploaded.toLowerCase().endsWith('.pdf')
      ) {
        await loadPDF(publication.value.mediaUploaded)
      }
    }
  } catch (err) {
    console.error('Error loading publication:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  // Remove keyboard event listener
  window.removeEventListener('keydown', handleKeyPress)

  // Cleanup PageFlip instance
  if (pageFlipInstance) {
    pageFlipInstance.destroy()
    pageFlipInstance = null
  }

  // Cleanup PDF resources
  if (pdfDocument) {
    pdfDocument.cleanup?.()
    pdfDocument.destroy?.()
    pdfDocument = null
  }

  // Clear pages to free memory
  pages.value = []
  renderQueue.clear()
})

// Initialize PageFlip library
function initPageFlip() {
  if (!pageFlipContainer.value || pages.value.length <= 1) return

  try {
    pageFlipInstance = new PageFlip(pageFlipContainer.value, {
      width: 450,
      height: 600,
      size: 'fixed',
      minWidth: 315,
      maxWidth: 900,
      minHeight: 420,
      maxHeight: 1200,
      maxShadowOpacity: 0,
      showCover: true,
      mobileScrollSupport: false,
      swipeDistance: 50,
      clickEventForward: false,
      usePortrait: false,
      startPage: 0,
      drawShadow: false,
      flippingTime: 600,
      useMouseEvents: true,
      autoSize: false,
      showPageCorners: false,
      disableFlipByClick: true,
    })

    // Create page elements
    const pageElements = []
    for (let i = 1; i < pages.value.length; i++) {
      if (pages.value[i]) {
        const pageDiv = document.createElement('div')
        pageDiv.className = 'page-content'
        pageDiv.style.backgroundColor = '#ffffff'
        pageDiv.style.backgroundSize = 'cover'

        const img = document.createElement('img')
        img.src = pages.value[i]
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'contain'
        img.draggable = false

        pageDiv.appendChild(img)
        pageElements.push(pageDiv)
      }
    }

    // Load pages into PageFlip
    pageFlipInstance.loadFromHTML(pageElements)

    // Listen to page flip events
    pageFlipInstance.on('flip', (e) => {
      currentPage.value = e.data + 1
      console.log('📖 Current page index:', e.data, '| Display page:', currentPage.value)
    })

    pageFlipInstance.on('changeState', (e) => {
      console.log('📘 State:', e.data)
    })

    // Set initial page
    currentPage.value = 1

    console.log('✅ PageFlip initialized with', pageElements.length, 'pages')
  } catch (error) {
    console.error('❌ Error initializing PageFlip:', error)
  }
}

function goBack() {
  router.push({ name: 'archive' })
}

function nextPage() {
  if (!pageFlipInstance) {
    console.warn('⚠️ PageFlip instance not initialized')
    return
  }
  try {
    const currentIdx = pageFlipInstance.getCurrentPageIndex()
    console.log('📖 Next clicked - Current index:', currentIdx, 'Total pages:', numPages.value)
    // Reset zoom to normal before flipping
    currentZoom.value = 1
    pageFlipInstance.flipNext()
  } catch (err) {
    console.error('❌ Error flipping next:', err)
  }
}

function prevPage() {
  if (!pageFlipInstance) {
    console.warn('⚠️ PageFlip instance not initialized')
    return
  }
  try {
    const currentIdx = pageFlipInstance.getCurrentPageIndex()
    console.log('📖 Prev clicked - Current index:', currentIdx, 'Can flip:', currentIdx > 0)
    if (currentIdx > 0) {
      // Reset zoom to normal before flipping
      currentZoom.value = 1
      pageFlipInstance.flipPrev()
    } else {
      console.log('⚠️ Already at first page')
    }
  } catch (err) {
    console.error('❌ Error flipping prev:', err)
  }
}

function zoomIn() {
  if (currentZoom.value < 2) {
    currentZoom.value = Math.min(currentZoom.value + 0.25, 2)
  }
}

function zoomOut() {
  if (currentZoom.value > 0.5) {
    currentZoom.value = Math.max(currentZoom.value - 0.25, 0.5)
  }
}

function setZoom(value) {
  currentZoom.value = Math.max(0.5, Math.min(2, value))
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'single' ? 'double' : 'single'
}

// Handle flip start to preload adjacent pages
function onFlipStart() {
  // Preload next 2 pages when flip animation starts
  if (pdfDocument && currentPage.value < numPages.value - 2) {
    const nextIdx = currentPage.value + 2
    if (pages.value[nextIdx] === '' && !renderQueue.has(nextIdx)) {
      renderPage(pdfDocument, nextIdx).catch((err) => console.warn('Preload error:', err))
    }
  }
}

function fullscreen() {
  const viewer = document.querySelector('.viewer-container')
  if (viewer) {
    if (viewer.requestFullscreen) {
      viewer.requestFullscreen()
    }
  }
}

function handleImageError(event) {
  event.target.style.display = 'none'
}

// Keyboard navigation for better user experience
function handleKeyPress(event) {
  // Ignore if user is typing in an input
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextPage()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prevPage()
  } else if (event.key === '=' || event.key === '+') {
    event.preventDefault()
    zoomIn()
  } else if (event.key === '-' || event.key === '_') {
    event.preventDefault()
    zoomOut()
  } else if (event.key === 'f' || event.key === 'F') {
    event.preventDefault()
    fullscreen()
  }
}
</script>

<template>
  <v-app>
    <ArchiveHeader />

    <v-main class="publication-viewer">
      <!-- Loading State -->
      <v-container
        v-if="loading"
        class="d-flex justify-center align-center"
        style="min-height: 80vh"
      >
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-container>

      <!-- Publication Viewer -->
      <div v-else-if="publication" class="viewer-outer">
        <!-- Top Bar (Separate from viewer) -->
        <div class="viewer-topbar">
          <v-btn icon variant="text" @click="goBack" class="back-btn">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <div class="publication-info">
            <h2 class="viewer-title">{{ publication.title }}</h2>
            <span class="viewer-subtitle">by {{ publication.writers }}</span>
          </div>
        </div>

        <div class="viewer-wrapper">
          <!-- Viewer Container (PDF/Flipbook Display) -->
          <div class="viewer-container">
            <!-- Keyboard Shortcuts Hint (Fixed to Container) -->
            <transition name="fade">
              <div v-if="showKeyboardHint" class="keyboard-hint">
                <v-icon class="mr-2">mdi-keyboard</v-icon>
                <span>Use arrow keys ← → to flip pages, +/- to zoom, F for fullscreen</span>
              </div>
            </transition>

            <!-- Previous Page Button -->
            <v-btn
              v-if="pages.length > 0"
              class="flipbook-nav-btn flipbook-nav-prev"
              icon
              size="large"
              variant="text"
              @click.stop="prevPage"
              :disabled="currentPage <= 1"
              aria-label="Previous page"
            >
              <v-icon size="40">mdi-chevron-left</v-icon>
            </v-btn>

            <!-- Loading State -->
            <div v-if="pdfLoading" class="flipbook-loading">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4">Loading publication...</p>
              <p class="text-caption text-grey mt-2">Please wait, preparing pages...</p>
            </div>

            <!-- Page Flip Book -->
            <div
              v-else-if="pages.length > 1 && pages.some((p) => p !== null && p !== undefined)"
              class="zoom-wrapper"
            >
              <div
                class="page-flip-container"
                :style="{
                  transform: `scale(${currentZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease-out',
                  minWidth: `${900 * currentZoom}px`,
                  minHeight: `${600 * currentZoom}px`,
                }"
              >
                <div ref="pageFlipContainer" class="page-flip-book"></div>
              </div>
            </div>

            <!-- Debug Info -->
            <div v-else-if="!pdfLoading" class="pdf-placeholder">
              <v-icon size="80" color="grey-lighten-1">mdi-file-pdf-box</v-icon>
              <p class="mt-4 text-grey">No PDF loaded</p>
            </div>

            <!-- Next Page Button -->
            <v-btn
              v-if="pages.length > 0"
              class="flipbook-nav-btn flipbook-nav-next"
              icon
              size="large"
              variant="text"
              @click.stop="nextPage"
              :disabled="currentPage >= totalPages"
              aria-label="Next page"
            >
              <v-icon size="40">mdi-chevron-right</v-icon>
            </v-btn>
          </div>

          <!-- Bottom Control Bar (Like Issuu) -->
          <div class="viewer-controls">
            <div class="controls-left">
              <!-- Page Counter -->
              <span class="page-counter">{{ currentPage }} / {{ totalPages }}</span>
            </div>

            <div class="controls-center">
              <!-- Zoom Controls (Issuu style) -->
              <v-btn icon size="small" variant="text" @click="zoomOut">
                <v-icon size="18">mdi-minus</v-icon>
              </v-btn>
              <input
                type="range"
                min="50"
                max="200"
                :value="currentZoom * 100"
                @input="setZoom($event.target.value / 100)"
                class="zoom-slider"
              />
              <v-btn icon size="small" variant="text" @click="zoomIn">
                <v-icon size="18">mdi-plus</v-icon>
              </v-btn>

              <v-divider vertical class="mx-2"></v-divider>

              <!-- View Mode Toggle -->
              <v-btn
                icon
                size="small"
                variant="text"
                @click="toggleViewMode"
                :title="viewMode === 'single' ? 'Double Page View' : 'Single Page View'"
              >
                <v-icon>{{
                  viewMode === 'single' ? 'mdi-book-open-page-variant' : 'mdi-book'
                }}</v-icon>
              </v-btn>

              <!-- Fullscreen -->
              <v-btn icon size="small" variant="text" @click="fullscreen">
                <v-icon>mdi-fullscreen</v-icon>
              </v-btn>
            </div>

            <div class="controls-right">
              <!-- Download Button -->
              <v-btn
                v-if="
                  publication.mediaUploaded &&
                  publication.mediaUploaded.toLowerCase().endsWith('.pdf')
                "
                :href="publication.mediaUploaded"
                target="_blank"
                color="primary"
                size="small"
                prepend-icon="mdi-download"
              >
                Download
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Bottom Info Panel (Separate Container) -->
        <div v-if="publication" class="info-panel">
          <v-container class="info-container">
            <v-row align="center" class="info-row">
              <v-col cols="12" md="7" class="publication-details">
                <h2 class="publication-title">{{ publication.title }}</h2>
                <div class="publication-meta">
                  <div class="meta-item">
                    <v-icon size="20" color="#f5c52b">mdi-calendar</v-icon>
                    <span>
                      {{
                        new Date(publication.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      }}
                    </span>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="5" class="publisher-section">
                <div class="publisher-card">
                  <h4 class="publisher-label">Publisher</h4>
                  <p class="publisher-name">{{ publication.writers }}</p>
                  <p class="publisher-org">The Gold Panicles</p>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </div>

        <!-- Contact Footer -->
        <v-sheet class="contact-info" color="white" width="100%">
          <v-divider class="mx-5 mt-6" thickness="2" color="black"></v-divider>

          <v-container class="px-12">
            <!-- Contact Us Header -->
            <v-row justify="center">
              <v-col cols="12" class="text-center">
                <v-card-title class="text-h5">Contact Us!</v-card-title>
              </v-col>
            </v-row>

            <!-- Content Row -->
            <v-row justify="center" align="start" no-gutters>
              <v-col cols="12" sm="4" class="d-flex flex-column align-center">
                <div class="address-block">
                  <a
                    href="https://www.carsu.edu.ph/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="csu-logo-link"
                  >
                    <v-img src="/images/csu-logo.png" alt="CSU Logo" class="csu-logo mb-4" />
                  </a>
                  <v-card-text class="px-0 font-weight-bold"
                    >Caraga State University - Main Campus, 8600</v-card-text
                  >
                </div>
              </v-col>

              <v-col cols="12" sm="4" class="d-flex flex-column align-center">
                <v-list class="social-links">
                  <v-list-item
                    href="mailto:thegoldpanicles@carsu.edu.ph"
                    target="_blank"
                    rel="noopener"
                    class="justify-center px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon class="brand-icon gmail-icon">mdi-gmail</v-icon>
                    </template>
                    <span>thegoldpanicles@carsu.edu.ph</span>
                  </v-list-item>

                  <v-list-item
                    href="https://facebook.com/thegoldpanicles"
                    target="_blank"
                    rel="noopener"
                    class="justify-center px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon class="brand-icon facebook-icon">mdi-facebook</v-icon>
                    </template>
                    <span>facebook.com/thegoldpanicles</span>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" sm="4" class="d-flex flex-column align-center">
                <v-list class="social-links">
                  <v-list-item
                    href="https://instagram.com/thegoldpanicles"
                    target="_blank"
                    rel="noopener"
                    class="justify-center px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon class="brand-icon instagram-icon">mdi-instagram</v-icon>
                    </template>
                    <span>@thegoldpanicles</span>
                  </v-list-item>

                  <v-list-item
                    href="https://x.com/tgpCSU"
                    target="_blank"
                    rel="noopener"
                    class="justify-center px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon class="brand-icon twitter-icon">mdi-twitter</v-icon>
                    </template>
                    <span>x.com/tgpCSU</span>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>
          </v-container>
        </v-sheet>
      </div>

      <!-- Not Found -->
      <v-container v-else class="text-center" style="min-height: 60vh">
        <v-icon size="120" color="grey-lighten-2" class="mb-4">mdi-file-question</v-icon>
        <h2>Publication Not Found</h2>
        <v-btn color="primary" class="mt-4" @click="goBack"> Return to Publications </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.publication-viewer {
  background: #ffffff;
  min-height: 100vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.viewer-outer {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.viewer-wrapper {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #d0d0d0;
  zoom: 1;
  transform: scale(1);
  transform-origin: center center;
}

/* Top Bar (Separate from viewer) */
.viewer-topbar {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
}

.back-btn {
  color: #1a1a1a !important;
}

.publication-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.viewer-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.viewer-subtitle {
  font-size: 14px;
  color: #666666;
  margin-top: 2px;
}

/* Main Viewer Container */
.viewer-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  height: 680px;
  overflow: auto;
  background: #333333;
  gap: 20px;
  position: relative;
  /* Prevent layout shift */
  min-height: 680px;
  /* Maintain center alignment regardless of browser zoom */
  place-items: center;
  place-content: center;
  /* Prevent browser zoom effects */
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  -ms-text-size-adjust: none;
  text-size-adjust: none;
}

.viewer-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.viewer-container::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.viewer-container::-webkit-scrollbar-thumb {
  background: #555555;
  border-radius: 4px;
}

.viewer-container::-webkit-scrollbar-thumb:hover {
  background: #666666;
}

/* Flipbook Navigation Buttons */
.flipbook-nav-btn {
  position: absolute !important;
  top: 50%;
  transform: translateY(-50%);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #e0e0e0 !important;
  color: #1a1a1a !important;
  transition: all 0.3s ease !important;
  z-index: 100 !important;
  pointer-events: auto !important;
}

.flipbook-nav-prev {
  left: 20px;
}

.flipbook-nav-next {
  right: 20px;
}

.flipbook-nav-btn:hover:not(:disabled) {
  background: #ffffff !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(-50%) scale(1.1);
}

.flipbook-nav-btn:disabled {
  opacity: 0.3 !important;
  cursor: not-allowed;
}

/* Zoom Wrapper for proper scrolling */
.zoom-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

/* Page Flip Styles */
.page-flip-container {
  width: 100%;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333333;
  position: relative;
  overflow: visible;
  opacity: 1;
  transition: transform 0.3s ease-out;
  place-items: center;
  place-content: center;
  margin: auto;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
  pointer-events: none;
}

.page-flip-book {
  width: 900px;
  height: 600px;
  margin: 0 auto;
  pointer-events: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: default;
}

:deep(.stf__wrapper) {
  box-shadow: none !important;
  margin: 0 auto !important;
  gap: 0 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  width: 100% !important;
}

:deep(.stf__parent) {
  position: relative !important;
  background: transparent !important;
  margin: 0 auto !important;
  display: flex !important;
  gap: 0 !important;
  justify-content: center !important;
  align-items: center !important;
}

:deep(.stf__block) {
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
  display: flex !important;
  justify-content: center !important;
}

:deep(.stf__item) {
  margin: 0 !important;
  padding: 0 !important;
  cursor: default !important;
}

:deep(.stf__page) {
  cursor: default !important;
}

:deep(.stf__outerShadow) {
  display: none !important;
}

:deep(.stf__hardShadow) {
  display: none !important;
}

:deep(.stf__hardInnerShadow) {
  display: none !important;
}

:deep(.stf__left) {
  margin-right: 0 !important;
  padding-right: 0 !important;
}

:deep(.stf__right) {
  margin-left: 0 !important;
  padding-left: 0 !important;
}

:deep(.page-content) {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: none !important;
  border: 1px solid #e0e0e0;
  margin: 0 !important;
  padding: 0 !important;
  cursor: default !important;
}

:deep(.page-content img) {
  cursor: default !important;
  user-select: none;
  -webkit-user-drag: none;
}

.flipbook-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
  /* Ensure loading state is visible immediately */
  animation: fadeIn 0.2s ease-in;
  background: transparent;
  width: 100%;
  border-radius: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.pdf-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: transparent;
  border-radius: 0;
  padding: 40px;
}

/* Bottom Control Bar */
.viewer-controls {
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.controls-left,
.controls-center,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.controls-center {
  flex: 1;
  justify-content: center;
}

.zoom-slider {
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.zoom-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}

.page-counter {
  color: white;
  font-size: 14px;
  font-weight: 500;
  min-width: 90px;
  text-align: center;
}

.viewer-controls :deep(.v-btn) {
  color: white !important;
  opacity: 0.9;
}

.viewer-controls :deep(.v-btn:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1) !important;
}

.viewer-controls :deep(.v-btn:disabled) {
  opacity: 0.3;
}

/* Info Panel Below */
.info-panel {
  width: 100%;
  max-width: 1400px;
  margin: 32px auto 0;
  background: #ffffff;
  color: #1a1a1a;
  padding: 32px 40px;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.info-container {
  max-width: 100% !important;
  padding: 0 !important;
}

.info-row {
  margin: 0 !important;
}

.publication-details {
  padding: 0 !important;
}

.publication-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  line-height: 1.3;
}

.publication-meta {
  display: flex;
  align-items: center;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666666;
  font-size: 15px;
  font-weight: 500;
}

.publisher-section {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 !important;
}

.publisher-card {
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  padding: 24px 28px;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  text-align: right;
  min-width: 280px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.publisher-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999999;
  margin-bottom: 8px;
}

.publisher-name {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.4;
}

.publisher-org {
  font-size: 14px;
  color: #666666;
  margin: 4px 0 0 0;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 960px) {
  .publication-viewer {
    padding: 24px 16px;
  }

  .viewer-topbar {
    padding: 12px 20px;
  }

  .viewer-container {
    padding: 32px 24px;
    min-height: 450px;
    gap: 12px;
  }

  .flipbook-nav-btn {
    width: 40px !important;
    height: 40px !important;
  }

  .flipbook-nav-btn :deep(.v-icon) {
    font-size: 32px !important;
  }

  .page-flip-container {
    width: 95vw;
    height: 500px;
  }

  .page-flip-book {
    width: 800px;
    height: 500px;
  }

  .viewer-controls {
    flex-wrap: wrap;
    justify-content: center;
    padding: 12px 16px;
  }

  .controls-left,
  .controls-right {
    order: 2;
  }

  .controls-center {
    order: 1;
    width: 100%;
    justify-content: center;
    margin-bottom: 12px;
  }

  .info-panel {
    padding: 24px 20px;
    margin: 24px auto 0;
  }

  .publication-title {
    font-size: 22px;
  }

  .publisher-section {
    justify-content: flex-start;
    margin-top: 20px;
  }

  .publisher-card {
    min-width: 100%;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .publication-viewer {
    padding: 16px 12px;
  }

  .viewer-topbar {
    padding: 10px 16px;
  }

  .viewer-title {
    font-size: 16px;
  }

  .viewer-subtitle {
    font-size: 13px;
  }

  .viewer-container {
    padding: 24px 16px;
    min-height: 400px;
    gap: 8px;
  }

  .flipbook-nav-btn {
    width: 36px !important;
    height: 36px !important;
  }

  .flipbook-nav-btn :deep(.v-icon) {
    font-size: 28px !important;
  }

  .page-flip-container {
    width: 100vw;
    height: 400px;
    margin: 0 -16px;
  }

  .page-flip-book {
    width: 600px;
    height: 400px;
  }

  .info-panel {
    padding: 20px 16px;
    margin: 20px auto 0;
  }

  .publication-title {
    font-size: 20px;
  }

  .publication-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .publisher-card {
    padding: 20px;
  }

  .publisher-info {
    padding: 24px;
  }
}

/* Contact Footer Styles */
.contact-info {
  margin-top: 40px;
}

.csu-logo {
  width: 120px;
  height: auto;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.csu-logo-link {
  display: block;
  cursor: pointer;
}

.csu-logo-link:hover .csu-logo {
  transform: scale(1.05);
}

.address-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.contact-info :deep(.text-h5) {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2f2f2f;
}

.contact-info :deep(.v-container) {
  max-width: 1400px !important;
}

.social-links {
  padding: 0;
}

.social-links :deep(.v-list-item) {
  padding-inline-start: 0;
  padding-inline-end: 0;
}

.social-links :deep(.v-list-item-content) {
  justify-content: center;
}

/* Colored brand icons */
.brand-icon {
  font-size: 22px !important;
  transition: all 0.2s ease;
}

.brand-icon.facebook-icon {
  color: #1877f2 !important;
}

.brand-icon.instagram-icon {
  color: #e4405f !important;
}

.brand-icon.twitter-icon {
  color: #000000 !important;
}

.brand-icon.gmail-icon {
  color: #ea4335 !important;
}

.brand-icon:hover {
  transform: scale(1.15);
}

/* Keyboard Hint Overlay */
.keyboard-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.keyboard-hint :deep(.v-icon) {
  color: #f5c52b;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
