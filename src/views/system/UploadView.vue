<script setup>
import { ref } from 'vue'
const emit = defineEmits(['close'])
import { archivesService } from '@/services/supabaseService'
import { supabase } from '@/utils/supabase'

const uploadDialog = ref(false)
const selectedFiles = ref([])
const uploading = ref(false)
const fileInput = ref(null)

const title = ref('')
const category = ref('Magazine')
const publishedAt = ref(new Date().toISOString().split('T')[0])

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  // Accept only PDF for publications
  const filtered = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'))
  selectedFiles.value = [...selectedFiles.value, ...filtered]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return
  if (!title.value) {
    alert('Please provide a title for the publication')
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
      const { data: { publicUrl } } = supabase.storage
        .from('archives')
        .getPublicUrl(fileName)

      // Create archive record via Supabase
      await archivesService.create({
        title: title.value,
        category: category.value.toLowerCase(),
        publication_date: publishedAt.value,
        description: `Publication: ${title.value}`,
        file_url: publicUrl,
        file_name: file.name
      })
    }

    // Clear form and close
    selectedFiles.value = []
    title.value = ''
    category.value = 'Magazine'
    publishedAt.value = new Date().toISOString().split('T')[0]
    uploadDialog.value = false
    
    // Notify parent to close (AdminView listens to @close)
    emit('close')
    
    // Notify success
    alert('Upload successful')
  } catch (error) {
    console.error('Upload error:', error)
    alert('Upload failed: ' + (error.error?.message || error.message || String(error)))
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
