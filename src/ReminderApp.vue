<script setup lang="ts">
import { ChromeCommunicationManager } from './chrome/communication'
import { DailyResetTimeStorageService } from './domain/daily_reset_time/storage'
import ReminderPage from './pages/ReminderPage.vue'
import { FocusSessionRecordStorageService } from './domain/pomodoro/record/storage'
import { SoundService } from './chrome/sound'
</script>

<template>
  <ReminderPage
    :focusSessionRecordStorageService="FocusSessionRecordStorageService.create()"
    :dailyResetTimeStorageService="DailyResetTimeStorageService.create()"
    :port="new ChromeCommunicationManager().clientConnect()"
    :soundService="new SoundService()"
    :currentDate="new Date()"
  />
</template>
