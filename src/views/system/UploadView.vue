<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const uploadDialog = ref(false)
const selectedFiles = ref([])
const uploading = ref(false)
const fileInput = ref(null)

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  selectedFiles.value = [...selectedFiles.value, ...files]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  uploading.value = true
  try {
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log('Files uploaded:', selectedFiles.value)
    selectedFiles.value = []
    uploadDialog.value = false
  } catch (error) {
    console.error('Upload error:', error)
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
          <v-icon class="mr-2" color="primary">mdi-cloud-upload</v-icon>
          Upload Content
        </div>
        <v-btn icon variant="text" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-6">
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
              <v-icon size="64" color="primary" class="mb-4">mdi-cloud-upload-outline</v-icon>
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
                <v-icon color="primary">mdi-file-document</v-icon>
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
        <div class="d-flex justify-end gap-3 mt-4">
          <v-btn variant="outlined" @click="cancelUpload">Cancel</v-btn>
          <v-btn
            color="primary"
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
</style>
