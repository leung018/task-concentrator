import { createBootstrap } from 'bootstrap-vue-next'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

import { createApp } from 'vue'
import NewApp from './NewApp.vue'

const app = createApp(NewApp)
app.use(createBootstrap())
app.mount('#app')
