<script setup>
import { ref, computed } from 'vue'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const searchQuery = ref('')
const activeCategory = ref('All')

const categories = ['All', 'Folio', 'Magazine', 'Newsletter']

const articles = ref([
  {
    id: 1,
    title: 'Exploring Literary Horizons',
    category: 'Folio',
    cover: '@/assets/images/GoldQuill Logo.png',
    publishedAt: '2025-02-12',
  },
  {
    id: 2,
    title: 'Campus Life: Spring Edition',
    category: 'Magazine',
    cover: '@/assets/images/GoldQuill Logo.png',
    publishedAt: '2025-03-05',
  },
  {
    id: 3,
    title: 'Alumni Newsletter – April',
    category: 'Newsletter',
    cover: '@/assets/images/GoldQuill Logo.png',
    publishedAt: '2025-04-01',
  },
  {
    id: 4,
    title: 'The Gold Panicles: Special Feature',
    category: 'Magazine',
    cover: '@/assets/images/GoldQuill Logo.png',
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
  <div class="container">
    <ArchiveHeader />

    <section class="hero">
      <v-img
        src="@/assets/images/GoldQuill Logo.png"
        alt="GoldQuill"
        class="logo"
        width="160"
        contain
      />
      <h2 class="welcome">Welcome to <span class="brand">GoldQuill</span>!</h2>
      <p class="subtitle">Discover the latest publications from The Gold Panicles.</p>
      <div class="scroll-indicator" @click="scrollToPublications" role="button" tabindex="0">
        <v-icon>mdi-chevron-down</v-icon>
        <v-icon>mdi-chevron-down</v-icon>
      </div>
    </section>

    <section id="publications-section" class="publications">
      <h2 class="mb-1">Publications</h2>

      <div class="archive-controls">
        <div class="archive-search-group">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search articles..."
            hide-details
            variant="outlined"
            density="comfortable"
            class="archive-search"
          ></v-text-field>
        </div>
        <div class="archive-categories">
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
        </div>
      </div>

      <div class="grid">
        <v-card v-for="a in filteredArticles" :key="a.id" class="card">
          <img :src="a.cover" :alt="a.title" class="cover" aspect-ratio="1.5" cover />
          <div class="meta">
            <span :class="['category', a.category.toLowerCase()]">{{ a.category }}</span>
            <h4 class="title">{{ a.title }}</h4>
            <time class="date" :datetime="a.publishedAt">
              {{ new Date(a.publishedAt).toLocaleDateString() }}
            </time>
          </div>
        </v-card>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.hero {
  padding: 32px 12px 20px;
  text-align: center;
}

.welcome {
  margin: 0 0 8px 0;
  font-size: 28px;
}

.brand {
  color: #f5c52b;
}

.subtitle {
  margin: 0;
  color: #555;
}

.scroll-indicator {
  margin: 12px auto 0;
  width: max-content;
  color: #333;
  cursor: pointer;
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
  padding: 24px 12px 32px;
}

.publications h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
}

.archive-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.archive-search-group {
  position: relative;
}

.archive-categories {
  display: inline-flex;
  gap: 8px;
}

.chip {
  appearance: none;
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
}

.chip.active {
  background: #f5c52b;
  border-color: #f5c52b;
}

.search {
  width: 260px;
  max-width: 100%;
  padding: 8px 10px 8px 34px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.card {
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.cover {
  width: 100%;
  aspect-ratio: 3 / 2;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.meta {
  padding: 10px 12px 12px;
}

.category {
  display: inline-block;
  font-size: 12px;
  padding: 4px 8px;
  margin-bottom: 6px;
  border-radius: 4px;
}

.category.magazine {
  background-color: #f5c52b;
  color: #333;
}

.category.folio {
  background-color: #39acff;
  color: #333;
}

.category.newsletter {
  background-color: #353535;
  color: #fff;
}

.title {
  margin: 0 0 6px 0;
  font-size: 16px;
}

.date {
  font-size: 12px;
  color: #888;
}

@media (max-width: 640px) {
  .archive-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
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
  font-size: 14px; /* Add this line to make the font smaller */
}

:deep(.v-text-field .v-field__input::placeholder) {
  font-size: 14px; /* Match placeholder text size */
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

/* Remove any hover effects */
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
</style>
