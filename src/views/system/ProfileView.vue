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

// Edit form data
const editForm = ref({
  first_name: '',
  last_name: '',
  bio: '',
  phone: '',
})

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
      }
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

// Save profile changes
async function saveProfile() {
  saving.value = true
  error.value = null

  try {
    const updated = await profilesService.update(profile.value.id, {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      bio: editForm.value.bio,
      phone: editForm.value.phone,
    })

    profile.value = updated
    editMode.value = false
  } catch (err) {
    console.error('Error saving profile:', err)
    error.value = 'Failed to save profile'
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editMode.value = false
  // Reset form
  editForm.value = {
    first_name: profile.value.first_name || '',
    last_name: profile.value.last_name || '',
    bio: profile.value.bio || '',
    phone: profile.value.phone || '',
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

    <v-container class="py-8 flex-grow-1">
      <v-row justify="center">
        <v-col cols="12" md="10" lg="8">
          <!-- Loading State -->
          <v-card v-if="loading" class="pa-8 text-center">
            <v-progress-circular indeterminate color="primary" />
            <p class="mt-4 text-body-2">Loading profile...</p>
          </v-card>

          <!-- Error State -->
          <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
            {{ error }}
          </v-alert>

          <!-- Profile Content -->
          <div v-else-if="profile">
            <!-- Profile Header Card -->
            <v-card class="mb-4">
              <v-card-text class="pa-6">
                <div class="d-flex align-start gap-4">
                  <!-- Avatar -->
                  <v-avatar
                    :color="profile.avatar_url ? 'transparent' : 'primary'"
                    size="100"
                    class="profile-avatar"
                  >
                    <v-img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="fullName" />
                    <span v-else class="text-h4 font-weight-bold">{{ initials }}</span>
                  </v-avatar>

                  <!-- Profile Info -->
                  <div class="flex-grow-1">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <h1 class="text-h4 font-weight-bold">{{ fullName }}</h1>
                      <v-btn
                        v-if="!editMode"
                        color="primary"
                        variant="outlined"
                        prepend-icon="mdi-pencil"
                        @click="editMode = true"
                      >
                        Edit Profile
                      </v-btn>
                    </div>

                    <p class="text-body-1 text-medium-emphasis mb-3">{{ profile.email }}</p>

                    <div class="d-flex gap-2 flex-wrap">
                      <v-chip :color="statusColor" size="small" variant="flat">
                        <v-icon start size="small">mdi-circle</v-icon>
                        {{ profile.status || 'Active' }}
                      </v-chip>

                      <v-chip color="primary" size="small" variant="tonal">
                        <v-icon start size="small">mdi-shield-account</v-icon>
                        {{ roleLabel }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Profile Details Card -->
            <v-card>
              <v-card-title class="d-flex align-center bg-grey-lighten-4">
                <v-icon start>mdi-account-details</v-icon>
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
                    <v-btn variant="text" @click="cancelEdit" :disabled="saving"> Cancel </v-btn>
                    <v-btn
                      type="submit"
                      color="primary"
                      variant="flat"
                      :loading="saving"
                      prepend-icon="mdi-content-save"
                    >
                      Save Changes
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
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.profile-avatar {
  border: 3px solid #f5c52b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gap-4 {
  gap: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .d-flex.align-start {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

@media (max-width: 600px) {
  .profile-avatar {
    width: 80px !important;
    height: 80px !important;
  }
}
</style>
