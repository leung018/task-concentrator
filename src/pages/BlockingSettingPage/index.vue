<script setup lang="ts">
import { BlockingTimerIntegrationStorageService } from '@/domain/blocking_timer_integration/storage'
import { BrowsingRulesStorageService } from '@/domain/browsing_rules/storage'
import { WeeklyScheduleStorageService } from '@/domain/schedules/storage'
import { UpdateSuccessNotifierService } from '@/infra/browser/update_success_notifier'
import type { ClientPort } from '@/service_workers/listener'
import ContentTemplate from '../components/ContentTemplate.vue'
import BlockedDomainsEditor from './BlockedDomainsEditor.vue'
import TimerIntegrationSetting from './TimerIntegrationSetting.vue'
import WeeklySchedulesEditor from './WeeklySchedulesEditor/index.vue'

const { port } = defineProps<{
  port: ClientPort
}>()
</script>

<template>
  <ContentTemplate title="Blocking">
    <BCard class="mb-4 shadow-sm">
      <h2 class="mb-3 mt-1">Blocked Domains</h2>
      <BlockedDomainsEditor
        :browsing-rules-storage-service="BrowsingRulesStorageService.create()"
        :port="port"
      />
    </BCard>
    <BCard class="mb-4 shadow-sm">
      <h2 class="mb-3 mt-1">Timer Integration</h2>
      <TimerIntegrationSetting
        :blocking-timer-integration-storage-service="
          BlockingTimerIntegrationStorageService.create()
        "
        :update-success-notifier-service="new UpdateSuccessNotifierService()"
        :port="port"
      />
    </BCard>
    <BCard class="mb-4 shadow-sm">
      <h2 class="mb-3 mt-1">Schedules</h2>
      <WeeklySchedulesEditor
        :weekly-schedule-storage-service="WeeklyScheduleStorageService.create()"
        :port="port"
      />
    </BCard>
  </ContentTemplate>
</template>
