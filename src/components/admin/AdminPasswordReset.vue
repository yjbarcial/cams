<script setup>
import { ref } from 'vue'

const userEmail = ref('')
const showInstructions = ref(false)

function showResetInstructions() {
  if (!userEmail.value || !userEmail.value.trim()) {
    alert('Please enter user email address')
    return
  }

  if (!userEmail.value.endsWith('@carsu.edu.ph')) {
    alert('Must be a CARSU email address')
    return
  }

  showInstructions.value = true
}

function reset() {
  userEmail.value = ''
  showInstructions.value = false
}

function openSupabaseDashboard() {
  window.open('https://supabase.com/dashboard', '_blank')
}
</script>

<template>
  <v-card class="pa-4">
    <v-card-title class="text-h5 mb-4">
      <v-icon color="primary" class="mr-2">mdi-lock-reset</v-icon>
      User Password Reset
    </v-card-title>

    <v-card-subtitle class="mb-4">
      Simple password reset for users who forgot their credentials.
    </v-card-subtitle>

    <v-form v-if="!showInstructions" @submit.prevent="showResetInstructions">
      <v-text-field
        v-model="userEmail"
        label="User Email Address"
        placeholder="user@carsu.edu.ph"
        prepend-inner-icon="mdi-email"
        variant="outlined"
        hint="Enter the email of the user who forgot their password"
        persistent-hint
        class="mb-4"
        required
      />

      <v-btn type="submit" color="primary" block size="large" :disabled="!userEmail">
        Show Reset Instructions
      </v-btn>
    </v-form>

    <!-- Step-by-step instructions -->
    <v-card v-if="showInstructions" variant="tonal" color="primary" class="pa-4">
      <div class="text-h6 mb-3">
        <v-icon class="mr-2">mdi-information</v-icon>
        Password Reset for: <strong>{{ userEmail }}</strong>
      </div>

      <v-divider class="my-3"></v-divider>

      <div class="text-subtitle-1 font-weight-bold mb-3">Follow these steps:</div>

      <v-timeline density="compact" side="end" class="mb-4">
        <v-timeline-item dot-color="primary" size="small">
          <div class="d-flex flex-column">
            <strong>Step 1: Open Supabase Dashboard</strong>
            <span class="text-body-2 mt-1">
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                @click="openSupabaseDashboard"
                class="mt-2"
              >
                <v-icon start size="small">mdi-open-in-new</v-icon>
                Open Supabase Dashboard
              </v-btn>
            </span>
          </div>
        </v-timeline-item>

        <v-timeline-item dot-color="primary" size="small">
          <div>
            <strong>Step 2: Navigate to Users</strong>
            <div class="text-body-2 mt-1">
              Go to <strong>Authentication</strong> → <strong>Users</strong>
            </div>
          </div>
        </v-timeline-item>

        <v-timeline-item dot-color="primary" size="small">
          <div>
            <strong>Step 3: Find User</strong>
            <div class="text-body-2 mt-1">
              Search for: <code class="px-2 py-1 bg-grey-lighten-3 rounded">{{ userEmail }}</code>
            </div>
          </div>
        </v-timeline-item>

        <v-timeline-item dot-color="primary" size="small">
          <div>
            <strong>Step 4: Click on User</strong>
            <div class="text-body-2 mt-1">Click on the user's row to open their details</div>
          </div>
        </v-timeline-item>

        <v-timeline-item dot-color="success" size="small">
          <div>
            <strong>Step 5: Send Password Recovery Email</strong>
            <div class="text-body-2 mt-1">
              Look for <strong>"Send password recovery"</strong> or
              <strong>"Reset password"</strong> button and click it
            </div>
          </div>
        </v-timeline-item>

        <v-timeline-item dot-color="info" size="small">
          <div>
            <strong>Step 6: Tell User to Check Email</strong>
            <div class="text-body-2 mt-1">
              User checks their email, clicks the reset link, and sets a new password
            </div>
          </div>
        </v-timeline-item>
      </v-timeline>

      <v-alert type="success" density="compact" variant="tonal" class="my-3">
        <strong>✅ Safe Method:</strong> This preserves all user data! Their projects, comments, and
        work remain intact.
      </v-alert>

      <v-alert type="error" density="compact" variant="tonal" class="my-3">
        <div class="text-subtitle-2 mb-2">
          <strong>⚠️ Email Not Configured</strong>
        </div>
        <div class="text-body-2 mb-2">
          The "Send password recovery" option will fail because Gmail SMTP is not set up yet.
        </div>
        <div class="text-body-2 font-weight-bold mb-2">Setup Gmail SMTP (one-time setup):</div>
        <div class="text-caption mb-2">
          <strong>Part 1: Get Gmail App Password</strong>
        </div>
        <ol class="text-body-2 mt-1 pl-4 mb-3">
          <li>Go to Gmail account (use CAMS Gmail)</li>
          <li>
            Enable 2-Step Verification:
            <a href="https://myaccount.google.com/security" target="_blank"
              >myaccount.google.com/security</a
            >
          </li>
          <li>
            Create App Password:
            <a href="https://myaccount.google.com/apppasswords" target="_blank"
              >myaccount.google.com/apppasswords</a
            >
          </li>
          <li>Select "Mail" → "Other (Custom)" → Type "Supabase CAMS"</li>
          <li>Copy the 16-character password (xxxx xxxx xxxx xxxx)</li>
        </ol>
        <div class="text-caption mb-2">
          <strong>Part 2: Configure Supabase SMTP</strong>
        </div>
        <ol class="text-body-2 mt-1 pl-4 mb-3">
          <li>
            Go to <strong>Project Settings</strong> → <strong>Authentication</strong> →
            <strong>SMTP Settings</strong>
          </li>
          <li>Enable Custom SMTP (toggle on)</li>
          <li>
            Fill in:
            <ul class="text-caption mt-1 ml-2">
              <li>Host: <code>smtp.gmail.com</code></li>
              <li>Port: <code>587</code></li>
              <li>Username: your-cams-email@gmail.com</li>
              <li>Password: [paste 16-char App Password]</li>
              <li>Sender: your-cams-email@gmail.com</li>
            </ul>
          </li>
          <li>Click <strong>Save</strong></li>
        </ol>
        <div class="text-caption mb-2">
          <strong>Part 3: Configure URL Settings (Important!)</strong>
        </div>
        <ol class="text-body-2 mt-1 pl-4">
          <li>Go to <strong>Authentication</strong> → <strong>URL Configuration</strong></li>
          <li>Set <strong>Site URL</strong> to: <code>http://localhost:5173</code></li>
          <li>Add <strong>Redirect URLs</strong>: <code>http://localhost:5173/**</code></li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </v-alert>

      <v-expansion-panels variant="accordion" class="mb-3">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="text-subtitle-2">
              <v-icon class="mr-2" size="small">mdi-tools</v-icon>
              <strong>Alternative: Manual Password Update (No Email Required)</strong>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="text-body-2 mb-3">
              Since email is not working, you can manually update the password using SQL:
            </div>

            <v-alert type="info" density="compact" class="mb-3">
              <strong>Steps:</strong>
            </v-alert>

            <ol class="text-body-2 pl-4">
              <li class="mb-2">Go to <strong>SQL Editor</strong> in Supabase Dashboard</li>
              <li class="mb-2">Ask the user for their new desired password</li>
              <li class="mb-2">
                Run this SQL command (replace with actual password):
                <pre
                  class="mt-2 pa-2 bg-grey-lighten-4 rounded text-caption"
                  style="overflow-x: auto"
                >
UPDATE auth.users
SET encrypted_password = crypt('NEW_PASSWORD_HERE', gen_salt('bf'))
WHERE email = '{{ userEmail }}';</pre
                >
              </li>
              <li class="mb-2">Tell the user they can now login with their new password</li>
            </ol>

            <v-alert type="warning" density="compact" class="mt-3">
              <strong>Security Note:</strong> This requires the user to tell you their desired
              password. Use a secure channel (not email/chat). Consider using a temporary password
              and asking them to change it after login.
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-btn color="primary" variant="outlined" @click="reset" block class="mt-3">
        <v-icon start>mdi-arrow-left</v-icon>
        Reset Another User
      </v-btn>
    </v-card>

    <!-- General info card -->
    <v-card variant="outlined" class="pa-3 mt-4" v-if="!showInstructions">
      <div class="text-subtitle-2 font-weight-bold mb-2">
        <v-icon size="small" class="mr-1">mdi-help-circle</v-icon>
        How Password Reset Works:
      </div>
      <ol class="text-body-2 pl-4">
        <li class="mb-1">User contacts you (admin) and says they forgot password</li>
        <li class="mb-1">You enter their email here</li>
        <li class="mb-1">Follow the step-by-step instructions shown</li>
        <li class="mb-1">Use "Send password recovery" in Supabase Dashboard</li>
        <li>User clicks email link and sets new password</li>
      </ol>

      <v-divider class="my-3"></v-divider>

      <div class="text-body-2">
        <strong>✅ This method is safe</strong> and preserves all user data including their
        projects, comments, and tasks.
      </div>
    </v-card>
  </v-card>
</template>

<style scoped>
ol {
  line-height: 1.8;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>
