import '@mdi/font/css/materialdesignicons.css' // ✅ Add this line
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vuetify imports FIRST
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import router from './router'

// Create Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
})

// Create app
const app = createApp(App)

// Register plugins BEFORE mounting
app.use(createPinia())
app.use(router)
app.use(vuetify)

// Mount app LAST
app.mount('#app')

// Set favicon to bundled GoldQuill logo (works in dev/prod)
const setFavicon = () => {
  try {
    const link = document.querySelector("link[rel='icon']") || document.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('type', 'image/png')
    // Use import.meta.url to resolve asset correctly after build
    const logoUrl = new URL('./assets/images/GoldQuill Logo.png', import.meta.url).href
    link.setAttribute('href', logoUrl)
    if (!link.parentNode) {
      document.head.appendChild(link)
    }
  } catch (e) {
    // no-op fallback to existing favicon
  }
}

setFavicon()
