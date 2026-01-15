<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import { supabase } from '@/utils/supabase.js'
import FlipBookViewer from '@/components/FlipBookViewer.vue'

// router is already initialized above

const searchQuery = ref('')
const activeCategory = ref('All')

const categories = ['All', 'Folio', 'Magazine', 'Newsletter']

const articles = ref([])

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return articles.value.filter((a) => {
    const matchesCategory = activeCategory.value === 'All' || a.category === activeCategory.value
    const matchesQuery = !query || a.title.toLowerCase().includes(query)
    return matchesCategory && matchesQuery
  })
})

// Viewer state: show content like Facebook posts
const viewerVisible = ref(false)
const viewerPages = ref([])
const viewerTitle = ref('')
const viewerCategory = ref('Magazine')
const viewerContent = ref('')
const viewerMedia = ref('')
const viewerAuthor = ref('')
const viewerDate = ref('')

function openDeliverable(item, event) {
  // Prevent navigation to route that may trigger auth checks. Open in-page viewer instead.
  event && event.preventDefault && event.preventDefault()
  viewerTitle.value = item.title
  viewerCategory.value = item.category || 'Magazine'
  viewerContent.value = item.content || ''
  viewerMedia.value = item.cover || item.mediaUploaded || ''
  viewerAuthor.value = item.writers || item.artists || 'The Gold Panicles'
  viewerDate.value = item.publishedAt || new Date().toISOString()

  // If article has explicit pages, use them; otherwise generate simple pages from cover
  if (Array.isArray(item.pages) && item.pages.length) {
    viewerPages.value = item.pages
  } else if (typeof item.pages === 'string' && item.pages.toLowerCase().endsWith('.pdf')) {
    viewerPages.value = item.pages // FlipBookViewer will detect PDF string
  } else {
    viewerPages.value = [item.cover, item.cover]
  }
  viewerVisible.value = true
}

function closeViewer() {
  viewerVisible.value = false
  viewerPages.value = []
  viewerTitle.value = ''
  viewerContent.value = ''
  viewerMedia.value = ''
  viewerAuthor.value = ''
  viewerDate.value = ''
  viewerCategory.value = 'Magazine'
}

// Extract first image from HTML content
const extractFirstImage = (htmlContent) => {
  if (!htmlContent) return null
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const img = doc.querySelector('img')
  return img ? img.src : null
}

// Prevent back navigation to dashboard
const preventBackToDashboard = () => {
  // Add a new history entry to prevent going back
  window.history.pushState(null, '', window.location.href)
}

// Handle browser back button
const handlePopState = (event) => {
  // Push the current state again to prevent going back
  window.history.pushState(null, '', window.location.href)

  // Optional: Show a message or do nothing
  console.log('Back navigation prevented. Please use the navigation menu to exit.')
}

onMounted(() => {
  // Prevent back navigation when component mounts
  preventBackToDashboard()

  // Listen for back button attempts
  window.addEventListener('popstate', handlePopState)

  // Replace the current history entry to remove previous page from history
  window.history.replaceState(null, '', window.location.href)

  // Fetch ONLY published projects from localStorage
  const loadPublishedProjects = () => {
    const projectTypes = [
      'magazine_projects',
      'newsletter_projects',
      'folio_projects',
      'other_projects',
      'social-media_projects',
    ]
    const publishedProjects = []

    projectTypes.forEach((storageKey) => {
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const published = projects.filter((p) => p.status === 'Published')

      published.forEach((p) => {
        const firstImage = extractFirstImage(p.content)
        publishedProjects.push({
          id: p.id,
          title: p.title || 'Untitled',
          category: p.type
            ? String(p.type).charAt(0).toUpperCase() + String(p.type).slice(1)
            : 'Magazine',
          cover: p.mediaUploaded || firstImage || '/images/lib-hd.jpg',
          publishedAt: p.lastModified || p.createdAtISO || new Date().toISOString(),
          content: p.content || '',
          mediaUploaded: p.mediaUploaded || firstImage || '',
          writers: p.writers || '',
          artists: p.artists || '',
          pages:
            p.mediaUploaded && p.mediaUploaded.toLowerCase().endsWith('.pdf')
              ? p.mediaUploaded
              : null,
        })
      })
    })

    // Sort by most recent first (by publishedAt date)
    publishedProjects.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateB - dateA // Most recent first
    })

    // Replace articles with published projects
    articles.value = publishedProjects
  }

  // Load published projects
  loadPublishedProjects()

  // Also fetch from Supabase for backup
  ;(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'Published')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching publications from Supabase', error)
        return
      }

      if (data && data.length) {
        const mapped = data.map((p) => {
          const firstImage = extractFirstImage(p.content)
          return {
            id: p.id,
            title: p.title || 'Untitled',
            category: p.project_type
              ? String(p.project_type).charAt(0).toUpperCase() + String(p.project_type).slice(1)
              : 'Magazine',
            cover: p.media_uploaded || firstImage || '/images/lib-hd.jpg',
            publishedAt: p.created_at || p.due_date || new Date().toISOString(),
            content: p.content || '',
            mediaUploaded: p.media_uploaded || firstImage || '',
            writers: p.writers || '',
            artists: p.artists || '',
            pages:
              p.media_uploaded && p.media_uploaded.toLowerCase().endsWith('.pdf')
                ? p.media_uploaded
                : null,
          }
        })

        // Merge, avoiding duplicates by id
        mapped.forEach((m) => {
          const exists = articles.value.find(
            (a) => String(a.id) === String(m.id) || a.title === m.title,
          )
          if (!exists) articles.value.unshift(m)
        })

        // Sort the final merged array by most recent first
        articles.value.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
          return dateB - dateA // Most recent first
        })
      }
    } catch (err) {
      console.error('Error loading publications:', err)
    }
  })()
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('popstate', handlePopState)
})

function setCategory(cat) {
  activeCategory.value = cat
}

function scrollToPublications() {
  const el = document.getElementById('publications-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <v-app>
    <ArchiveHeader />

    <v-main class="hero">
      <v-row justify="center" no-gutters>
        <v-col cols="12" class="text-center">
          <v-img
            src="/images/GoldQuill Logo.png"
            alt="GoldQuill"
            class="logo"
            width="160"
            contain
          />
          <v-card-title class="welcome font-weight-bold"
            >Welcome to <span class="brand">GoldQuill</span>!</v-card-title
          >
          <v-card-text class="subtitle"
            >Discover the latest publications from The Gold Panicles.</v-card-text
          >
          <v-row
            justify="center"
            no-gutters
            class="scroll-indicator"
            @click="scrollToPublications"
            @keyup.enter="scrollToPublications"
            @keyup.space="scrollToPublications"
            role="button"
            tabindex="0"
          >
            <v-col cols="auto">
              <v-icon>mdi-chevron-down</v-icon>
              <v-icon>mdi-chevron-down</v-icon>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-main>

    <v-main id="publications-section" class="publications">
      <v-row no-gutters>
        <v-col cols="12">
          <v-card-title class="font-weight-bold">Publications</v-card-title>

          <v-row class="archive-controls" no-gutters>
            <v-col cols="12" md="4" class="archive-search-group">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search articles..."
                hide-details
                variant="outlined"
                density="comfortable"
                class="archive-search"
                rounded
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="8" class="archive-categories">
              <v-btn
                v-for="cat in categories"
                :key="cat"
                :class="['archive-chip', { active: activeCategory === cat }]"
                @click="setCategory(cat)"
                variant="outlined"
                size="small"
                rounded
              >
                {{ cat }}
              </v-btn>
            </v-col>
          </v-row>

          <v-row class="grid" no-gutters>
            <v-col
              v-for="a in filteredArticles"
              :key="a.id"
              cols="6"
              sm="4"
              md="3"
              lg="2"
              xl="2"
              class="grid-item"
            >
              <div
                role="link"
                tabindex="0"
                class="card-link"
                @click.prevent="openDeliverable(a, $event)"
                @keyup.enter="openDeliverable(a, $event)"
                :aria-label="`View details for ${a.title}`"
                style="text-decoration: none; display: block"
              >
                <v-card class="card" hover>
                  <v-img
                    :src="a.cover || a.mediaUploaded || '/images/lib-hd.jpg'"
                    :alt="`${a.title} cover`"
                    class="cover"
                    aspect-ratio="1.2"
                    cover
                  >
                    <template v-slot:error>
                      <div class="cover-placeholder">
                        <v-icon size="64" color="grey-lighten-2">mdi-image-outline</v-icon>
                      </div>
                    </template>
                  </v-img>
                  <v-card-text class="meta">
                    <v-chip
                      :class="['category', a.category.toLowerCase()]"
                      size="x-small"
                      variant="flat"
                      >{{ a.category }}</v-chip
                    >
                    <v-card-title>
                      <span class="article-title">{{ a.title }}</span>
                    </v-card-title>
                    <v-card-text class="date">
                      <time :datetime="a.publishedAt">
                        {{ new Date(a.publishedAt).toLocaleDateString() }}
                      </time>
                    </v-card-text>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-main>

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

    <!-- Content Viewer Dialog (Facebook-style post viewer) -->
    <v-dialog v-model="viewerVisible" max-width="900px" scrollable>
      <v-card class="content-viewer">
        <v-card-title class="viewer-header">
          <div class="header-content">
            <v-chip
              :color="
                viewerCategory === 'Magazine'
                  ? '#f5c52b'
                  : viewerCategory === 'Folio'
                    ? '#39acff'
                    : '#353535'
              "
              class="category-chip"
            >
              {{ viewerCategory }}
            </v-chip>
            <v-spacer></v-spacer>
            <v-btn icon @click="closeViewer" variant="text">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="viewer-body">
          <!-- Post Header -->
          <div class="post-header">
            <div class="post-author">
              <v-avatar color="primary" size="48">
                <v-icon color="white">mdi-account</v-icon>
              </v-avatar>
              <div class="author-info">
                <div class="author-name">{{ viewerAuthor }}</div>
                <div class="post-date">
                  {{
                    new Date(viewerDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Post Title -->
          <h2 class="post-title">{{ viewerTitle }}</h2>

          <!-- Post Media -->
          <div v-if="viewerMedia" class="post-media">
            <v-img :src="viewerMedia" :alt="viewerTitle" cover class="media-image"></v-img>
          </div>

          <!-- Post Content -->
          <div class="post-content" v-html="viewerContent"></div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
/* Content Viewer Styles */
.content-viewer {
  border-radius: 12px !important;
  overflow: hidden;
}

.viewer-header {
  padding: 16px 20px !important;
  background: #f8f9fa;
}

.header-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.category-chip {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.viewer-body {
  padding: 0 !important;
  background: white;
}

.post-header {
  padding: 20px 24px 16px;
  background: white;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
}

.post-date {
  font-size: 13px;
  color: #6b7280;
}

.post-title {
  padding: 0 24px 16px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
  margin: 0;
}

.post-media {
  width: 100%;
  max-height: 500px;
  overflow: hidden;
  background: #f3f4f6;
}

.media-image {
  width: 100%;
  object-fit: contain;
}

.post-content {
  padding: 24px;
  font-size: 15px;
  line-height: 1.7;
  color: #374151;
}

.post-content :deep(p) {
  margin-bottom: 16px;
}

.post-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.post-content :deep(h1),
.post-content :deep(h2),
.post-content :deep(h3) {
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 12px;
  color: #1f2937;
}

.post-content :deep(ul),
.post-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.post-content :deep(blockquote) {
  border-left: 4px solid #f5c52b;
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
  color: #6b7280;
}

.hero {
  padding: 32px 12px 20px !important;
  text-align: center;
}

.welcome {
  margin: 0 0 8px 0 !important;
  font-size: 28px !important;
  padding: 0 !important;
}

.brand {
  color: #f5c52b;
}

.subtitle {
  margin: 0 !important;
  color: #555 !important;
  padding: 0 !important;
}

.scroll-indicator {
  margin: 12px auto 0 !important;
  width: max-content !important;
  color: #333;
  cursor: pointer;
}

.scroll-indicator .v-col {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  padding: 0 !important;
}

.scroll-indicator .mdi {
  display: block;
  font-size: 28px;
  animation: bob 1.4s ease-in-out infinite;
}

.scroll-indicator .mdi.delay {
  animation-delay: 0.2s;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.8;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
}

.publications {
  padding: 40px 16px 50px !important;
  max-width: 100%;
}

.publications .v-card-title {
  margin: 0 0 32px 0 !important;
  font-size: 32px !important;
  padding: 0 12px !important;
  color: #2c3e50;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.archive-controls {
  display: flex !important;
  align-items: center !important;
  gap: 20px !important;
  flex-wrap: nowrap !important;
  margin-bottom: 40px !important;
  padding: 0 4px !important;
}

.archive-search-group {
  position: relative;
  padding: 0 !important;
  flex-shrink: 0;
}

.archive-categories {
  display: inline-flex !important;
  gap: 12px !important;
  padding: 0 !important;
  justify-content: flex-start !important;
  flex-wrap: wrap;
  align-items: center;
}

.grid {
  padding: 0 4px !important;
}

.grid-item {
  padding: 8px !important;
}

.card {
  border: none !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: #fff !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  height: 100% !important;
  transition: all 0.3s ease !important;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12) !important;
}

.cover {
  width: 100%;
  aspect-ratio: 3 / 2;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.meta {
  padding: 10px 12px 12px !important;
  flex-grow: 1 !important;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
  margin-bottom: 0 !important;
  border-radius: 16px !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  line-height: 1;
}

.category.magazine {
  background-color: #f5c52b !important;
  color: #2c3e50 !important;
}

.category.folio {
  background-color: #39acff !important;
  color: white !important;
}

.category.newsletter {
  background-color: #353535 !important;
  color: #fff !important;
}

.article-title {
  margin: 0;
  font-size: 15px !important;
  line-height: 1.3 !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #2c3e50;
  font-weight: 600;
}

/* Flip overlay styles */
.flip-overlay {
  pointer-events: none;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  overflow: hidden;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}
.flip-inner {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  transform-origin: center center;
  transition: transform 650ms ease-in-out;
}
.flip-inner.animating {
  transform: rotateY(180deg);
}
.flip-cover {
  width: 100%;
  height: 60%;
  object-fit: cover;
}
.flip-caption {
  padding: 12px;
}
.flip-caption h3 {
  margin: 0;
  font-size: 18px;
}
.flip-caption .flip-category {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}

.date {
  font-size: 12px !important;
  color: #7f8c8d !important;
  padding: 0 !important;
  font-weight: 500;
  margin-top: 0 !important;
}

/* Override Vuetify default padding for compact cards */
.meta :deep(.v-card-title) {
  padding: 0 !important;
}

.meta :deep(.v-card-text.date) {
  padding: 0 !important;
}

@media (max-width: 960px) {
  .archive-controls {
    padding: 0 12px !important;
    flex-wrap: wrap !important;
  }

  .archive-categories {
    justify-content: flex-start !important;
    margin-top: 12px !important;
  }
}

@media (max-width: 640px) {
  .publications .v-card-title {
    font-size: 26px !important;
  }

  .archive-controls {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 16px !important;
    padding: 0 12px !important;
  }

  .archive-categories {
    margin-top: 0 !important;
    justify-content: flex-start !important;
  }

  .grid-item {
    padding: 6px !important;
  }

  :deep(.archive-search.v-text-field) {
    width: 100%;
  }
}

/* Override Vuetify default styles to match original */
:deep(.v-text-field) {
  width: 100%;
  max-width: 100%;
}

:deep(.v-text-field .v-field) {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:deep(.v-text-field .v-field__input) {
  padding: 10px 12px 10px 8px;
  font-size: 14px;
  color: #2c3e50;
}

:deep(.v-text-field .v-field__input::placeholder) {
  font-size: 14px;
  color: #9ca3af;
}

:deep(.v-btn.archive-chip) {
  text-transform: none;
  letter-spacing: normal;
  height: 40px;
  padding: 0 20px;
  background: white;
  color: #6b7280;
  border: 2px solid transparent !important;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:deep(.v-btn.archive-chip.active) {
  background: #f5c52b !important;
  border-color: #f5c52b !important;
  color: #2c3e50 !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(245, 197, 43, 0.3);
}

:deep(.v-btn.archive-chip:hover) {
  background: #f8f9fa;
  border-color: transparent !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

:deep(.v-btn.archive-chip.active:hover) {
  background: #f0b90b !important;
  border-color: #f0b90b !important;
  box-shadow: 0 3px 8px rgba(245, 197, 43, 0.4);
}

:deep(.v-card) {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

:deep(.v-img.logo) {
  margin: 0 auto 12px;
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

:deep(.text-h5) {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2f2f2f;
}

:deep(.v-container) {
  max-width: 1400px !important;
}

:deep(.v-card-title) {
  line-height: 1.2;
}

:deep(.v-card-text) {
  padding-top: 8px;
}

.social-links {
  padding: 0;
}

:deep(.social-links .v-list-item) {
  padding-inline-start: 0;
  padding-inline-end: 0;
}

:deep(.social-links .v-list-item-content) {
  justify-content: center;
}

/* Colored brand icons - clean and simple */
.brand-icon {
  font-size: 22px !important;
  transition: all 0.2s ease;
}

:deep(.facebook-icon) {
  color: #1877f2 !important;
}

:deep(.instagram-icon) {
  color: #e4405f !important;
}

:deep(.twitter-icon) {
  color: #000000 !important;
}

:deep(.gmail-icon) {
  color: #ea4335 !important;
}

.brand-icon:hover {
  transform: scale(1.15);
}
</style>
