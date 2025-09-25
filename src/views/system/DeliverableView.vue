<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const route = useRoute()
const router = useRouter()

const deliverables = ref([
  {
    id: 1,
    title: 'Laom Folio – Yaon 2021',
    category: 'Folio',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2022-09-05',
    description:
      'This folio encapsulates the drastic transitions of life in this time of pandemic and inspires people to break free from chaos and continue living with hope.',
  },
  {
    id: 2,
    title: 'Campus Magazine 2022',
    category: 'Magazine',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2022-11-18',
    description: 'A colorful look at campus life and stories from students and staff.',
  },
  {
    id: 3,
    title: 'Quarterly Newsletter – March',
    category: 'Newsletter',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2023-03-01',
    description: 'Latest announcements and updates for the community.',
  },
  {
    id: 4,
    title: 'Special Folio – Creativity 2023',
    category: 'Folio',
    cover: '/images/lib-hd.jpg',
    publishedAt: '2023-08-10',
    description: 'Celebrating creativity and artistic expression across the university.',
  },
])

const articleId = computed(() => Number(route.params.id))

const currentIndex = computed(() => deliverables.value.findIndex((d) => d.id === articleId.value))

const current = computed(() => deliverables.value[currentIndex.value])

function prevItem() {
  if (currentIndex.value > 0) {
    const prevId = deliverables.value[currentIndex.value - 1].id
    router.push(`/deliverables/${prevId}`)
  }
}

function nextItem() {
  if (currentIndex.value < deliverables.value.length - 1) {
    const nextId = deliverables.value[currentIndex.value + 1].id
    router.push(`/deliverables/${nextId}`)
  }
}
</script>

<template>
  <v-app>
    <ArchiveHeader />

    <v-main>
      <v-container fluid class="py-6">
        <v-row justify="center">
          <v-col cols="12" md="11">
            <v-btn
              icon
              variant="text"
              color="primary"
              class="mb-4"
              @click="router.push('/archive')"
            >
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>

            <v-row>
              <!-- Left: cover + arrows -->
              <v-col cols="12" md="6">
                <v-card flat class="pa-4 d-flex align-center justify-center" color="grey-lighten-4">
                  <v-row align="center" justify="center" no-gutters style="width: 100%">
                    <v-col cols="1" class="d-flex justify-end">
                      <v-btn
                        icon
                        variant="text"
                        :disabled="currentIndex <= 0"
                        @click="prevItem"
                        aria-label="Previous deliverable"
                      >
                        <v-icon large>mdi-chevron-left</v-icon>
                      </v-btn>
                    </v-col>

                    <v-col cols="10" class="d-flex justify-center">
                      <v-img
                        :src="current.cover"
                        :alt="`${current.title} cover`"
                        max-width="380"
                        aspect-ratio="3/4"
                        class="elevation-2"
                        cover
                      />
                    </v-col>

                    <v-col cols="1" class="d-flex justify-start">
                      <v-btn
                        icon
                        variant="text"
                        :disabled="currentIndex >= deliverables.length - 1"
                        @click="nextItem"
                        aria-label="Next deliverable"
                      >
                        <v-icon large>mdi-chevron-right</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>

              <!-- Right: info -->
              <v-col cols="12" md="6">
                <v-card flat class="pa-6" color="grey-lighten-4">
                  <v-chip
                    :class="['category', current.category.toLowerCase()]"
                    size="small"
                    variant="flat"
                    class="mb-2"
                    label
                  >
                    {{ current.category }}
                  </v-chip>

                  <v-card-title class="text-h6 font-weight-bold pa-0 mb-1">
                    {{ current.title }}
                  </v-card-title>

                  <v-card-subtitle class="text-caption mb-4">
                    <time :datetime="current.publishedAt">
                      {{ new Date(current.publishedAt).toLocaleDateString() }}
                    </time>
                  </v-card-subtitle>

                  <v-card-text class="text-body-2">
                    {{ current.description }}
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
.v-img {
  border-radius: 4px;
}

.v-icon {
  color: #353535;
}

/* Copy the exact category styles from ArchiveView */
.category {
  display: inline-block !important;
  font-size: 11px !important;
  padding: 5px 6px !important;
  margin-bottom: 4px !important;
  border-radius: 3px !important;
}

.category.magazine {
  background-color: #f5c52b !important;
  color: #333 !important;
}

.category.folio {
  background-color: #39acff !important;
  color: #333 !important;
}

.category.newsletter {
  background-color: #353535 !important;
  color: #fff !important;
}
</style>
