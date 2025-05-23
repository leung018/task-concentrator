import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import config from '../../config'
import type { BlockingTimerIntegration } from '../../domain/blocking_timer_integration'
import { BrowsingRules } from '../../domain/browsing_rules'
import { TimerStage } from '../../domain/timer/stage'
import { newTestTimerState } from '../../domain/timer/state'
import { FakeActionService } from '../../infra/action'
import { assertSelectorCheckboxValue } from '../../test_utils/assert'
import { setUpListener } from '../../test_utils/listener'
import { dataTestSelector } from '../../test_utils/selector'
import TimerIntegrationSetting from './TimerIntegrationSetting.vue'

describe('TimerIntegrationSetting', () => {
  it('should render saved setting', async () => {
    const { wrapper } = await mountTimerIntegrationSetting({
      blockingTimerIntegration: {
        shouldPauseBlockingDuringBreaks: false
      }
    })
    assertSelectorCheckboxValue(wrapper, dataTestSelector('pause-blocking-during-breaks'), false)
  })

  it('should persist setting after clicking save', async () => {
    const { wrapper, blockingTimerIntegrationStorageService } = await mountTimerIntegrationSetting({
      blockingTimerIntegration: {
        shouldPauseBlockingDuringBreaks: false
      }
    })

    await saveBlockingTimerIntegration(wrapper, {
      shouldPauseBlockingDuringBreaks: true
    })

    expect(
      (await blockingTimerIntegrationStorageService.get()).shouldPauseBlockingDuringBreaks
    ).toBe(true)
  })

  it('should trigger notifierService when clicking save', async () => {
    const { wrapper, updateSuccessNotifierService } = await mountTimerIntegrationSetting()

    expect(updateSuccessNotifierService.hasTriggered()).toBe(false)

    await saveBlockingTimerIntegration(wrapper)

    expect(updateSuccessNotifierService.hasTriggered()).toBe(true)
  })

  it('should toggle browsing control after clicking save', async () => {
    const browsingRules = new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })

    const { wrapper, browsingControlService, listener } = await mountTimerIntegrationSetting({
      blockingTimerIntegration: {
        shouldPauseBlockingDuringBreaks: false
      },
      timerState: newTestTimerState({
        stage: TimerStage.SHORT_BREAK,
        isRunning: true
      }),
      browsingRules,
      weeklySchedules: []
    })

    listener.toggleBrowsingRules()
    await flushPromises()

    expect(browsingControlService.getActivatedBrowsingRules()).toEqual(browsingRules)

    await saveBlockingTimerIntegration(wrapper, {
      shouldPauseBlockingDuringBreaks: true
    })

    expect(browsingControlService.getActivatedBrowsingRules()).toBeNull()
  })
})

async function mountTimerIntegrationSetting({
  blockingTimerIntegration = config.getDefaultBlockingTimerIntegration(),
  browsingRules = new BrowsingRules(),
  weeklySchedules = [],
  timerState = newTestTimerState()
} = {}) {
  const updateSuccessNotifierService = new FakeActionService()

  const {
    browsingControlService,
    communicationManager,
    listener,
    blockingTimerIntegrationStorageService,
    browsingRulesStorageService,
    weeklyScheduleStorageService,
    timerStateStorageService
  } = await setUpListener()

  await blockingTimerIntegrationStorageService.save(blockingTimerIntegration)
  await browsingRulesStorageService.save(browsingRules)
  await weeklyScheduleStorageService.saveAll(weeklySchedules)
  await timerStateStorageService.save(timerState)

  await listener.start()

  const wrapper = mount(TimerIntegrationSetting, {
    props: {
      blockingTimerIntegrationStorageService,
      updateSuccessNotifierService,
      port: communicationManager.clientConnect()
    }
  })
  await flushPromises()
  return {
    browsingControlService,
    listener,
    wrapper,
    blockingTimerIntegrationStorageService,
    updateSuccessNotifierService
  }
}

async function saveBlockingTimerIntegration(
  wrapper: VueWrapper,
  blockingTimerIntegration: BlockingTimerIntegration = {
    shouldPauseBlockingDuringBreaks: false
  }
) {
  const checkbox = wrapper.find(dataTestSelector('pause-blocking-during-breaks'))
  await checkbox.setValue(blockingTimerIntegration.shouldPauseBlockingDuringBreaks)
  const saveButton = wrapper.find(dataTestSelector('save-timer-integration-button'))
  await saveButton.trigger('click')
  await flushPromises()
}
