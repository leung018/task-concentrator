import { describe, expect, it } from 'vitest'
import { TimerConfig } from '../domain/pomodoro/config'
import { flushPromises, mount } from '@vue/test-utils'
import TestingConfigPage from './TestingConfigPage.vue'
import { Duration } from '../domain/pomodoro/duration'
import { startBackgroundListener } from '../test_utils/listener'
import { assertInputValue } from '../test_utils/assert'

describe('TestingConfigPage', () => {
  it('should render timer config', async () => {
    const { wrapper } = await mountPage(
      new TimerConfig({
        focusDuration: new Duration({ seconds: 24 }),
        shortBreakDuration: new Duration({ seconds: 4 }),
        longBreakDuration: new Duration({ seconds: 14 }),
        focusSessionsPerCycle: 3
      })
    )
    await flushPromises()

    assertInputValue(wrapper, '[data-test="focus-duration"]', '24')
    assertInputValue(wrapper, '[data-test="short-break-duration"]', '4')
    assertInputValue(wrapper, '[data-test="long-break-duration"]', '14')
    assertInputValue(wrapper, '[data-test="num-of-pomodori-per-cycle"]', '3')
  })

  it('should update timer config', async () => {
    const { timerConfigStorageService, wrapper, timer } = await mountPage(
      new TimerConfig({
        focusDuration: new Duration({ seconds: 24 }),
        shortBreakDuration: new Duration({ seconds: 4 }),
        longBreakDuration: new Duration({ seconds: 14 }),
        focusSessionsPerCycle: 3
      })
    )
    await flushPromises()

    const newFocusDuration = 30
    const newShortBreakDuration = 5
    const newLongBreakDuration = 15
    const newNumOfPomodoriPerCycle = 4

    await wrapper.find('[data-test="focus-duration"]').setValue(newFocusDuration)
    await wrapper.find('[data-test="short-break-duration"]').setValue(newShortBreakDuration)
    await wrapper.find('[data-test="long-break-duration"]').setValue(newLongBreakDuration)
    await wrapper.find('[data-test="num-of-pomodori-per-cycle"]').setValue(newNumOfPomodoriPerCycle)

    await wrapper.find('[data-test="save-button"]').trigger('click')
    await flushPromises()

    const newConfig = new TimerConfig({
      focusDuration: new Duration({ seconds: newFocusDuration }),
      shortBreakDuration: new Duration({ seconds: newShortBreakDuration }),
      longBreakDuration: new Duration({ seconds: newLongBreakDuration }),
      focusSessionsPerCycle: newNumOfPomodoriPerCycle
    })
    expect(await timerConfigStorageService.get()).toEqual(newConfig)

    // Should listener also reload the timer with new config
    expect(timer.getConfig()).toEqual(newConfig)
  })
})

async function mountPage(initialTimerConfig: TimerConfig) {
  const { timerConfigStorageService, timer, communicationManager } = await startBackgroundListener({
    timerConfig: initialTimerConfig
  })
  const wrapper = mount(TestingConfigPage, {
    props: {
      port: communicationManager.clientConnect(),
      timerConfigStorageService
    }
  })
  return { timerConfigStorageService, wrapper, timer }
}
