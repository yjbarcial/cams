<script setup>
import { ref } from 'vue'
const emit = defineEmits(['close'])
import { supabase } from '@/utils/supabase.js'

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

// Quick connectivity check to make "Failed to fetch" errors easier to diagnose.
const checkSupabase = async () => {
  try {
    // small, safe query to validate connectivity and credentials
    const { data, error } = await supabase.from('projects').select('id').limit(1)
    if (error) return { ok: false, error }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err }
  }
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
  // run a quick connectivity check first to fail fast with better diagnostics
  const connectivity = await checkSupabase()
  if (!connectivity.ok) {
    console.error('Supabase connectivity check failed', connectivity.error)
    uploading.value = false
    alert(
      'Supabase connectivity check failed: ' +
        (connectivity.error?.message || String(connectivity.error)) +
        '\nPossible causes: network/CORS issue, incorrect VITE_SUPABASE_URL or VITE_SUPABASE_KEY, or storage policies preventing anonymous uploads. Check browser console for details.',
    )
    return
  }
  try {
    const bucket = 'publications'
    const uploadedUrls = []

    for (const file of selectedFiles.value) {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        // Common client-side symptom is a network/CORS failure which often surfaces as a generic fetch failure.
        // Provide a little more guidance to the developer in this case.
        if (uploadError.message && uploadError.message.toLowerCase().includes('failed to fetch')) {
          uploadError.message =
            uploadError.message +
            '\nHint: "Failed to fetch" often means a network/CORS problem or that the Supabase URL/Key is incorrect. Check VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your environment and the browser console network tab.'
        }
        throw uploadError
      }

      // get public URL
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path || fileName)
      const publicUrl = publicData?.publicUrl || publicData?.publicURL || `/${fileName}`
      uploadedUrls.push(publicUrl)

      // Insert project row in projects table
      const payload = {
        title: title.value,
        project_type: category.value.toLowerCase(),
        media_uploaded: publicUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from('projects').insert(payload)
      if (insertError) throw insertError
    }

    // Clear form and close
    selectedFiles.value = []
    title.value = ''
    category.value = 'Magazine'
    publishedAt.value = new Date().toISOString().split('T')[0]
    uploadDialog.value = false
    // notify parent to close (AdminView listens to @close)
    emit('close')
    // notify success
    alert('Upload successful')
  } catch (error) {
    console.error('Upload error:', error)
    alert('Upload failed: ' + (error.message || String(error)))
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
