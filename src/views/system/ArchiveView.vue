<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import { supabase } from '@/utils/supabase.js'
import FlipBookViewer from '@/components/FlipBookViewer.vue'

// router is already initialized above

const searchQuery = ref('')
const activeCategory = ref('All')

const categories = ['All', 'Folio', 'Magazine', 'Newsletter']

const articles = ref([
  {
    id: 1,
    title: 'Exploring Literary Horizons',
    category: 'Folio',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2025-02-12',
  },
  {
    id: 2,
    title: 'Campus Life: Spring Edition',
    category: 'Magazine',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2025-03-05',
  },
  {
    id: 3,
    title: 'Alumni Newsletter – April',
    category: 'Newsletter',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2025-04-01',
  },
  {
    id: 4,
    title: 'The Gold Panicles: Special Feature',
    category: 'Magazine',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2025-05-18',
  },
])

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return articles.value.filter((a) => {
    const matchesCategory = activeCategory.value === 'All' || a.category === activeCategory.value
    const matchesQuery = !query || a.title.toLowerCase().includes(query)
    return matchesCategory && matchesQuery
  })
})

// Viewer state: open a flipbook-style viewer in-page instead of navigating (prevents login redirect)
const viewerVisible = ref(false)
const viewerPages = ref([])
const viewerTitle = ref('')
const viewerCategory = ref('Magazine')

function openDeliverable(item, event) {
  // Prevent navigation to route that may trigger auth checks. Open in-page viewer instead.
  event && event.preventDefault && event.preventDefault()
  viewerTitle.value = item.title
  viewerCategory.value = item.category || 'Magazine'
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
  viewerCategory.value = 'Magazine'
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

  // Fetch publications from Supabase and merge into articles
  ;(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching publications from Supabase', error)
        return
      }

      if (data && data.length) {
        const mapped = data.map((p) => ({
          id: p.id,
          title: p.title || 'Untitled',
          category: p.project_type
            ? String(p.project_type).charAt(0).toUpperCase() + String(p.project_type).slice(1)
            : 'Magazine',
          cover: p.media_uploaded || '/images/lib-hd.jpg',
          publishedAt: p.created_at || p.due_date || new Date().toISOString(),
          pages:
            p.media_uploaded && p.media_uploaded.toLowerCase().endsWith('.pdf')
              ? p.media_uploaded
              : null,
        }))

        // Merge, avoiding duplicates by id
        mapped.forEach((m) => {
          const exists = articles.value.find(
            (a) => String(a.id) === String(m.id) || a.title === m.title,
          )
          if (!exists) articles.value.unshift(m)
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
          <v-card-title class="mb-1 font-weight-bold">Publications</v-card-title>

          <v-row class="archive-controls" no-gutters>
            <v-col cols="12" md="2" class="archive-search-group">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search articles..."
                hide-details
                variant="outlined"
                density="comfortable"
                class="archive-search"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="2" class="archive-categories">
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
                    :src="a.cover"
                    :alt="`${a.title} cover`"
                    class="cover"
                    aspect-ratio="1.2"
                    cover
                  />
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
              <v-img src="/images/csu-logo.png" alt="CSU Logo" class="csu-logo mb-4" />
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

    <!-- Flip overlay used for animated transition to deliverable view -->
    <!-- FlipBook viewer (in-page modal) -->
    <FlipBookViewer
      v-model="viewerVisible"
      :pages="viewerPages"
      :title="viewerTitle"
      :category="viewerCategory"
    />
  </v-app>
</template>

<style scoped>
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
  padding: 24px 12px 32px !important;
}

.publications .v-card-title {
  margin: 0 0 12px 0 !important;
  font-size: 22px !important;
  padding: 0 !important;
}

.archive-controls {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
  margin-bottom: 16px !important;
  padding: 0 !important;
}

.archive-search-group {
  position: relative;
  padding: 0 !important;
}

.archive-categories {
  display: inline-flex !important;
  gap: 8px !important;
  padding: 0 !important;
  justify-content: flex-start !important;
}

.grid {
  padding: 0 !important;
}

.grid-item {
  padding: 4px !important;
}

.card {
  border: 1px solid #eee !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: #fff !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  height: 100% !important;
}

.cover {
  width: 100%;
  aspect-ratio: 3 / 2;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meta {
  padding: 8px 10px 10px !important;
  flex-grow: 1 !important;
}

.category {
  display: inline-block !important;
  font-size: 10px !important;
  padding: 4px 6px !important;
  margin-bottom: 4px !important;
  border-radius: 3px !important;
}

.category.magazine {
  background-color: #f5c52b !important;
  color: #353535 !important;
}

.category.folio {
  background-color: #39acff !important;
  color: #353535 !important;
}

.category.newsletter {
  background-color: #353535 !important;
  color: #fff !important;
}

.article-title {
  margin: 0;
  font-size: 15px !important;
  line-height: 1.2 !important;
  display: block;
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
  font-size: 10px !important;
  color: #888 !important;
  padding: 0 !important;
}

@media (max-width: 960px) {
  .archive-categories {
    justify-content: flex-start !important;
    margin-top: 8px !important;
  }
}

@media (max-width: 640px) {
  .archive-controls {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px !important;
  }

  .archive-categories {
    margin-top: 0 !important;
  }

  .grid-item {
    padding: 2px !important;
  }

  :deep(.archive-search.v-text-field) {
    width: 100%;
  }
}

/* Override Vuetify default styles to match original */
:deep(.v-text-field) {
  width: 260px;
  max-width: 100%;
}

:deep(.v-text-field .v-field__input) {
  padding: 8px 10px 8px 8px;
  font-size: 14px;
}

:deep(.v-text-field .v-field__input::placeholder) {
  font-size: 14px;
}

:deep(.v-btn.archive-chip) {
  text-transform: none;
  letter-spacing: normal;
  height: 32px;
  background: white;
  color: #333;
  border: 1px solid #ddd !important;
}

:deep(.v-btn.archive-chip.active) {
  background: #f5c52b !important;
  border-color: #f5c52b !important;
  color: #333 !important;
}

:deep(.v-btn.archive-chip:hover) {
  background: white;
}

:deep(.v-btn.archive-chip.active:hover) {
  background: #f5c52b !important;
}

:deep(.v-card) {
  border: 1px solid #eee;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

:deep(.v-img.logo) {
  margin: 0 auto 12px;
}

.csu-logo {
  width: 120px;
  height: auto;
  object-fit: contain;
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
