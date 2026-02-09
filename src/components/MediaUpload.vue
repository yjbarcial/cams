<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { notifyFileUpload } from '@/services/notificationsService.js'
import { projectsService } from '@/services/supabaseService'
import { getDisplayName } from '@/utils/userDisplay.js'

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: false,
    default: null,
  },
  uploadedBy: {
    type: [String, Number],
    required: false,
    default: null,
  },
})

const emit = defineEmits(['upload-success', 'upload-error'])

const selectedFiles = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')
const fileInput = ref(null)
const uploadedMedia = ref([])
const loadingMedia = ref(false)

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  // Accept only images and videos
  const filtered = files.filter((f) => /\.(jpg|jpeg|png|gif|mp4|mov|avi|webm)$/i.test(f.name))
  selectedFiles.value = [...selectedFiles.value, ...filtered]
}

const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click()
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const getPreviewUrl = (file) => {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
    return URL.createObjectURL(file)
  }
  return null
}

const fetchUploadedMedia = async () => {
  if (!props.projectId) return

  loadingMedia.value = true
  try {
    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    uploadedMedia.value = data || []
  } catch (error) {
    console.error('Error fetching media:', error)
  } finally {
    loadingMedia.value = false
  }
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return
  uploading.value = true
  uploadProgress.value = 0

  try {
    let uploadedCount = 0
    for (const file of selectedFiles.value) {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      // Upload to Supabase storage with upsert option
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage error: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl || ''

      // Insert record into media_files table
      const { error: dbError } = await supabase.from('media_files').insert([
        {
          name: file.name,
          url: publicUrl,
          mime_type: file.type,
          size: file.size,
          project_id: props.projectId ? Number(props.projectId) : null,
          uploaded_by: props.uploadedBy ? Number(props.uploadedBy) : null,
          created_at: new Date().toISOString(),
        },
      ])

      if (dbError) {
        console.error('Database insert error:', dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }

      uploadedCount++
      uploadProgress.value = Math.round((uploadedCount / selectedFiles.value.length) * 100)
    }

    selectedFiles.value = []
    uploadProgress.value = 100
    showNotification.value = true
    notificationType.value = 'success'
    notificationMessage.value = 'Media uploaded successfully!'
    emit('upload-success', notificationMessage.value)

    // Notify all involved users about file upload
    if (props.projectId) {
      try {
        const project = await projectsService.getById(props.projectId)
        const userEmail = localStorage.getItem('userEmail') || 'Unknown User'
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .single()

        const fullName = profiles
          ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim()
          : ''
        const profile = profiles ? { ...profiles, full_name: fullName } : { full_name: fullName }
        const displayName = getDisplayName(userEmail, profile, true)

        await notifyFileUpload({
          project,
          fileName:
            uploadedCount > 1 ? `${uploadedCount} files` : selectedFiles.value[0]?.name || 'file',
          uploadedBy: displayName,
        })
        console.log('✅ Notified users about file upload')
      } catch (notifError) {
        console.error('Error sending file upload notification:', notifError)
      }
    }

    // Refresh media list
    await fetchUploadedMedia()
  } catch (error) {
    showNotification.value = true
    notificationMessage.value = 'Upload failed: ' + (error.message || String(error))
    notificationType.value = 'error'
    emit('upload-error', notificationMessage.value)
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.value = 0
      showNotification.value = false
    }, 3000)
  }
}

const deleteMedia = async (mediaId) => {
  if (!confirm('Are you sure you want to delete this media file?')) return

  try {
    const { error } = await supabase.from('media_files').delete().eq('id', mediaId)

    if (error) throw error

    showNotification.value = true
    notificationType.value = 'success'
    notificationMessage.value = 'Media deleted successfully!'

    await fetchUploadedMedia()
  } catch (error) {
    showNotification.value = true
    notificationMessage.value = 'Delete failed: ' + (error.message || String(error))
    notificationType.value = 'error'
  }
}

const canDeleteMedia = (media) => {
  // Allow delete if user is the uploader or has edit permissions
  return media.uploaded_by === props.uploadedBy
}

// Fetch media on mount
onMounted(() => {
  fetchUploadedMedia()
})
</script>

<template>
  <div class="media-upload-section">
    <v-card class="media-upload-card" elevation="2">
      <v-card-title class="upload-title">
        <v-icon class="mr-2 gold-icon" size="24">mdi-cloud-upload</v-icon>
        <span>Media Upload</span>
      </v-card-title>
      <v-card-text class="upload-content">
        <p class="upload-description">Upload images or videos related to your project</p>
        <div class="upload-row">
          <input
            type="file"
            multiple
            @change="handleFileSelect"
            accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.webm"
            style="display: none"
            ref="fileInput"
            id="media-upload-input"
          />
          <label for="media-upload-input" class="upload-label">
            <v-btn class="select-btn" color="#f5c52b" variant="flat" @click="triggerFileInput">
              <v-icon left class="gold-icon">mdi-folder-image</v-icon>
              Select Files
            </v-btn>
          </label>
        </div>

        <div v-if="selectedFiles.length > 0" class="files-list">
          <div class="file-list-header">Selected Files</div>
          <v-list class="upload-list">
            <v-list-item v-for="(file, idx) in selectedFiles" :key="idx" class="upload-list-item">
              <template v-slot:prepend>
                <div class="preview-thumb">
                  <template v-if="file.type.startsWith('image/')">
                    <img :src="getPreviewUrl(file)" alt="preview" class="preview-img" />
                  </template>
                  <template v-else-if="file.type.startsWith('video/')">
                    <video :src="getPreviewUrl(file)" class="preview-video" muted />
                  </template>
                  <template v-else>
                    <v-icon class="gold-icon">mdi-file-image</v-icon>
                  </template>
                </div>
              </template>
              <v-list-item-title class="file-title">{{ file.name }}</v-list-item-title>
              <v-list-item-subtitle class="file-size">
                {{ (file.size / 1024 / 1024).toFixed(2) }} MB
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-btn icon variant="text" size="small" @click="removeFile(idx)">
                  <v-icon color="#f44336">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <div v-if="uploading || uploadProgress > 0" class="upload-progress-bar">
          <div class="progress-label">Uploading: {{ uploadProgress }}%</div>
          <v-progress-linear
            :value="uploadProgress"
            color="#f5c52b"
            height="8"
            rounded
          ></v-progress-linear>
        </div>

        <div class="upload-actions">
          <v-btn
            class="upload-btn"
            color="#f5c52b"
            :disabled="selectedFiles.length === 0 || uploading"
            :loading="uploading"
            @click="uploadFiles"
            rounded
            elevation="1"
          >
            <v-icon left class="gold-icon">mdi-upload</v-icon>
            Upload {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Uploaded Media Gallery -->
    <v-card v-if="uploadedMedia.length > 0" class="uploaded-media-card" elevation="1">
      <v-card-title class="uploaded-title">
        <v-icon class="mr-2 gold-icon" size="20">mdi-image-multiple</v-icon>
        <span>Uploaded Media ({{ uploadedMedia.length }})</span>
      </v-card-title>
      <v-card-text class="uploaded-content">
        <div v-if="loadingMedia" class="loading-state">
          <v-progress-circular indeterminate color="#f5c52b" size="20"></v-progress-circular>
          <span class="ml-2">Loading media...</span>
        </div>
        <div v-else class="media-grid">
          <div v-for="media in uploadedMedia" :key="media.id" class="media-card">
            <div class="media-preview">
              <template v-if="media.mime_type?.startsWith('image/')">
                <img :src="media.url" :alt="media.name" class="media-image" />
              </template>
              <template v-else-if="media.mime_type?.startsWith('video/')">
                <video :src="media.url" class="media-video" controls />
                <div class="video-overlay">
                  <v-icon size="48" color="white">mdi-play-circle-outline</v-icon>
                </div>
              </template>
              <template v-else>
                <div class="media-placeholder">
                  <v-icon size="48" color="#f5c52b">mdi-file-document</v-icon>
                </div>
              </template>
            </div>
            <div class="media-info">
              <div class="media-filename">{{ media.name }}</div>
              <div class="media-filesize">{{ (media.size / 1024 / 1024).toFixed(2) }} MB</div>
            </div>
            <div class="media-actions">
              <v-btn
                icon
                size="small"
                variant="flat"
                color="#f5c52b"
                :href="media.url"
                target="_blank"
                title="View/Download"
                class="action-btn"
              >
                <v-icon size="18">mdi-open-in-new</v-icon>
              </v-btn>
              <v-btn
                v-if="canDeleteMedia(media)"
                icon
                size="small"
                variant="flat"
                color="#f44336"
                @click="deleteMedia(media.id)"
                title="Delete"
                class="action-btn"
              >
                <v-icon size="18">mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

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
.media-upload-section {
  margin-top: 24px;
  margin-bottom: 24px;
  display: block;
  max-width: 100%;
  min-height: 100px;
}

.media-upload-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
  max-width: 100%;
  width: 100%;
  margin-left: 0;
  margin-right: auto;
  padding: 0;
}

.upload-title {
  display: flex;
  align-items: center;
  font-size: 1.15rem;
  font-weight: 600;
  color: #353535;
  background: transparent;
  border-bottom: 1px solid #f5c52b33;
  padding: 16px 22px 12px 22px;
}

.gold-icon {
  color: #f5c52b !important;
}

.upload-content {
  padding: 18px 22px 18px 22px !important;
}

.upload-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 16px;
  line-height: 1.5;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.upload-label {
  margin-bottom: 0;
  cursor: pointer;
}

.select-btn {
  background: #f5c52b !important;
  color: #23272f !important;
  font-weight: 600;
  border-radius: 7px;
  box-shadow: none;
  padding: 8px 18px;
  font-size: 1rem;
  letter-spacing: 0.01em;
  transition: background 0.2s;
}

.select-btn:hover {
  background: #ffe066 !important;
}

.files-list {
  margin-top: 12px;
}

.file-list-header {
  font-size: 1rem;
  font-weight: 500;
  color: #353535;
  margin-bottom: 8px;
}

.upload-list {
  background: transparent;
  padding: 0;
}

.upload-list-item {
  background: #fafafc;
  border-radius: 7px;
  margin-bottom: 8px;
  box-shadow: none;
  padding: 10px 12px;
  display: flex;
  align-items: center;
}

.preview-thumb {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.preview-img,
.preview-video {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ececec;
}

.file-title {
  color: #353535;
  font-weight: 600;
  font-size: 0.95rem;
}

.file-size {
  color: #888;
  font-size: 0.85rem;
  margin-top: 2px;
}

.upload-progress-bar {
  margin-top: 16px;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #353535;
  margin-bottom: 6px;
}

.upload-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
}

.upload-btn {
  background: #f5c52b !important;
  color: #23272f !important;
  font-weight: 700;
  border-radius: 8px;
  font-size: 1.05rem;
  padding: 10px 26px;
  box-shadow: none;
  margin-top: 0;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: #ffe066 !important;
}

/* Notification card */
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
  .media-upload-card {
    max-width: 100%;
    border-radius: 8px;
  }

  .notification-card {
    right: 12px;
    left: 12px;
    min-width: auto;
  }
}

/* Uploaded Media Gallery Styles */
.uploaded-media-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
  max-width: 100%;
  width: 100%;
  margin-top: 24px;
  margin-left: 0;
  margin-right: auto;
  padding: 0;
}

.uploaded-title {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #353535;
  background: transparent;
  border-bottom: 1px solid #f5c52b33;
  padding: 16px 22px 12px 22px;
}

.uploaded-content {
  padding: 22px !important;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #666;
  font-size: 0.95rem;
}

/* Media Grid Layout */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
  padding: 0;
}

/* Media Card */
.media-card {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.media-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
  border-color: #f5c52b;
}

/* Media Preview Area */
.media-preview {
  position: relative;
  width: 100%;
  height: 180px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.media-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-card:hover .video-overlay {
  opacity: 1;
}

.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

/* Media Info */
.media-info {
  padding: 12px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
}

.media-filename {
  font-size: 0.9rem;
  font-weight: 600;
  color: #353535;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.media-filesize {
  font-size: 0.8rem;
  color: #888;
  font-weight: 400;
}

/* Media Actions */
.media-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  background: #fff;
  border-top: 1px solid #f3f4f6;
  justify-content: center;
}

.action-btn {
  border-radius: 6px;
  box-shadow: none;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.05);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }

  .media-preview {
    height: 150px;
  }
}

@media (max-width: 600px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .media-preview {
    height: 130px;
  }

  .uploaded-content {
    padding: 16px !important;
  }

  .media-info {
    padding: 10px 12px;
  }

  .media-actions {
    padding: 8px 12px;
  }
}
</style>
