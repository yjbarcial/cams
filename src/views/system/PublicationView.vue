<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import { supabase } from '@/utils/supabase'
import Flipbook from 'flipbook-vue'
import * as pdfjsLib from 'pdfjs-dist'

const route = useRoute()
const router = useRouter()

const publication = ref(null)
const loading = ref(true)
const currentPage = ref(0)
const zoomLevel = ref(1)
const viewMode = ref('single') // 'single' or 'double'
const pages = ref([])
const numPages = ref(null)
const pdfLoading = ref(false)
const flipbookRef = ref(null)

const totalPages = computed(() => {
  return numPages.value || 1
})

// Watch currentPage changes
watch(currentPage, (newVal, oldVal) => {
  console.log('📖 Page changed from', oldVal, 'to', newVal)
})

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// Load PDF and convert pages to images
async function loadPDF(pdfUrl) {
  try {
    console.log('🔄 Loading PDF:', pdfUrl)
    pdfLoading.value = true
    pages.value = [] // Clear previous pages

    const loadingTask = pdfjsLib.getDocument(pdfUrl)
    const pdf = await loadingTask.promise
    numPages.value = pdf.numPages
    console.log('✅ PDF loaded successfully. Total pages:', numPages.value)

    const pagePromises = []
    for (let i = 1; i <= pdf.numPages; i++) {
      pagePromises.push(renderPage(pdf, i))
    }

    const renderedPages = await Promise.all(pagePromises)
    pages.value = renderedPages
    console.log('✅ All pages rendered:', pages.value.length)
    console.log('First page preview:', pages.value[0]?.substring(0, 50))
  } catch (error) {
    console.error('❌ Error loading PDF:', error)
    alert('Failed to load PDF: ' + error.message)
  } finally {
    pdfLoading.value = false
    console.log('PDF loading finished. Pages array:', pages.value.length)
  }
}

// Render a single PDF page to canvas and return as data URL
async function renderPage(pdf, pageNum) {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale: 2 })

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise

  return canvas.toDataURL()
}

onMounted(async () => {
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

function goBack() {
  router.push({ name: 'archive' })
}

function nextPage() {
  if (flipbookRef.value) {
    flipbookRef.value.flipRight()
  }
}

function prevPage() {
  if (flipbookRef.value) {
    flipbookRef.value.flipLeft()
  }
}

function zoomIn() {
  if (flipbookRef.value && flipbookRef.value.zoomIn) {
    flipbookRef.value.zoomIn()
  }
}

function zoomOut() {
  if (flipbookRef.value && flipbookRef.value.zoomOut) {
    flipbookRef.value.zoomOut()
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'single' ? 'double' : 'single'
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
        <div class="viewer-wrapper">
          <!-- Top Bar -->
          <div class="viewer-topbar">
            <v-btn icon variant="text" @click="goBack" class="back-btn">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <div class="publication-info">
              <h2 class="viewer-title">{{ publication.title }}</h2>
              <span class="viewer-subtitle">by {{ publication.writers }}</span>
            </div>
          </div>

          <!-- Viewer Container (PDF/Flipbook Display) -->
          <div class="viewer-container">
            <!-- Previous Page Button (Left) -->
            <v-btn
              v-if="pages.length > 0"
              class="flipbook-nav-btn flipbook-nav-prev"
              icon
              size="large"
              variant="text"
              @click="prevPage"
              :disabled="currentPage <= 0"
            >
              <v-icon size="40">mdi-chevron-left</v-icon>
            </v-btn>

            <div class="viewer-content">
              <!-- Loading State -->
              <div v-if="pdfLoading" class="flipbook-loading">
                <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
                <p class="mt-4">Loading flipbook...</p>
              </div>

              <!-- Flipbook Component -->
              <div v-else-if="pages.length > 0" class="flipbook-wrapper">
                <Flipbook
                  ref="flipbookRef"
                  class="flipbook"
                  :pages="pages"
                  v-model="currentPage"
                  :startPage="0"
                  :zooms="[1]"
                  :clickToZoom="false"
                  :singlePage="false"
                  :flipDuration="500"
                  :perspective="1200"
                  :nPolygons="5"
                  :ambient="0.3"
                  :gloss="0.3"
                  :swipeMin="3"
                  :dragToFlip="true"
                />
              </div>

              <!-- Debug Info -->
              <div v-else-if="!pdfLoading" class="pdf-placeholder">
                <v-icon size="80" color="grey-lighten-1">mdi-file-pdf-box</v-icon>
                <p class="mt-4 text-grey">No PDF loaded</p>
                <p class="text-caption">Pages loaded: {{ pages.length }}</p>
                <p class="text-caption">PDF Loading: {{ pdfLoading }}</p>
              </div>
            </div>

            <!-- Next Page Button (Right) -->
            <v-btn
              v-if="pages.length > 0"
              class="flipbook-nav-btn flipbook-nav-next"
              icon
              size="large"
              variant="text"
              @click="nextPage"
              :disabled="currentPage >= totalPages - 1"
            >
              <v-icon size="40">mdi-chevron-right</v-icon>
            </v-btn>
          </div>

          <!-- Bottom Control Bar (Like Issuu) -->
          <div class="viewer-controls">
            <div class="controls-left">
              <!-- Page Counter -->
              <span class="page-counter">{{ currentPage + 1 }} / {{ totalPages }}</span>
            </div>

            <div class="controls-center">
              <!-- Zoom Controls -->
              <v-btn icon size="small" variant="text" @click="zoomOut">
                <v-icon>mdi-minus</v-icon>
              </v-btn>
              <span class="zoom-level">Zoom</span>
              <v-btn icon size="small" variant="text" @click="zoomIn">
                <v-icon>mdi-plus</v-icon>
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
          <v-container>
            <v-row>
              <v-col cols="12" md="8">
                <h3 class="info-title">About this publication</h3>
                <div class="info-meta">
                  <div class="meta-row">
                    <v-icon size="18">mdi-calendar</v-icon>
                    <span>
                      Published:
                      {{
                        new Date(publication.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      }}
                    </span>
                  </div>
                  <div class="meta-row">
                    <v-icon size="18">mdi-tag</v-icon>
                    <span>{{ publication.category }}</span>
                  </div>
                  <div v-if="publication.volumeIssue" class="meta-row">
                    <v-icon size="18">mdi-book-open-variant</v-icon>
                    <span>{{ publication.volumeIssue }}</span>
                  </div>
                </div>

                <div v-if="publication.tags && publication.tags.length" class="info-tags">
                  <v-chip v-for="tag in publication.tags" :key="tag" size="small" class="mr-2 mb-2">
                    {{ tag }}
                  </v-chip>
                </div>
              </v-col>

              <v-col cols="12" md="4">
                <div class="publisher-info">
                  <h4>Publisher</h4>
                  <p>{{ publication.writers }}</p>
                  <p class="text-caption">The Gold Panicles</p>
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
}

/* Top Bar */
.viewer-topbar {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #e0e0e0;
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
  height: 700px;
  overflow: hidden;
  background: #fafafa;
  gap: 20px;
  position: relative;
}

/* Flipbook Navigation Buttons */
.flipbook-nav-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #e0e0e0 !important;
  color: #1a1a1a !important;
  transition: all 0.3s ease !important;
  z-index: 10;
}

.flipbook-nav-btn:hover:not(:disabled) {
  background: #ffffff !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
  transform: scale(1.1);
}

.flipbook-nav-btn:disabled {
  opacity: 0.3 !important;
}

.viewer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  overflow: hidden;
}

/* Flipbook Styles */
.flipbook-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.flipbook {
  width: 100% !important;
  max-width: 1400px !important;
  height: 600px !important;
  margin: 0 auto !important;
}

:deep(.flipbook .viewport) {
  width: 100% !important;
  height: 600px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: visible !important;
}

:deep(.flipbook .bounding-box) {
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.3);
}

:deep(.flipbook .page) {
  background: #ffffff;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.flipbook-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  overflow: hidden;
}

.flipbook-page img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.flipbook-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
}

.pdf-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 40px;
}

/* Bottom Control Bar */
.viewer-controls {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid #e0e0e0;
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

.page-counter,
.zoom-level {
  color: #333333;
  font-size: 14px;
  font-weight: 500;
  min-width: 90px;
  text-align: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.viewer-controls :deep(.v-btn) {
  color: #1a1a1a !important;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

.viewer-controls :deep(.v-btn:hover) {
  background: #eeeeee;
  border-color: #d0d0d0;
}

.viewer-controls :deep(.v-btn:disabled) {
  opacity: 0.4;
}

/* Info Panel Below */
.info-panel {
  width: 100%;
  max-width: 1400px;
  margin: 40px auto 0;
  background: #ffffff;
  color: #1a1a1a;
  padding: 48px;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid #d0d0d0;
}

.info-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24px;
}

.info-meta {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #555555;
  font-size: 15px;
  padding: 12px 0;
}

.meta-row :deep(.v-icon) {
  color: #f5c52b;
}

.info-tags {
  margin-top: 20px;
}

.info-tags :deep(.v-chip) {
  background: #ffffff !important;
  border: 1px solid #e0e0e0;
  color: #555555 !important;
}

.publisher-info {
  background: #ffffff;
  padding: 28px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.publisher-info h4 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a1a1a;
}

.publisher-info p {
  color: #555555;
  margin: 6px 0;
  font-size: 15px;
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

  .viewer-content {
    max-width: 100%;
  }

  .flipbook {
    width: 95vw;
  }

  :deep(.flipbook .viewport) {
    height: 500px !important;
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

  .viewer-content {
    width: 100%;
  }

  .flipbook {
    width: 100vw;
    margin: 0 -16px;
  }

  :deep(.flipbook .viewport) {
    height: 400px !important;
  }

  .info-panel {
    padding: 32px;
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
</style>
