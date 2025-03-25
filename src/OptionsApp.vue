<script setup lang="ts">
import WeeklySchedulesPage from './pages/WeeklySchedulesPage/index.vue'
import { WeeklyScheduleStorageService } from './domain/schedules/storage'
import BlockedDomainsPage from './pages/BlockedDomainsPage.vue'
import StatisticsPage from './pages/StatisticsPage.vue'
import { computed, onMounted, ref, type Component } from 'vue'
import { BrowsingRulesStorageService } from './domain/browsing_rules/storage'
import { ChromeCommunicationManager } from './chrome/communication'
import { DailyResetTimeStorageService } from './domain/daily_reset_time/storage'
import { ReloadService } from './chrome/reload'
import { PomodoroRecordStorageService } from './domain/pomodoro/record/storage'
import SoundOptions from './components/SoundOptions.vue'

const port = new ChromeCommunicationManager().clientConnect()

enum PATH {
  ROOT = '/',
  SCHEDULES = '/schedules',
  STATISTICS = '/statistics'
}

type Route = {
  component: Component
  props: object
  title: string
}

const routeMap: Record<PATH, Route> = {
  [PATH.ROOT]: {
    title: 'Blocked Domains',
    component: BlockedDomainsPage,
    props: {
      browsingRulesStorageService: BrowsingRulesStorageService.create(),
      port
    }
  },
  [PATH.SCHEDULES]: {
    title: 'Schedules',
    component: WeeklySchedulesPage,
    props: {
      weeklyScheduleStorageService: WeeklyScheduleStorageService.create(),
      port
    }
  },
  [PATH.STATISTICS]: {
    title: 'Statistics',
    component: StatisticsPage,
    props: {
      dailyResetTimeStorageService: DailyResetTimeStorageService.create(),
      reloadService: new ReloadService(),
      getCurrentDate: () => new Date(),
      pomodoroRecordStorageService: PomodoroRecordStorageService.create(),
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
  <div class="options-container">
    <h1>Task Concentrator Options</h1>
    <BNav tabs class="mt-2 ms-2" align="center">
      <BNavItem
        v-for="path in Object.values(PATH)"
        :key="path"
        :href="`#${path}`"
        :active="path === currentPath"
      >
        {{ routeMap[path].title }}
      </BNavItem>
    </BNav>
    <component :is="currentView.component" v-bind="currentView.props" />
    <SoundOptions />
  </div>
</template>
