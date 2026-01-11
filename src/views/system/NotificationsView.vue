<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
} from '@/services/notificationsService.js'

const router = useRouter()

// Load notifications from service
const notifications = ref([])
const visibleCount = ref(10) // Show 10 notifications initially

const loadNotifications = () => {
  notifications.value = getNotifications()
}

// Show only limited notifications
const visibleNotifications = computed(() => {
  return notifications.value.slice(0, visibleCount.value)
})

// Check if there are more notifications to show
const hasMore = computed(() => {
  return notifications.value.length > visibleCount.value
})

// Show all notifications
const showMore = () => {
  visibleCount.value = notifications.value.length
}

const formatTimestamp = (timestamp) => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch (error) {
    return timestamp
  }
}

const handleAction = (notification, actionType) => {
  // Mark notification as read when user interacts with it
  if (!notification.isRead) {
    markAsRead(notification.id)
    notification.isRead = true
  }

  // Handle the action logic
  switch (actionType) {
    case 'view':
      // Navigate to project if projectId exists
      if (notification.projectId && notification.projectType) {
        // Determine route based on project status
        // For now, navigate to project view
        router.push(`/project/${notification.projectId}?type=${notification.projectType}`)
      }
      break
    case 'accept':
      // Handle accept action
      console.log('Accept action for notification:', notification.id)
      break
    case 'reject':
      // Handle reject action
      console.log('Reject action for notification:', notification.id)
      break
    default:
      console.log('Unknown action type:', actionType)
  }
}

const handleDelete = (notificationId) => {
  if (confirm('Are you sure you want to delete this notification?')) {
    deleteNotification(notificationId)
    loadNotifications()
  }
}

const handleMarkAllRead = () => {
  markAllAsRead()
  loadNotifications()
}

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.isRead).length
})

onMounted(() => {
  loadNotifications()
})
</script>

<template>
  <v-app class="notifications-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container class="notifications-container">
        <div class="notifications-header">
          <div class="header-content">
            <h1 class="page-title">Notifications</h1>
            <div class="header-actions">
              <v-chip v-if="unreadCount > 0" color="error" size="small" class="unread-chip">
                <v-icon start size="16">mdi-circle</v-icon>
                {{ unreadCount }} unread
              </v-chip>
              <v-btn
                v-if="unreadCount > 0"
                variant="outlined"
                size="small"
                @click="handleMarkAllRead"
                class="mark-read-btn"
                prepend-icon="mdi-check-all"
              >
                Mark all as read
              </v-btn>
            </div>
          </div>
        </div>

        <div class="notifications-content">
          <div v-if="notifications.length === 0" class="no-notifications">
            <v-icon size="80" color="grey-lighten-1">mdi-bell-off-outline</v-icon>
            <h3 class="no-notifications-title">No notifications yet</h3>
            <p class="no-notifications-text">When you receive notifications, they'll appear here</p>
          </div>

          <div v-else class="notifications-list">
            <div
              v-for="notification in visibleNotifications"
              :key="notification.id"
              class="notification-item"
              :class="{ unread: !notification.isRead }"
            >
              <div class="notification-indicator" v-if="!notification.isRead"></div>

              <div class="notification-main">
                <div class="notification-header-row">
                  <div
                    class="notification-type-badge"
                    :style="{ backgroundColor: notification.typeColor }"
                  >
                    {{ notification.type }}
                  </div>
                  <div class="notification-time">
                    <v-icon size="14" class="time-icon">mdi-clock-outline</v-icon>
                    {{ formatTimestamp(notification.timestamp) }}
                  </div>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    @click="handleDelete(notification.id)"
                    class="delete-btn"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </div>

                <div class="notification-body-content">
                  <h3 class="notification-title">{{ notification.title }}</h3>
                  <p class="notification-description">{{ notification.description }}</p>
                </div>

                <div class="notification-footer">
                  <div class="notification-actions">
                    <v-btn
                      v-for="action in notification.actions"
                      :key="action.label"
                      class="action-btn"
                      :class="action.type"
                      :style="{ borderColor: action.color, color: action.color }"
                      variant="outlined"
                      size="small"
                      @click="handleAction(notification, action.type)"
                    >
                      {{ action.label }}
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>

            <!-- See More Button -->
            <div v-if="hasMore" class="see-more-container">
              <v-btn
                @click="showMore"
                variant="outlined"
                size="large"
                class="see-more-btn"
                prepend-icon="mdi-chevron-down"
              >
                See All Notifications
              </v-btn>
            </div>
          </div>
        </div>
      </v-container>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0;
  background-color: #f8fafc;
}

.notifications-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

.notifications-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  color: #353535;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unread-chip {
  font-weight: 600;
}

.mark-read-btn {
  border-color: #353535;
  color: #353535;
  font-weight: 600;
}

.notifications-content {
  background: transparent;
}

.no-notifications {
  text-align: center;
  padding: 80px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.no-notifications-title {
  margin-top: 24px;
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.no-notifications-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-item {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1px solid #f3f4f6;
}

.notification-item:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
  border-color: #e5e7eb;
}

.notification-item.unread {
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
  border-left: 4px solid #3b82f6;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.15);
}

.notification-item.unread .notification-indicator {
  display: block;
}

.notification-indicator {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #3b82f6;
}

.notification-main {
  padding: 24px;
}

.notification-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.notification-type-badge {
  padding: 6px 14px;
  border-radius: 20px;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.notification-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  margin-left: auto;
  padding: 4px 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.time-icon {
  color: #9ca3af;
}

.delete-btn {
  opacity: 0.5;
  transition: all 0.2s ease;
  color: #6b7280;
}

.delete-btn:hover {
  opacity: 1;
  color: #ef4444 !important;
  background-color: #fee2e2 !important;
  transform: scale(1.1);
}

.notification-body-content {
  margin-bottom: 18px;
}

.notification-title {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 10px 0;
  line-height: 1.5;
}

.notification-description {
  font-size: 14px;
  color: #4b5563;
  margin: 0;
  line-height: 1.7;
}

.notification-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.notification-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 20px;
  border: 2px solid;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: none;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  background-color: currentColor;
  color: white !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn.accept {
  border-color: #10b981;
  color: #10b981;
}

.action-btn.accept:hover {
  background-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.action-btn.reject {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.reject:hover {
  background-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.action-btn.view {
  border-color: #3b82f6;
  color: #3b82f6;
}

.action-btn.view:hover {
  background-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* See More Button */
.see-more-container {
  display: flex;
  justify-content: center;
  padding: 32px 0 8px 0;
}

.see-more-btn {
  border: 2px solid #353535;
  color: #353535;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  border-radius: 10px;
  padding: 14px 40px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.see-more-btn .v-btn__content) {
  justify-content: center;
}

.see-more-btn:hover {
  background-color: #353535;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

/* Responsive design */
@media (max-width: 768px) {
  .notifications-container {
    padding: 24px 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .notification-main {
    padding: 16px;
  }

  .notification-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .notification-time {
    margin-left: 0;
  }

  .notification-footer {
    justify-content: flex-start;
  }

  .notification-actions {
    width: 100%;
  }

  .action-btn {
    flex: 1;
    min-width: 100px;
  }
}

@media (max-width: 480px) {
  .notifications-container {
    padding: 16px 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .notification-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
