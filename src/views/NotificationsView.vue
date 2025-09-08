<script setup>
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

// Sample notifications data
const notifications = [
  {
    id: 1,
    type: 'Request',
    typeColor: '#3b82f6', // blue
    title: 'Submission: "Creative Writeups"',
    description: 'Technical Editor has requested to edit your content.',
    timestamp: '21 Jul 2025 at 9:30 AM',
    isRead: false,
    actions: [
      { label: 'Accept', type: 'accept', color: '#10b981' },
      { label: 'Reject', type: 'reject', color: '#ef4444' },
    ],
  },
  {
    id: 2,
    type: 'Comment',
    typeColor: '#ec4899', // magenta
    title: 'Submission: "Creative Writeups"',
    description: 'Section Head posted a comment.',
    timestamp: '21 Jul 2025 at 9:30 AM',
    isRead: true,
    actions: [{ label: 'View', type: 'view', color: '#3b82f6' }],
  },
  {
    id: 3,
    type: 'Approved',
    typeColor: '#10b981', // green
    title: 'Submission: "Creative Writeups"',
    description: 'Writer has accepted your request to edit.',
    timestamp: '21 Jul 2025 at 9:30 AM',
    isRead: false,
    actions: [{ label: 'View', type: 'view', color: '#3b82f6' }],
  },
  {
    id: 4,
    type: 'Approved',
    typeColor: '#10b981', // green
    title: 'Submission: "Creative Writeups"',
    description: 'The Editor-in-Chief has approved the content for publication.',
    timestamp: '21 Jul 2025 at 9:30 AM',
    isRead: true,
    actions: [{ label: 'View', type: 'view', color: '#3b82f6' }],
  },
]

const handleAction = (notificationId, actionType) => {
  console.log(`Action ${actionType} for notification ${notificationId}`)
  // Mark notification as read when user interacts with it
  const notification = notifications.find((n) => n.id === notificationId)
  if (notification) {
    notification.isRead = true
  }
  // Handle the action logic here
}
</script>

<template>
  <div class="notifications-page">
    <MainHeader />

    <main class="main-content">
      <div class="notifications-container">
        <h1 class="notifications-title">Notifications</h1>

        <div class="notifications-list">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.isRead }"
          >
            <div class="notification-content">
              <div class="notification-header">
                <span
                  class="notification-type"
                  :style="{ backgroundColor: notification.typeColor }"
                >
                  {{ notification.type }}
                  <span class="notification-dot" v-if="!notification.isRead"></span>
                </span>
              </div>

              <div class="notification-body">
                <h3 class="notification-title">{{ notification.title }}</h3>
                <p class="notification-description">{{ notification.description }}</p>
              </div>
            </div>

            <div class="notification-meta">
              <div class="timestamp">
                <span class="mdi mdi-clock-outline"></span>
                <span>{{ notification.timestamp }}</span>
              </div>

              <div class="notification-actions">
                <button
                  v-for="action in notification.actions"
                  :key="action.label"
                  class="action-btn"
                  :class="action.type"
                  :style="{ borderColor: action.color, color: action.color }"
                  @click="handleAction(notification.id, action.type)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.main-content {
  flex: 1;
  padding: 40px 20px;
}

.notifications-container {
  width: 100%;
}

.notifications-title {
  font-size: 28px;
  font-weight: 700;
  color: #2f2f2f;
  margin: 0 0 32px 0;
}

.notifications-list {
  margin-bottom: 32px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
  transition: background-color 0.2s ease;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.unread {
  background-color: #f8fafc;
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  margin-left: -16px;
  border-radius: 0 8px 8px 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  margin-bottom: 8px;
}

.notification-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notification-dot {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  margin-left: 4px;
}

.notification-body {
  margin-bottom: 12px;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #2f2f2f;
  margin: 0 0 4px 0;
}

.notification-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.notification-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.timestamp .mdi {
  font-size: 14px;
}

.notification-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border: 2px solid;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: currentColor;
  color: white;
}

.action-btn.accept {
  border-color: #10b981;
  color: #10b981;
}

.action-btn.reject {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.view {
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Responsive design */
@media (max-width: 768px) {
  .main-content {
    padding: 20px 12px;
  }

  .notification-item {
    flex-direction: column;
    gap: 12px;
  }

  .notification-meta {
    align-items: flex-start;
    width: 100%;
  }

  .notification-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .notifications-title {
    font-size: 24px;
    margin-bottom: 24px;
  }

  .notification-item {
    padding: 16px 0;
  }

  .notification-item.unread {
    padding-left: 12px;
    margin-left: -12px;
  }
}

@media (max-width: 480px) {
  .notification-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
