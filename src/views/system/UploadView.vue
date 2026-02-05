<script setup>
import { ref } from 'vue'
const emit = defineEmits(['close', 'upload-success', 'upload-error'])
import { archivesService } from '@/services/supabaseService'
import { supabase } from '@/utils/supabase'

const uploadDialog = ref(false)
const selectedFiles = ref([])
const uploading = ref(false)
const fileInput = ref(null)
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

const title = ref('')
const category = ref('Magazine')
const publishedAt = ref(new Date().toISOString().split('T')[0])

// Show notification function
const displayNotification = (message, type = 'success') => {
  console.log('🔔 Displaying notification:', message, type)
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true
  console.log('showNotification value:', showNotification.value)

  // Auto-hide after 4 seconds
  setTimeout(() => {
    showNotification.value = false
  }, 4000)
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  // Accept only PDF for publications
  const filtered = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'))
  selectedFiles.value = [...selectedFiles.value, ...filtered]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

// Generate thumbnail from PDF first page
const generateThumbnail = async (file) => {
  try {
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise

    // Get first page
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.8 }) // Scale for thumbnail

    // Create canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    // Render page to canvas
    await page.render({ canvasContext: context, viewport }).promise

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    // Return null if thumbnail generation fails
    return null
  }
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return
  if (!title.value) {
    displayNotification('Please provide a title for the publication', 'warning')
    return
  }

  uploading.value = true
  try {
    for (const file of selectedFiles.value) {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('archives')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('archives').getPublicUrl(fileName)

      // Generate and upload thumbnail
      let thumbUrl = null
      const thumbnailBlob = await generateThumbnail(file)

      if (thumbnailBlob) {
        const thumbFileName = `thumb-${Date.now()}.jpg`

        const { error: thumbError } = await supabase.storage
          .from('archives')
          .upload(thumbFileName, thumbnailBlob)

        if (!thumbError) {
          const {
            data: { publicUrl: thumbPublicUrl },
          } = supabase.storage.from('archives').getPublicUrl(thumbFileName)
          thumbUrl = thumbPublicUrl
        }
      }

      // Create archive record via Supabase
      const archiveData = {
        title: title.value,
        category: category.value.toLowerCase(),
        publication_date: publishedAt.value,
        description: `Publication: ${title.value}`,
        file_url: publicUrl,
        file_name: file.name,
      }

      // Add thumbnail if available
      if (thumbUrl) {
        archiveData.cover_image_url = thumbUrl
      }

      await archivesService.create(archiveData)
    }

    // Clear form
    selectedFiles.value = []
    title.value = ''
    category.value = 'Magazine'
    publishedAt.value = new Date().toISOString().split('T')[0]
    uploadDialog.value = false

    // Show success notification FIRST
    displayNotification('Upload successful! Your files have been published.', 'success')

    // Emit success event to parent
    emit('upload-success', 'Files uploaded successfully')

    // Delay closing to show notification
    setTimeout(() => {
      emit('close')
    }, 2000)
  } catch (error) {
    console.error('Upload error:', error)
    const errorMsg = 'Upload failed: ' + (error.error?.message || error.message || String(error))
    displayNotification(errorMsg, 'error')
    emit('upload-error', errorMsg)
  } finally {
    uploading.value = false
  }
}

const cancelUpload = () => {
  selectedFiles.value = []
  uploadDialog.value = false
}
</script>

<template>
  <div class="upload-view">
    <v-card>
      <v-card-title class="text-h5 d-flex justify-space-between align-center pa-4">
        <div class="d-flex align-center">
          <v-icon class="mr-2" color="#f5c52b">mdi-cloud-upload</v-icon>
          Upload Content
        </div>
        <v-btn icon variant="text" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-row class="mb-4" align="center">
          <v-col cols="12" md="6">
            <v-text-field v-model="title" label="Title" required></v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="category"
              :items="['Folio', 'Magazine', 'Newsletter']"
              label="Category"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="publishedAt" label="Published Date" type="date"></v-text-field>
          </v-col>
        </v-row>
        <div class="upload-area mb-4">
          <input
            ref="fileInput"
            type="file"
            multiple
            @change="handleFileSelect"
            style="display: none"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            id="file-upload"
          />
          <label for="file-upload" class="upload-label">
            <div class="text-center">
              <v-icon size="64" color="#f5c52b" class="mb-4">mdi-cloud-upload-outline</v-icon>
              <h3 class="text-h6 mb-2">Drag and drop files here</h3>
              <p class="text-body-2 text-grey">or click to browse</p>
              <p class="text-caption text-grey mt-2">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
              </p>
            </div>
          </label>
        </div>

        <!-- Selected Files List -->
        <div v-if="selectedFiles.length > 0" class="files-list">
          <v-list>
            <v-list-item v-for="(file, index) in selectedFiles" :key="index" class="file-item">
              <template v-slot:prepend>
                <v-icon color="#f5c52b">mdi-file-document</v-icon>
              </template>
              <v-list-item-title>{{ file.name }}</v-list-item-title>
              <v-list-item-subtitle
                >{{ (file.size / 1024 / 1024).toFixed(2) }} MB</v-list-item-subtitle
              >
              <template v-slot:append>
                <v-btn icon variant="text" size="small" @click="removeFile(index)">
                  <v-icon color="error">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Upload Actions -->
        <div class="d-flex justify-end mt-4" style="gap: 12px">
          <v-btn variant="outlined" @click="cancelUpload">Cancel</v-btn>
          <v-btn
            color="#f5c52b"
            :disabled="selectedFiles.length === 0 || uploading"
            :loading="uploading"
            @click="uploadFiles"
          >
            <v-icon left>mdi-upload</v-icon>
            Upload {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Notification Card -->
    <Teleport to="body">
      <transition name="slide-down">
        <v-card
          v-if="showNotification"
          class="notification-card"
          :class="`notification-${notificationType}`"
          elevation="6"
        >
          <div class="notification-content">
            <v-icon
              :color="
                notificationType === 'success'
                  ? 'success'
                  : notificationType === 'error'
                    ? 'error'
                    : 'warning'
              "
              size="24"
              class="notification-icon"
            >
              {{
                notificationType === 'success'
                  ? 'mdi-check-circle'
                  : notificationType === 'error'
                    ? 'mdi-alert-circle'
                    : 'mdi-alert'
              }}
            </v-icon>
            <span class="notification-message">{{ notificationMessage }}</span>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="showNotification = false"
              class="notification-close"
            >
              <v-icon size="20">mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.upload-view {
  width: 100%;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 48px;
  background-color: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover {
  border-color: #1976d2;
  background-color: #f5f5f5;
}

.upload-label {
  cursor: pointer;
  display: block;
}

.files-list {
  margin-top: 24px;
}

.file-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
}

/* Lighter disabled state for upload button */
:deep(.v-btn--disabled) {
  opacity: 0.4 !important;
}

/* Notification Card */
.notification-card {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  min-width: 320px;
  max-width: 500px;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
}

.notification-success {
  background: #fff;
  border-left: 4px solid #4caf50;
}

.notification-error {
  background: #fff;
  border-left: 4px solid #f44336;
}

.notification-warning {
  background: #fff;
  border-left: 4px solid #ff9800;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #2c3e50;
}

.notification-close {
  flex-shrink: 0;
}

/* Slide down animation */
.slide-down-enter-active {
  animation: slideDown 0.3s ease-out;
}

.slide-down-leave-active {
  animation: slideUp 0.3s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

@media (max-width: 600px) {
  .notification-card {
    right: 12px;
    left: 12px;
    min-width: auto;
  }
}
</style>
