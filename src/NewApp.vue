<script setup lang="ts">
import WeeklySchedulesPage from './pages/WeeklySchedulesPage/index.vue'
import { WeeklyScheduleStorageService } from './domain/schedules/storage'
import BlockedDomainsPage from './pages/BlockedDomainsPage.vue'
import { computed, onMounted, ref, type Component } from 'vue'
import { BrowsingRulesStorageService } from './domain/browsing_rules/storage'
import { ChromeCommunicationManager } from './chrome/communication'

const port = new ChromeCommunicationManager().clientConnect()

enum PATH {
  ROOT = '/',
  BLOCKED_DOMAINS = '/blocked-domains'
}

type Route = {
  component: Component
  props: object
  title: string
}

const routeMap: Record<PATH, Route> = {
  [PATH.ROOT]: {
    title: 'Schedules',
    component: WeeklySchedulesPage,
    props: {
      weeklyScheduleStorageService: WeeklyScheduleStorageService.create(),
      port
    }
  },
  [PATH.BLOCKED_DOMAINS]: {
    title: 'Blocked Domains',
    component: BlockedDomainsPage,
    props: {
      browsingRulesStorageService: BrowsingRulesStorageService.create(),
      port
    }
  }
}

const currentPath = ref<PATH>(PATH.ROOT)

onMounted(() => {
  currentPath.value = getPathFromWindowLocation()
})

window.addEventListener('hashchange', () => {
  currentPath.value = getPathFromWindowLocation()
})

function getPathFromWindowLocation(): PATH {
  const path = window.location.hash.slice(1)
  return Object.values(PATH).includes(path as PATH) ? (path as PATH) : PATH.ROOT
}

const currentView = computed(() => {
  return routeMap[currentPath.value]
})
</script>

<template>
  <main>
    <nav class="navbar navbar-expand navbar-light bg-light">
      <span class="navbar-brand ms-2">Options</span>
      <ul class="navbar-nav">
        <li v-for="path in Object.values(PATH)" :key="path" class="nav-item">
          <a class="nav-link" :href="`#${path}`" :class="{ active: path === currentPath }">
            {{ routeMap[path].title }}
          </a>
        </li>
      </ul>
    </nav>
    <component :is="currentView.component" v-bind="currentView.props" />
  </main>
</template>
