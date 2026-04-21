<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { profilesService } from '@/services/supabaseService'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()
const route = useRoute()
const profile = ref(null)
const currentUser = ref(null)
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
const updatingStatus = ref(false)

const statusOptions = [
  { value: 'active', label: 'Active', icon: 'mdi-circle', color: 'success' },
  { value: 'inactive', label: 'Offline', icon: 'mdi-sleep', color: 'warning' },
  { value: 'suspended', label: 'Do Not Disturb', icon: 'mdi-minus-circle', color: 'error' },
]

// Edit form data
const editForm = ref({
  first_name: '',
  last_name: '',
  bio: '',
  phone: '',
  avatar_url: '',
})

// Check if viewing own profile
const isOwnProfile = computed(() => {
  if (!currentUser.value || !profile.value) return false
  return currentUser.value.id === profile.value.id
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

// Get user profile (own or other user)
async function loadProfile() {
  loading.value = true
  error.value = null

  try {
    // Get current authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Get current user's profile
    const currUserProfile = await profilesService.getByEmail(user.email)
    if (currUserProfile) {
      currentUser.value = currUserProfile
    }

    // Check if viewing another user's profile
    const userId = route.params.userId
    let userProfile

    if (userId) {
      // Load specific user's profile by ID
      userProfile = await profilesService.getById(userId)
    } else {
      // Load current user's profile
      userProfile = currUserProfile
    }

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
      } catch {
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

async function updatePresenceStatus(nextStatus) {
  if (!isOwnProfile.value || !profile.value || !nextStatus) return
  if (profile.value.status === nextStatus) return

  updatingStatus.value = true
  try {
    const updated = await profilesService.update(profile.value.id, {
      status: nextStatus,
    })
    profile.value = updated
    displayNotification(`Status updated to ${statusLabel.value}.`, 'success')
  } catch (err) {
    console.error('Error updating status:', err)
    displayNotification('Failed to update status. Please try again.', 'error')
  } finally {
    updatingStatus.value = false
  }
}

// Guard to prevent editing other users' profiles
function startEdit() {
  if (!isOwnProfile.value) {
    displayNotification('You can only edit your own profile', 'error')
    return
  }
  editMode.value = true
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

const statusLabel = computed(() => {
  const current = statusOptions.find((option) => option.value === profile.value?.status)
  return current?.label || 'Active'
})

const statusIcon = computed(() => {
  const current = statusOptions.find((option) => option.value === profile.value?.status)
  return current?.icon || 'mdi-circle'
})

const roleLabel = computed(() => {
  if (!profile.value?.role) return 'Member'
  if (profile.value.role === 'admin') return 'System Admin'
  if (profile.value.role === 'section_head') return 'Section Head'
  return profile.value.role.charAt(0).toUpperCase() + profile.value.role.slice(1)
})

const canViewAccountRole = computed(() => {
  if (!currentUser.value) return false
  return isOwnProfile.value || currentUser.value.role === 'admin'
})

const designationLabel = computed(() => {
  return profile.value?.designation_label || 'Not assigned'
})

const contributorTypeLabel = computed(() => {
  return profile.value?.positions_label || 'Not assigned'
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
                        :color="imagePreview || profile.avatar_url ? 'transparent' : '#2c3e50'"
                        size="120"
                        class="profile-avatar"
                      >
                        <v-img
                          v-if="imagePreview || profile.avatar_url"
                          :src="imagePreview || profile.avatar_url"
                          :alt="fullName"
                          cover
                        />
                        <span v-else class="text-h3 font-weight-bold" style="color: #ffffff">{{
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
                            <v-menu location="bottom" :close-on-content-click="true">
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  :color="statusColor"
                                  size="small"
                                  variant="flat"
                                  class="status-chip"
                                  :loading="updatingStatus"
                                  :disabled="!isOwnProfile || updatingStatus"
                                >
                                  <v-icon start size="small">{{ statusIcon }}</v-icon>
                                  {{ statusLabel }}
                                  <v-icon end size="small" v-if="isOwnProfile"
                                    >mdi-chevron-down</v-icon
                                  >
                                </v-btn>
                              </template>

                              <v-list density="compact" min-width="220">
                                <v-list-item
                                  v-for="option in statusOptions"
                                  :key="option.value"
                                  :title="option.label"
                                  @click="updatePresenceStatus(option.value)"
                                >
                                  <template #prepend>
                                    <v-icon :color="option.color" size="small">{{
                                      option.icon
                                    }}</v-icon>
                                  </template>
                                </v-list-item>
                              </v-list>
                            </v-menu>

                            <v-chip
                              size="small"
                              variant="outlined"
                              class="meta-chip designation-chip"
                            >
                              <v-icon start size="small">mdi-account-tie</v-icon>
                              Designation: {{ designationLabel }}
                            </v-chip>

                            <v-chip
                              size="small"
                              variant="outlined"
                              class="meta-chip contributor-chip"
                            >
                              <v-icon start size="small">mdi-pencil-ruler</v-icon>
                              Contributor: {{ contributorTypeLabel }}
                            </v-chip>
                          </div>

                          <p
                            v-if="canViewAccountRole"
                            class="text-caption text-medium-emphasis mb-0"
                          >
                            Account Access: {{ roleLabel }}
                          </p>
                        </div>

                        <v-btn
                          v-if="!editMode && isOwnProfile"
                          color="#f5c52b"
                          variant="flat"
                          prepend-icon="mdi-pencil"
                          class="edit-profile-btn"
                          @click="startEdit()"
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
                <v-icon start>mdi-account-details</v-icon>
                Profile Information
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

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Workflow Designation</p>
                        <p class="text-body-1">{{ designationLabel }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Contributor Type</p>
                        <p class="text-body-1">{{ contributorTypeLabel }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Bio</p>
                        <p class="text-body-1">{{ profile.bio || 'No bio added yet' }}</p>
                      </div>
                    </v-col>

                    <v-col v-if="canViewAccountRole" cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Account Access</p>
                        <p class="text-body-1">{{ roleLabel }}</p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="6">
                      <div class="mb-4">
                        <p class="text-caption text-medium-emphasis mb-1">Status</p>
                        <p class="text-body-1">{{ statusLabel }}</p>
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
                <v-form v-if="editMode && isOwnProfile" @submit.prevent="saveProfile">
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
  background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
}

/* Message Cards */
.message-card {
  border-radius: 12px !important;
  padding: 16px 24px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
}

.error-card {
  background: #fff5f5 !important;
  border-left: 4px solid #f44336;
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
  font-size: 0.95rem;
  line-height: 1.6;
  color: #2c3e50;
  flex: 1;
  font-weight: 500;
}

.profile-header-card {
  border-radius: 16px !important;
  overflow: visible;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.profile-header-card:hover {
  box-shadow: 0 4px 16px rgba(245, 197, 43, 0.08) !important;
  transform: translateY(-1px);
}

.profile-details-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.profile-details-card:hover {
  box-shadow: 0 4px 16px rgba(245, 197, 43, 0.08) !important;
}

.details-header {
  background: linear-gradient(135deg, #353535 0%, #2e2e2e 100%);
  padding: 18px 24px !important;
  font-weight: 700;
  font-size: 0.95rem;
  color: #ffffff;
  letter-spacing: 0.4px;
  border-bottom: 3px solid #f5c52b;
  display: flex;
  align-items: center;
  gap: 10px;
}

.details-header :deep(.v-icon) {
  color: #f5c52b !important;
  font-size: 1.3rem;
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
  gap: 2rem;
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
  padding: 8px;
}

.profile-avatar {
  border: 4px solid #f5c52b;
  box-shadow:
    0 4px 16px rgba(245, 197, 43, 0.15),
    0 0 0 8px rgba(245, 197, 43, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-avatar:hover {
  box-shadow:
    0 6px 24px rgba(245, 197, 43, 0.2),
    0 0 0 8px rgba(245, 197, 43, 0.08);
  transform: translateY(-2px) scale(1.01);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: #f5c52b !important;
  box-shadow: 0 4px 12px rgba(245, 197, 43, 0.2);
  z-index: 10;
  transition: all 0.3s ease;
}

.avatar-edit-btn:hover {
  box-shadow: 0 6px 16px rgba(245, 197, 43, 0.3);
  transform: scale(1.08);
}

.avatar-edit-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.avatar-edit-btn :deep(.v-icon) {
  color: #2c3e50 !important;
}

.profile-name {
  color: #2c3e50;
  word-break: break-word;
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.profile-email {
  color: #64748b;
  font-size: 1rem;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.6;
  font-weight: 500;
}

.edit-profile-btn {
  background: #f5c52b !important;
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.2);
  font-weight: 700;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0 20px !important;
  height: 40px !important;
  transition: all 0.3s ease;
}

.edit-profile-btn:hover {
  box-shadow: 0 4px 12px rgba(245, 197, 43, 0.3);
  transform: translateY(-1px);
}

.edit-profile-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.save-btn {
  background: #f5c52b !important;
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.2);
  font-weight: 700;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.save-btn:hover {
  box-shadow: 0 4px 12px rgba(245, 197, 43, 0.3);
  transform: translateY(-1px);
}

.save-btn :deep(.v-btn__content) {
  color: #2c3e50 !important;
}

.status-chip {
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.2px;
  padding: 0 12px !important;
  height: 30px !important;
  font-size: 0.85rem;
}

.meta-chip {
  font-weight: 600;
  letter-spacing: 0.2px;
  padding: 0 14px !important;
  height: 30px !important;
  font-size: 0.85rem;
}

.designation-chip {
  background: rgba(245, 197, 43, 0.12) !important;
  border-color: rgba(245, 197, 43, 0.55) !important;
}

.designation-chip :deep(.v-chip__content) {
  color: #705b00 !important;
  font-weight: 600;
}

.designation-chip :deep(.v-icon) {
  color: #705b00 !important;
}

.contributor-chip {
  background: #f8fafb !important;
  border-color: #cfd8dc !important;
}

.contributor-chip :deep(.v-chip__content) {
  color: #455a64 !important;
  font-weight: 600;
}

.contributor-chip :deep(.v-icon) {
  color: #455a64 !important;
}

.gap-2 {
  gap: 0.5rem;
}

/* Form field styling */
:deep(.v-text-field .v-field),
:deep(.v-textarea .v-field) {
  border-radius: 10px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  transition: all 0.3s ease;
}

:deep(.v-text-field .v-field:hover),
:deep(.v-textarea .v-field:hover) {
  background: #f5f5f5;
  border-color: #ddd;
}

:deep(.v-text-field .v-field--focused),
:deep(.v-textarea .v-field--focused) {
  background: white;
  border-color: #f5c52b !important;
  box-shadow: 0 0 0 3px rgba(245, 197, 43, 0.1);
}

:deep(.v-text-field .v-field__input),
:deep(.v-textarea .v-field__input) {
  color: #2c3e50;
  font-weight: 500;
}

:deep(.v-label) {
  color: #64748b;
  font-weight: 600;
}

/* Ensure proper spacing in cards */
:deep(.v-card-text) {
  padding: 28px !important;
}

/* Field info styling */
.v-col .mb-4 {
  background: linear-gradient(135deg, rgba(245, 197, 43, 0.03) 0%, transparent 100%);
  padding: 14px;
  border-radius: 10px;
  border-left: 3px solid #f5c52b;
  transition: all 0.3s ease;
}

.v-col .mb-4:hover {
  background: linear-gradient(135deg, rgba(245, 197, 43, 0.06) 0%, rgba(245, 197, 43, 0.02) 100%);
  transform: translateX(3px);
}

.v-col .mb-4 .text-caption {
  color: #f5c52b;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.8px;
  margin-bottom: 6px !important;
}

.v-col .mb-4 .text-body-1 {
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.95rem;
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

  .avatar-container {
    margin: 0 auto;
  }
}

@media (max-width: 600px) {
  .profile-avatar {
    width: 90px !important;
    height: 90px !important;
  }

  .avatar-edit-btn {
    bottom: 6px;
    right: 6px;
  }

  .profile-name {
    font-size: 1.3rem !important;
    text-align: center;
  }

  .profile-email {
    text-align: center;
  }

  :deep(.v-card-text) {
    padding: 16px !important;
  }

  .details-header {
    padding: 16px 20px !important;
  }

  .v-col .mb-4 {
    padding: 10px;
  }

  .profile-header-card {
    border-radius: 12px !important;
  }

  .profile-details-card {
    border-radius: 12px !important;
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
  max-width: 480px;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.notification-success {
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-left: 4px solid #22c55e;
}

.notification-error {
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-left: 4px solid #ef4444;
}

.notification-warning {
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-left: 4px solid #f59e0b;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #2c3e50;
  font-weight: 600;
}

.notification-close {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.notification-close:hover {
  opacity: 1;
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
    transform: translateY(-120%);
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
    transform: translateY(-120%);
    opacity: 0;
  }
}

@media (max-width: 600px) {
  .notification-card {
    right: 16px;
    left: 16px;
    min-width: auto;
  }

  .notification-content {
    padding: 14px 16px;
  }
}
</style>
