<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { TimerConfig } from '../domain/pomodoro/config'
import { Duration } from '../domain/pomodoro/duration'
import ContentTemplate from './components/ContentTemplate.vue'
import { TimerConfigStorageService } from '../domain/pomodoro/config/storage'
import type { Port } from '../infra/communication'
import { WorkRequestName, type WorkRequest } from '../service_workers/request'
import type { WorkResponse } from '../service_workers/response'
import type { ActionService } from '@/infra/action'

const { timerConfigStorageService, port, reloadService } = defineProps<{
  port: Port<WorkRequest, WorkResponse>
  timerConfigStorageService: TimerConfigStorageService
  reloadService: ActionService
}>()

const focusDurationMinutes = ref(25)
const shortBreakDurationMinutes = ref(5)
const longBreakDurationMinutes = ref(15)
const focusSessionsPerCycle = ref(4)
const performCycle = ref(false)

function durationToMinutes(d: Duration): number {
  return Math.floor(d.remainingSeconds() / 60)
}

onBeforeMount(async () => {
  const timerConfig = await timerConfigStorageService.get()
  focusDurationMinutes.value = durationToMinutes(timerConfig.focusDuration)
  shortBreakDurationMinutes.value = durationToMinutes(timerConfig.shortBreakDuration)
  longBreakDurationMinutes.value = durationToMinutes(timerConfig.longBreakDuration)
  focusSessionsPerCycle.value = timerConfig.focusSessionsPerCycle

  performCycle.value = timerConfig.focusSessionsPerCycle > 1
})

const onClickSave = async () => {
  const originalConfig = await timerConfigStorageService.get()

  const config = new TimerConfig({
    focusDuration: new Duration({ minutes: focusDurationMinutes.value }),
    shortBreakDuration: performCycle.value
      ? new Duration({ minutes: shortBreakDurationMinutes.value })
      : originalConfig.shortBreakDuration,
    longBreakDuration: new Duration({ minutes: longBreakDurationMinutes.value }),
    focusSessionsPerCycle: performCycle.value ? focusSessionsPerCycle.value : 1
  })

  await timerConfigStorageService.save(config)

  port.send({
    name: WorkRequestName.RESET_TIMER_CONFIG
  })

  reloadService.trigger()
}
</script>

<template>
  <ContentTemplate title="Timer Setting">
    <b-form @submit.prevent>
      <b-form-group label="Focus Session Duration (minutes)" class="mb-3">
        <b-form-input
          v-model.number="focusDurationMinutes"
          type="number"
          min="1"
          required
          data-test="focus-duration"
        ></b-form-input>
      </b-form-group>
      <b-form-checkbox
        id="performCycle"
        v-model="performCycle"
        class="mb-3"
        data-test="perform-cycle"
      >
        Perform Cycle
      </b-form-checkbox>
      <p v-if="!performCycle" class="small">
        If disabled, the timer will switch between focus sessions and break
      </p>
      <p v-if="performCycle" class="small">
        If enabled, the timer will repeat a set number of focus sessions, each followed by a short
        break. After completing the cycle, a long break will occur
      </p>
      <div v-show="performCycle">
        <b-form-group label="Short Break Duration (minutes)" class="mb-3">
          <b-form-input
            v-model.number="shortBreakDurationMinutes"
            type="number"
            min="1"
            required
            data-test="short-break-duration"
          ></b-form-input>
        </b-form-group>
        <b-form-group label="Focus Sessions Per Cycle" class="mb-3">
          <b-form-input
            v-model.number="focusSessionsPerCycle"
            type="number"
            min="2"
            required
            data-test="focus-sessions-per-cycle"
          ></b-form-input>
        </b-form-group>
      </div>
      <b-form-group
        :label="performCycle ? 'Long Break Duration (minutes)' : 'Break Duration (minutes)'"
        class="mb-3"
      >
        <b-form-input
          v-model.number="longBreakDurationMinutes"
          type="number"
          min="1"
          required
          data-test="long-break-duration"
        ></b-form-input>
      </b-form-group>
      <b-button type="submit" variant="primary" data-test="save-button" @click="onClickSave"
        >Save</b-button
      >
      <p class="small mt-2"><b>* Caution: After saving, the timer will be reset</b></p>
    </b-form>
  </ContentTemplate>
</template>
