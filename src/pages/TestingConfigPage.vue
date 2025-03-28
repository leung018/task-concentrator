<script setup lang="ts">
import { PomodoroTimerConfig } from '../domain/pomodoro/config'
import { PomodoroTimerConfigStorageService } from '../domain/pomodoro/config/storage'
import { defineProps, onBeforeMount, ref } from 'vue'
import { Duration } from '../domain/pomodoro/duration'

const { timerConfigStorageService } = defineProps<{
  timerConfigStorageService: PomodoroTimerConfigStorageService
}>()

const focusDurationSeconds = ref(0)
const shortBreakDurationSeconds = ref(0)
const longBreakDurationSeconds = ref(0)
const numOfPomodoriPerCycle = ref(0)

onBeforeMount(async () => {
  const timerConfig = await timerConfigStorageService.get()

  focusDurationSeconds.value = timerConfig.focusDuration.remainingSeconds()
  shortBreakDurationSeconds.value = timerConfig.shortBreakDuration.remainingSeconds()
  longBreakDurationSeconds.value = timerConfig.longBreakDuration.remainingSeconds()
  numOfPomodoriPerCycle.value = timerConfig.numOfPomodoriPerCycle
})

const onClickSave = async () => {
  const timerConfig = new PomodoroTimerConfig({
    focusDuration: new Duration({ seconds: focusDurationSeconds.value }),
    shortBreakDuration: new Duration({ seconds: shortBreakDurationSeconds.value }),
    longBreakDuration: new Duration({ seconds: longBreakDurationSeconds.value }),
    numOfPomodoriPerCycle: numOfPomodoriPerCycle.value
  })
  await timerConfigStorageService.save(timerConfig)
}
</script>

<template>
  <div class="container">
    <h1 class="mt-5 mb-4">
      Warning: For development testing only. If you accidentally navigate to this page, please close
      this tab
    </h1>
    <form>
      <b-form-group label="Focus Duration (seconds)">
        <b-form-input
          type="number"
          min="1"
          data-test="focus-duration"
          v-model.number="focusDurationSeconds"
        ></b-form-input>
      </b-form-group>
      <b-form-group label="Short Break Duration (seconds)">
        <b-form-input
          type="number"
          min="1"
          data-test="short-break-duration"
          v-model.number="shortBreakDurationSeconds"
        ></b-form-input>
      </b-form-group>
      <b-form-group label="Long Break Duration (seconds)">
        <b-form-input
          type="number"
          min="1"
          data-test="long-break-duration"
          v-model.number="longBreakDurationSeconds"
        ></b-form-input>
      </b-form-group>
      <b-form-group label="Number of Pomodori Per Cycle">
        <b-form-input
          type="number"
          min="1"
          data-test="num-of-pomodori-per-cycle"
          v-model.number="numOfPomodoriPerCycle"
        ></b-form-input>
      </b-form-group>
      <div class="mt-4">
        <b-button
          variant="danger"
          type="button"
          class="me-2"
          data-test="save-button"
          @click="onClickSave"
        >
          Save
        </b-button>
      </div>
    </form>
  </div>
</template>
