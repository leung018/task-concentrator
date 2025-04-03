<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { Weekday, WeeklySchedule } from '../../domain/schedules'
import type { WeeklyScheduleStorageService } from '../../domain/schedules/storage'
import { Time } from '../../domain/time'
import TimeInput from '../components/TimeInput.vue'
import WeekdaysSelector from './WeekdaysSelector.vue'
import SchedulesList from './SchedulesList.vue'
import { WorkRequestName } from '../../service_workers/request'
import type { Port } from '../../infra/communication'
import ContentTemplate from '../components/ContentTemplate.vue'

const { weeklyScheduleStorageService, port } = defineProps<{
  weeklyScheduleStorageService: WeeklyScheduleStorageService
  port: Port
}>()

const newStartTime = ref<Time>(new Time(0, 0))
const newEndTime = ref<Time>(new Time(0, 0))

const newWeekdaySet = ref<Set<Weekday>>(new Set())

const weeklySchedules = ref<WeeklySchedule[]>([])

const errorMessage = ref<string | null>(null)

const showSaved = computed(() => weeklySchedules.value.length > 0)

onBeforeMount(async () => {
  weeklySchedules.value = await weeklyScheduleStorageService.getAll()
})

const onClickAdd = async () => {
  if (newWeekdaySet.value.size === 0) {
    errorMessage.value = 'Please select weekdays'
    return
  }
  if (!newStartTime.value.isBefore(newEndTime.value)) {
    errorMessage.value = 'Start time must be before end time'
    return
  }

  const newWeeklySchedule = new WeeklySchedule({
    weekdaySet: newWeekdaySet.value,
    startTime: newStartTime.value,
    endTime: newEndTime.value
  })
  await updateWeeklySchedules([...weeklySchedules.value, newWeeklySchedule])

  errorMessage.value = null
  newStartTime.value = new Time(0, 0)
  newEndTime.value = new Time(0, 0)
  newWeekdaySet.value = new Set()
}

const handleRemove = async (indexToRemove: number) => {
  const newWeeklySchedules = weeklySchedules.value.filter((_, i) => i !== indexToRemove)
  await updateWeeklySchedules(newWeeklySchedules)
}

const updateWeeklySchedules = async (newWeeklySchedules: WeeklySchedule[]) => {
  await weeklyScheduleStorageService.saveAll(newWeeklySchedules)
  await port.send({ name: WorkRequestName.TOGGLE_BROWSING_RULES })
  weeklySchedules.value = newWeeklySchedules
}
</script>

<template>
  <ContentTemplate title="Schedules">
    <p>
      <small>
        Set the schedules for blocking access to the configured domains to be active. If not set, it
        will remain active at all times.
      </small>
    </p>
    <form>
      <div class="mb-4">
        <div class="form-group">
          <label>Select Weekdays:</label>
          <WeekdaysSelector class="d-flex flex-wrap" v-model="newWeekdaySet" />
        </div>

        <div class="form-group">
          <label>Start Time:</label>
          <TimeInput class="d-flex" v-model="newStartTime" data-test="start-time-input" />
        </div>

        <div class="form-group">
          <label>End Time:</label>
          <TimeInput class="d-flex" v-model="newEndTime" data-test="end-time-input" />
        </div>
      </div>
      <BButton variant="primary" data-test="add-button" @click="onClickAdd">Add</BButton>
      <div v-if="errorMessage" class="text-danger mt-2" data-test="error-message">
        {{ errorMessage }}
      </div>
    </form>
    <div class="mt-4" data-test="saved-schedules-section" v-if="showSaved">
      <h3>Saved</h3>
      <SchedulesList :weeklySchedules="weeklySchedules" @remove="handleRemove" />
    </div>
  </ContentTemplate>
</template>
