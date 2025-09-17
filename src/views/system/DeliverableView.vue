<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const searchQuery = ref('')
const activeType = ref('All')
const route = useRoute()
const articleId = Number(route.params.id)

const filteredDeliverables = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return deliverables.value.filter((d) => {
    const matchesType = activeType.value === 'All' || d.type === activeType.value
    const matchesQuery = !query || d.title.toLowerCase().includes(query)
    return matchesType && matchesQuery
  })
})

function setType(t) {
  activeType.value = t
}
</script>

<template>
  <v-app>
    <ArchiveHeader />

    <v-main class="hero">
      <v-row justify="center" no-gutters>
        <v-col cols="12" class="text-center">
          <v-card-title class="welcome font-weight-bold"> Deliverables </v-card-title>
        </v-col>
      </v-row>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
/* reuse most ArchiveView styles */
.hero {
  padding: 32px 12px 20px;
  text-align: center;
}
.welcome {
  margin-bottom: 8px;
  font-size: 28px;
}
.subtitle {
  color: #555;
}
.publications {
  padding: 24px 12px 32px;
}
.grid-item {
  padding: 4px;
}
.card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  height: 100%;
}
.cover {
  width: 100%;
  aspect-ratio: 3 / 2;
  background: #fafafa;
}
.meta {
  padding: 8px 10px 10px;
}
.category {
  display: inline-block;
  font-size: 10px;
  padding: 4px 6px;
  margin-bottom: 4px;
  border-radius: 3px;
}
.category.manuscript {
  background: #1976d2;
  color: #fff;
}
.category.artwork {
  background: #f57c00;
  color: #fff;
}
.category.layout {
  background: #43a047;
  color: #fff;
}
.category.proof {
  background: #6d4c41;
  color: #fff;
}
.article-title {
  font-size: 15px;
  line-height: 1.2;
}
.date {
  font-size: 11px;
  color: #777;
}
</style>
