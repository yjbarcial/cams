<script setup>
import { ref, computed } from 'vue'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

// Sample magazine projects data
const projects = ref([
  {
    id: 1,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Mark Dela Cruz',
    dueDate: 'Sep 7, 2020',
    status: 'To Editor-in-Chief',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 2,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Rey Dela Cruz',
    dueDate: 'Sep 7, 2020',
    status: 'To Section Head',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 3,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Ella Domingo',
    dueDate: 'Sep 7, 2020',
    status: 'To Publish',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 4,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'John Santos',
    dueDate: 'Oct 10, 2021',
    status: 'To Section Head',
    isStarred: false,
    type: 'magazine',
  },
  {
    id: 5,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'James Rivera',
    dueDate: 'Oct 10, 2021',
    status: 'To Technical Editor',
    isStarred: false,
    type: 'magazine',
  },
  {
    id: 6,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'Jane Rodriguez',
    dueDate: 'Oct 10, 2021',
    status: 'To Publish',
    isStarred: false,
    type: 'magazine',
  },
])

const searchQuery = ref('')
const sortOrder = ref('A - Z')
const showOnlyStarred = ref(false)

const handleView = (projectId) => {
  console.log(`View project ${projectId}`)
  // Handle view logic here
}

const handleAddProject = () => {
  console.log('Add new magazine project')
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
  <div class="magazine-page">
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
                placeholder="Search magazines..."
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
.magazine-page {
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
