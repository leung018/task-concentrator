import { describe, expect, it } from 'vitest'
import { TimerConfig } from '../domain/pomodoro/config'
import { startBackgroundListener } from '../test_utils/listener'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import TimerSettingPage from './TimerSettingPage.vue'
import { Duration } from '../domain/pomodoro/duration'

describe('TimerSettingPage', () => {
  it('should render timer config properly for focus session per cycle more than 1', async () => {
    const { wrapper } = await mountPage(
      new TimerConfig({
        focusDuration: new Duration({ minutes: 24 }),
        shortBreakDuration: new Duration({ minutes: 4 }),
        longBreakDuration: new Duration({ minutes: 13 }),
        focusSessionsPerCycle: 3
      })
    )
    await flushPromises()

    assertInputValue(wrapper, 'focus-duration', '24')
    assertInputValue(wrapper, 'short-break-duration', '4')
    assertInputValue(wrapper, 'long-break-duration', '13')
    assertInputValue(wrapper, 'focus-sessions-per-cycle', '3')
    assertInputValue(wrapper, 'perform-cycle', 'true')
  })
})

async function mountPage(initialTimerConfig: TimerConfig) {
  const { timerConfigStorageService, timer, communicationManager } = await startBackgroundListener({
    timerConfig: initialTimerConfig
  })
  const wrapper = await mount(TimerSettingPage, {
    props: {
      timerConfigStorageService
    }
  })
  return { timerConfigStorageService, timer, wrapper, communicationManager }
}

function assertInputValue(wrapper: VueWrapper, dataTest: string, value: string) {
  const input = wrapper.find(`[data-test="${dataTest}"]`).element as HTMLInputElement
  expect(input.value).toBe(value)
}
