import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
})

app.use(vuetify)

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
