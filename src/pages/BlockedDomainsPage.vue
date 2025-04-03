<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import type { BrowsingRulesStorageService } from '@/domain/browsing_rules/storage'
import { BrowsingRules } from '../domain/browsing_rules'
import { WorkRequestName } from '../service_workers/request'
import type { Port } from '../infra/communication'
import ContentTemplate from './components/ContentTemplate.vue'

const { browsingRulesStorageService, port } = defineProps<{
  port: Port
  browsingRulesStorageService: BrowsingRulesStorageService
}>()

const blockedDomains = ref<ReadonlyArray<string>>([])
const newDomain = ref<string>('')

onBeforeMount(async () => {
  blockedDomains.value = (await browsingRulesStorageService.get()).blockedDomains
})

async function onClickAdd() {
  const newDomainValue = newDomain.value.trim()
  if (!newDomainValue) return

  const browsingRules = new BrowsingRules({
    blockedDomains: [...blockedDomains.value, newDomainValue]
  })
  await updateBrowsingRules(browsingRules)
  newDomain.value = ''
}

async function onClickRemove(domain: string) {
  const browsingRules = new BrowsingRules({
    blockedDomains: blockedDomains.value.filter((d) => d !== domain)
  })
  await updateBrowsingRules(browsingRules)
}

async function updateBrowsingRules(browsingRules: BrowsingRules) {
  await browsingRulesStorageService.save(browsingRules)
  await port.send({ name: WorkRequestName.TOGGLE_BROWSING_RULES })
  blockedDomains.value = browsingRules.blockedDomains
}
</script>

<template>
  <ContentTemplate title="Blocked Domains">
    <form class="mb-4" @submit.prevent>
      <div class="mb-3">
        <input
          v-model="newDomain"
          type="text"
          class="form-control"
          data-test="blocked-domain-input"
          placeholder="Enter your domain"
          required
        />
        <p class="mt-1">
          <small>
            Enter the domain of the website you would like to limit your browsing to. e.g.
            "facebook.com", "instagram.com"
          </small>
        </p>
      </div>
      <BButton variant="primary" data-test="add-button" @click="onClickAdd" type="submit"
        >Add</BButton
      >
    </form>
    <ul class="list-group">
      <li
        v-for="domain in blockedDomains"
        :key="domain"
        class="list-group-item d-flex justify-content-between align-items-center"
      >
        <span data-test="blocked-domain">{{ domain }}</span>
        <BButton
          class="bg-transparent text-danger border-0"
          :data-test="`remove-${domain}`"
          @click="onClickRemove(domain)"
        >
          X
        </BButton>
      </li>
    </ul>
  </ContentTemplate>
</template>
