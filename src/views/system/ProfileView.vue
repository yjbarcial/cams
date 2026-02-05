<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { profilesService } from '@/services/supabaseService'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()
const profile = ref(null)
const loading = ref(true)
const error = ref(null)
const editMode = ref(false)
const saving = ref(false)
const imageFile = ref(null)
const imagePreview = ref(null)
const uploadingImage = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

// Edit form data
const editForm = ref({
  first_name: '',
  last_name: '',
  bio: '',
  phone: '',
  avatar_url: '',
})

// Display notification
const displayNotification = (message, type = 'success') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true

  setTimeout(() => {
    showNotification.value = false
  }, 4000)
}

// Get current user's profile
async function loadProfile() {
  loading.value = true
  error.value = null

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Get profile from database
    const userProfile = await profilesService.getByEmail(user.email)

    if (userProfile) {
      profile.value = userProfile
      // Initialize edit form
      editForm.value = {
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        bio: userProfile.bio || '',
        phone: userProfile.phone || '',
        avatar_url: userProfile.avatar_url || '',
      }
      imagePreview.value = userProfile.avatar_url || null
    } else {
      error.value = 'Profile not found'
    }
  } catch (err) {
    console.error('Error loading profile:', err)
    error.value = 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

// Handle image file selection
function handleImageSelect(event) {
  const file = event.target.files[0]
  if (file) {
    imageFile.value = file
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// Upload image - store as base64 data URL
async function uploadImage() {
  if (!imageFile.value) return editForm.value.avatar_url

  uploadingImage.value = true
  try {
    // Convert image to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target.result)
      }
      reader.onerror = (error) => {
        reject(error)
      }
      reader.readAsDataURL(imageFile.value)
    })
  } catch (err) {
    console.error('Error processing image:', err)
    throw new Error('Failed to process image')
  } finally {
    uploadingImage.value = false
  }
}

// Save profile changes
async function saveProfile() {
  saving.value = true
  error.value = null

  try {
    // Upload image if new one is selected
    let avatarUrl = editForm.value.avatar_url
    if (imageFile.value) {
      try {
        avatarUrl = await uploadImage()
      } catch (uploadErr) {
        const errorMsg = 'Failed to process image. Please try again.'
        error.value = errorMsg
        displayNotification(errorMsg, 'error')
        saving.value = false
        return
      }
    }

    const updated = await profilesService.update(profile.value.id, {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      bio: editForm.value.bio,
      phone: editForm.value.phone,
      avatar_url: avatarUrl,
    })

    profile.value = updated
    editMode.value = false
    imageFile.value = null

    // Show success notification
    displayNotification('Profile updated successfully!', 'success')
  } catch (err) {
    console.error('Error saving profile:', err)
    const errorMsg = err.message || 'Failed to save profile. Please try again.'
    error.value = errorMsg
    displayNotification(errorMsg, 'error')
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editMode.value = false
  imageFile.value = null
  imagePreview.value = profile.value.avatar_url || null
  // Reset form
  editForm.value = {
    first_name: profile.value.first_name || '',
    last_name: profile.value.last_name || '',
    bio: profile.value.bio || '',
    phone: profile.value.phone || '',
    avatar_url: profile.value.avatar_url || '',
  }
}

// Computed properties
const fullName = computed(() => {
  if (profile.value?.first_name || profile.value?.last_name) {
    return `${profile.value.first_name || ''} ${profile.value.last_name || ''}`.trim()
  }
  return profile.value?.email || 'User'
})

const initials = computed(() => {
  if (profile.value?.first_name && profile.value?.last_name) {
    return `${profile.value.first_name[0]}${profile.value.last_name[0]}`.toUpperCase()
  }
  if (profile.value?.email) {
    return profile.value.email[0].toUpperCase()
  }
  return 'U'
})

const statusColor = computed(() => {
  if (!profile.value?.status) return 'grey'
  return profile.value.status === 'active'
    ? 'success'
    : profile.value.status === 'inactive'
      ? 'warning'
      : 'error'
})

const roleLabel = computed(() => {
  if (!profile.value?.role) return 'Member'
  if (profile.value.role === 'admin') return 'System Admin'
  return profile.value.role.charAt(0).toUpperCase() + profile.value.role.slice(1)
})

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <MainHeader />

    <v-container class="py-8 flex-grow-1" fluid>
      <v-row justify="center">
        <v-col cols="12" sm="12" md="11" lg="10" xl="9">
          <!-- Loading State -->
          <v-card v-if="loading" class="pa-8 text-center">
            <v-progress-circular indeterminate color="primary" />
            <p class="mt-4 text-body-2">Loading profile...</p>
          </v-card>

          <!-- Error State -->
          <v-card v-else-if="error" class="mb-4 message-card error-card" elevation="2">
            <div class="message-content">
              <v-icon color="error" size="24" class="message-icon">mdi-alert-circle</v-icon>
              <span class="message-text">{{ error }}</span>
            </div>
          </v-card>

          <!-- Profile Content -->
          <div v-else-if="profile">
            <!-- Profile Header Card -->
            <v-card class="mb-4 profile-header-card" elevation="2">
              <v-card-text class="pa-md-8 pa-6">
                <v-row align="start" class="profile-header-content">
                  <!-- Avatar Column -->
                  <v-col cols="12" sm="auto" class="text-center text-sm-start">
                    <div class="avatar-container">
                      <v-avatar
                        :color="imagePreview || profile.avatar_url ? 'transparent' : '#f5c52b'"
                        size="120"
                        class="profile-avatar"
                      >
                        <v-img
                          v-if="imagePreview || profile.avatar_url"
                          :src="imagePreview || profile.avatar_url"
                          :alt="fullName"
                          cover
                        />
                        <span v-else class="text-h3 font-weight-bold" style="color: #2c3e50">{{
                          initials
                        }}</span>
                      </v-avatar>

                      <!-- Upload button in edit mode -->
                      <v-btn
                        v-if="editMode"
                        icon
                        size="small"
                        color="#f5c52b"
                        class="avatar-edit-btn"
                        @click="$refs.imageInput.click()"
                      >
                        <v-icon size="20">mdi-camera</v-icon>
                      </v-btn>
                      <input
                        ref="imageInput"
                        type="file"
                        accept="image/*"
                        style="display: none"
                        @change="handleImageSelect"
                      />
                    </div>
                  </v-col>

                  <!-- Profile Info Column -->
                  <v-col cols="12" sm class="profile-info-col">
                    <div class="profile-info-wrapper">
                      <div class="profile-header-top">
                        <div class="profile-text-content">
                          <h1 class="text-h4 font-weight-bold profile-name mb-2">{{ fullName }}</h1>
                          <p class="text-body-1 profile-email mb-4">{{ profile.email }}</p>

                          <div class="d-flex gap-2 flex-wrap mb-3">
                            <v-chip
                              :color="statusColor"
                              size="small"
                              variant="flat"
                              class="status-chip"
                            >
                              <v-icon start size="small">mdi-circle</v-icon>
                              {{ profile.status || 'Active' }}
                            </v-chip>

                            <v-chip color="#f5c52b" size="small" variant="flat" class="role-chip">
                              <v-icon start size="small">mdi-shield-account</v-icon>
                              {{ roleLabel }}
                            </v-chip>
                          </div>
                        </div>

                        <v-btn
                          v-if="!editMode"
                          color="#f5c52b"
                          variant="flat"
                          prepend-icon="mdi-pencil"
                          class="edit-profile-btn"
                          @click="editMode = true"
                        >
                          Edit Profile
                        </v-btn>
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Profile Details Card -->
            <v-card elevation="2" class="profile-details-card">
              <v-card-title class="d-flex align-center details-header">
                <v-icon start color="#f5c52b">mdi-account-details</v-icon>
                Profile Details
              </v-card-title>

              <v-divider />

              <v-card-text class="pa-6">
                <!-- View Mode -->
                <div v-if="!editMode">
                  <v-row>
                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">First Name</p>
                        <p class="text-body-1">{{ profile.first_name || 'Not provided' }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Last Name</p>
                        <p class="text-body-1">{{ profile.last_name || 'Not provided' }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Email</p>
                        <p class="text-body-1">{{ profile.email }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Phone</p>
                        <p class="text-body-1">{{ profile.phone || 'Not provided' }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Bio</p>
                        <p class="text-body-1">{{ profile.bio || 'No bio added yet' }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Member Since</p>
                        <p class="text-body-1">
                          {{
                            new Date(profile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          }}
                        </p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Last Updated</p>
                        <p class="text-body-1">
                          {{
                            profile.updated_at
                              ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'Never'
                          }}
                        </p>
                      </div>
                    </v-col>
                  </v-row>
                </div>

                <!-- Edit Mode -->
                <v-form v-else @submit.prevent="saveProfile">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="editForm.first_name"
                        label="First Name"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-account"
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="editForm.last_name"
                        label="Last Name"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-account"
                      />
                    </v-col>

                    <v-col cols="12">
                      <v-text-field
                        v-model="editForm.phone"
                        label="Phone Number"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-phone"
                        placeholder="+63 912 345 6789"
                      />
                    </v-col>

                    <v-col cols="12">
                      <v-textarea
                        v-model="editForm.bio"
                        label="Bio"
                        variant="outlined"
                        rows="4"
                        prepend-inner-icon="mdi-text"
                        placeholder="Tell us about yourself..."
                      />
                    </v-col>
                  </v-row>

                  <v-divider class="my-4" />

                  <div class="d-flex justify-end gap-2">
                    <v-btn variant="text" @click="cancelEdit" :disabled="saving || uploadingImage">
                      Cancel
                    </v-btn>
                    <v-btn
                      type="submit"
                      color="#f5c52b"
                      variant="flat"
                      :loading="saving || uploadingImage"
                      :disabled="uploadingImage"
                      prepend-icon="mdi-content-save"
                      class="save-btn"
                    >
                      {{ uploadingImage ? 'Uploading Image...' : 'Save Changes' }}
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-card>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <Footer />

    <!-- Notification Card -->
    <Teleport to="body">
      <transition name="slide-down">
        <v-card
          v-if="showNotification"
          class="notification-card"
          :class="`notification-${notificationType}`"
          elevation="8"
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
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  display: flex;
  flex-direction: column;
}

/* Message Cards */
.message-card {
  border-radius: 12px !important;
  padding: 16px 20px;
  border-left: 4px solid;
}

.error-card {
  background: rgba(244, 67, 54, 0.08) !important;
  border-left-color: #f44336;
}

.message-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message-icon {
  flex-shrink: 0;
}

.message-text {
  font-size: 1rem;
  line-height: 1.5;
  color: #2c3e50;
  flex: 1;
}

.profile-header-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: white;
}

.profile-details-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: white;
}

.details-header {
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  padding: 20px 24px !important;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 3px solid #f5c52b;
}

.profile-header-content {
  width: 100%;
}

.profile-info-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-info-wrapper {
  width: 100%;
  min-width: 0;
}

.profile-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  width: 100%;
  flex-wrap: wrap;
}

.profile-text-content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar {
  border: 4px solid #f5c52b;
  box-shadow: 0 8px 24px rgba(245, 197, 43, 0.3);
  transition: all 0.3s ease;
}

.profile-avatar:hover {
  box-shadow: 0 12px 32px rgba(245, 197, 43, 0.4);
  transform: translateY(-2px);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.avatar-edit-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.profile-header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
  flex-wrap: wrap;
}

.profile-name {
  color: #2c3e50;
  word-break: break-word;
  line-height: 1.3;
}

.profile-email {
  color: #7f8c8d;
  font-size: 1rem;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.edit-profile-btn {
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.3);
  font-weight: 600;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  white-space: nowrap;
}

.edit-profile-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.save-btn {
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.3);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.save-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.status-chip {
  font-weight: 600;
  text-transform: capitalize;
}

.role-chip {
  font-weight: 600;
}

.role-chip :deep(.v-chip__content) {
  color: #2c3e50 !important;
}

.gap-4 {
  gap: 1.5rem;
}

.gap-2 {
  gap: 0.5rem;
}

/* Form field styling */
:deep(.v-text-field .v-field),
:deep(.v-textarea .v-field) {
  border-radius: 12px;
  background: #fafafa;
}

:deep(.v-text-field .v-field:hover),
:deep(.v-textarea .v-field:hover) {
  background: #f5f5f5;
}

:deep(.v-text-field .v-field--focused),
:deep(.v-textarea .v-field--focused) {
  background: white;
  box-shadow: 0 0 0 2px rgba(245, 197, 43, 0.2);
}

/* Ensure proper spacing in cards */
:deep(.v-card-text) {
  padding: 24px !important;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .profile-header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .edit-profile-btn {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .profile-avatar {
    width: 100px !important;
    height: 100px !important;
  }

  .avatar-edit-btn {
    bottom: 2px;
    right: 2px;
  }

  .profile-name {
    font-size: 1.5rem !important;
  }

  .gap-4 {
    gap: 1rem;
  }

  :deep(.v-card-text) {
    padding: 16px !important;
  }

  .details-header {
    padding: 16px 20px !important;
  }
}

/* Prevent text overflow */
.text-body-1,
.text-caption {
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* Notification Card */
.notification-card {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  min-width: 340px;
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
  font-weight: 500;
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
