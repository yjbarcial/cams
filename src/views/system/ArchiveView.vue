<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import { supabase } from '@/utils/supabase'

const router = useRouter()

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

function openDeliverable(item, event) {
  event && event.preventDefault && event.preventDefault()
  router.push({ name: 'publication', params: { id: item.id } })
}

onMounted(() => {
  // Fetch archives from Supabase directly
  ;(async () => {
    try {
      const { data, error } = await supabase
        .from('archives')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length) {
        const mapped = data.map((archive) => ({
          id: archive.id,
          title: archive.title || 'Untitled',
          category: archive.category
            ? String(archive.category).charAt(0).toUpperCase() + String(archive.category).slice(1)
            : 'Magazine',
          cover: archive.cover_image_url || '/images/lib-hd.jpg',
          publishedAt: archive.publication_date_iso || archive.created_at,
          content: archive.description || '',
          mediaUploaded: archive.file_url || '',
          writers: archive.authors || '',
          artists: archive.authors || '',
          pages:
            archive.file_url && archive.file_url.toLowerCase().endsWith('.pdf')
              ? archive.file_url
              : null,
          volumeIssue: archive.volume_issue || '',
          tags: archive.tags || [],
        }))

        articles.value = mapped
      }
    } catch (err) {
      console.error('Error loading archives from Supabase:', err)
      // Fallback: articles remain empty array
    }
  })()
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
                <div class="book-wrapper">
                  <div class="book-card">
                    <div class="book-spine"></div>
                    <div class="book-front">
                      <v-img
                        :src="a.cover || a.mediaUploaded || '/images/lib-hd.jpg'"
                        :alt="`${a.title} cover`"
                        class="book-cover"
                        aspect-ratio="0.7"
                        cover
                      >
                        <template v-slot:error>
                          <div class="cover-placeholder">
                            <v-icon size="48" color="grey-lighten-2">mdi-book-outline</v-icon>
                          </div>
                        </template>
                      </v-img>
                    </div>
                  </div>
                  <div class="book-info-text">
                    <div class="book-title">{{ a.title }}</div>
                    <div class="book-date">
                      <time :datetime="a.publishedAt">
                        {{ new Date(a.publishedAt).toLocaleDateString() }}
                      </time>
                    </div>
                  </div>
                </div>
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
  padding: 10px !important;
}

/* Book Wrapper */
.book-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.book-info-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

/* Book Card Styles */
.book-card {
  position: relative;
  display: flex;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.book-card:hover {
  transform: translateY(-6px);
}

.book-spine {
  width: 12px;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.25) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0.25) 100%
  );
  border-radius: 3px 0 0 3px;
  box-shadow: inset -1px 0 3px rgba(0, 0, 0, 0.2);
}

.book-front {
  flex: 1;
  background: white;
  border-radius: 0 3px 3px 0;
  box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.book-cover {
  width: 100%;
  height: 100%;
  background: #f8f9fa;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e3e7ed 100%);
}

.book-title {
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 0 4px;
}

.book-date {
  font-size: 11px;
  color: #7f8c8d;
  font-weight: 500;
  text-align: center;
}

.category {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  font-size: 10px !important;
  font-weight: 600 !important;
  padding: 4px 10px !important;
  margin-bottom: 0 !important;
  border-radius: 12px !important;
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

/* Responsive adjustments */
@media (max-width: 960px) {
  .book-spine {
    width: 10px;
  }
}

@media (max-width: 640px) {
  .grid-item {
    padding: 8px !important;
  }

  .book-spine {
    width: 8px;
  }

  .book-title {
    font-size: 11px;
  }

  .book-date {
    font-size: 10px;
  }

  .book-wrapper {
    gap: 6px;
  }

  .book-info-text {
    gap: 3px;
  }
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
