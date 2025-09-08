<script setup>
import { ref, computed } from 'vue'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

// Sample social media posts data
const projects = ref([
  {
    id: 1,
    title: 'Instagram Post - Campus Event Promotion',
    sectionHead: 'Jessica Park',
    dueDate: 'Jan 18, 2025',
    status: 'To Editor-in-Chief',
    isStarred: true,
    type: 'social-media',
  },
  {
    id: 2,
    title: 'Facebook Post - Student Achievement',
    sectionHead: "Ryan O'Connor",
    dueDate: 'Jan 22, 2025',
    status: 'To Section Head',
    isStarred: true,
    type: 'social-media',
  },
  {
    id: 3,
    title: 'Twitter Thread - Campus News Update',
    sectionHead: 'Maya Patel',
    dueDate: 'Jan 25, 2025',
    status: 'To Publish',
    isStarred: true,
    type: 'social-media',
  },
  {
    id: 4,
    title: 'LinkedIn Post - Alumni Spotlight',
    sectionHead: 'Kevin Liu',
    dueDate: 'Jan 28, 2025',
    status: 'To Section Head',
    isStarred: false,
    type: 'social-media',
  },
  {
    id: 5,
    title: 'TikTok Video - Campus Life',
    sectionHead: 'Sophie Anderson',
    dueDate: 'Feb 2, 2025',
    status: 'To Technical Editor',
    isStarred: false,
    type: 'social-media',
  },
  {
    id: 6,
    title: 'YouTube Short - Student Interview',
    sectionHead: 'Marcus Johnson',
    dueDate: 'Feb 5, 2025',
    status: 'To Publish',
    isStarred: false,
    type: 'social-media',
  },
])

const searchQuery = ref('')
const sortOrder = ref('A - Z')
const showOnlyStarred = ref(false)

const handleView = (projectId) => {
  console.log(`View social media project ${projectId}`)
  // Handle view logic here
}

const handleAddProject = () => {
  console.log('Add new social media project')
  // Handle add project logic here
}

const toggleStar = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId)
  if (project) {
    project.isStarred = !project.isStarred
  }
}

const filteredProjects = computed(() => {
  let filtered = projects.value

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        project.sectionHead.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  // Filter by starred status
  if (showOnlyStarred.value) {
    filtered = filtered.filter((project) => project.isStarred)
  }

  // Sort projects
  filtered = [...filtered].sort((a, b) => {
    if (sortOrder.value === 'A - Z') {
      return a.title.localeCompare(b.title)
    } else if (sortOrder.value === 'Z - A') {
      return b.title.localeCompare(a.title)
    } else if (sortOrder.value === 'Starred First') {
      if (a.isStarred && !b.isStarred) return -1
      if (!a.isStarred && b.isStarred) return 1
      return a.title.localeCompare(b.title)
    }
    return 0
  })

  return filtered
})

const toggleSortOrder = () => {
  if (sortOrder.value === 'A - Z') {
    sortOrder.value = 'Z - A'
  } else if (sortOrder.value === 'Z - A') {
    sortOrder.value = 'Starred First'
  } else {
    sortOrder.value = 'A - Z'
  }
}
</script>

<template>
  <div class="other-page">
    <MainHeader />

    <main class="main-content">
      <div class="projects-container">
        <!-- Search and Controls -->
        <div class="controls-section">
          <div class="search-section">
            <label for="search" class="search-label">Search:</label>
            <div class="search-input-container">
              <span class="mdi mdi-magnify search-icon"></span>
              <input
                id="search"
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Search social media posts..."
              />
              <span class="mdi mdi-tune search-filter"></span>
            </div>
          </div>

          <div class="sort-section">
            <label class="sort-label">Sort by:</label>
            <button class="sort-button" @click="toggleSortOrder">{{ sortOrder }}</button>
          </div>

          <div class="filter-section">
            <label class="filter-label">
              <input type="checkbox" v-model="showOnlyStarred" class="filter-checkbox" />
              Show starred only
            </label>
          </div>

          <button class="add-project-btn" @click="handleAddProject">Add Project</button>
        </div>

        <!-- Projects Table -->
        <div class="projects-table">
          <div class="table-header">
            <div class="header-cell title-header">Title</div>
            <div class="header-cell">Section Head</div>
            <div class="header-cell">Due Date</div>
            <div class="header-cell">Status</div>
            <div class="header-cell view-header">View</div>
          </div>

          <div class="table-body">
            <div v-for="project in filteredProjects" :key="project.id" class="table-row">
              <div class="table-cell title-cell">
                <button
                  class="star-button"
                  @click="toggleStar(project.id)"
                  :class="{ starred: project.isStarred }"
                  aria-label="Toggle favorite"
                >
                  <span
                    class="mdi"
                    :class="project.isStarred ? 'mdi-star' : 'mdi-star-outline'"
                  ></span>
                </button>
                {{ project.title }}
              </div>
              <div class="table-cell">{{ project.sectionHead }}</div>
              <div class="table-cell">{{ project.dueDate }}</div>
              <div class="table-cell">{{ project.status }}</div>
              <div class="table-cell view-cell">
                <button class="view-btn" @click="handleView(project.id)" aria-label="View project">
                  <span class="mdi mdi-eye"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.other-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.main-content {
  flex: 1;
  padding: 20px;
}

.projects-container {
  width: 100%;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label {
  font-weight: 600;
  color: #2f2f2f;
  white-space: nowrap;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  font-size: 14px;
  width: 300px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 16px;
}

.search-filter {
  position: absolute;
  right: 12px;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-weight: 600;
  color: #2f2f2f;
  white-space: nowrap;
}

.sort-button {
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #2f2f2f;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-button:hover {
  background-color: #f3f4f6;
}

.filter-section {
  display: flex;
  align-items: center;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #2f2f2f;
  cursor: pointer;
}

.filter-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.add-project-btn {
  margin-left: auto;
  padding: 10px 20px;
  background-color: #2f2f2f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
}

.add-project-btn:hover {
  background-color: #1f1f1f;
}

.projects-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 80px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-cell {
  padding: 12px 16px;
  font-weight: 600;
  color: #2f2f2f;
  font-size: 14px;
}

.title-header {
  text-align: left;
}

.view-header {
  text-align: right;
}

.table-body {
  background-color: white;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 80px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-cell {
  padding: 12px 16px;
  color: #2f2f2f;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.title-cell {
  gap: 8px;
}

.star-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #d1d5db;
}

.star-button:hover {
  background-color: #f3f4f6;
  color: #fbbf24;
}

.star-button.starred {
  color: #f59e0b;
}

.star-button .mdi {
  font-size: 16px;
}

.view-cell {
  justify-content: flex-end;
}

.view-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.view-btn:hover {
  background-color: #eff6ff;
}

.view-btn .mdi {
  font-size: 18px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .search-input {
    width: 100%;
  }

  .add-project-btn {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .header-cell,
  .table-cell {
    padding: 8px 12px;
  }

  .table-cell {
    border-bottom: 1px solid #f3f4f6;
  }

  .table-cell:last-child {
    border-bottom: none;
  }

  .table-cell::before {
    content: attr(data-label);
    font-weight: 600;
    color: #6b7280;
    margin-right: 8px;
    min-width: 100px;
  }
}
</style>
