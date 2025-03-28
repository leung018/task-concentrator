import { describe, expect, it } from 'vitest'
import { PomodoroTimerConfig } from '../domain/pomodoro/config'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import TestingConfigPage from './TestingConfigPage.vue'
import { Duration } from '../domain/pomodoro/duration'
import { PomodoroTimerConfigStorageService } from '../domain/pomodoro/config/storage'

describe('TestingConfigPage', () => {
  it('should render timer config', async () => {
    const { wrapper } = await mountPage(
      new PomodoroTimerConfig({
        focusDuration: new Duration({ seconds: 24 }),
        shortBreakDuration: new Duration({ seconds: 4 }),
        longBreakDuration: new Duration({ seconds: 14 }),
        numOfPomodoriPerCycle: 3
      })
    )
    await flushPromises()

    assertInputValue(wrapper, 'focus-duration', '24')
    assertInputValue(wrapper, 'short-break-duration', '4')
    assertInputValue(wrapper, 'long-break-duration', '14')
    assertInputValue(wrapper, 'num-of-pomodori-per-cycle', '3')
  })

  it('should update timer config', async () => {
    const { timerConfigStorageService, wrapper } = await mountPage(
      new PomodoroTimerConfig({
        focusDuration: new Duration({ seconds: 24 }),
        shortBreakDuration: new Duration({ seconds: 4 }),
        longBreakDuration: new Duration({ seconds: 14 }),
        numOfPomodoriPerCycle: 3
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

    expect(await timerConfigStorageService.get()).toEqual(
      new PomodoroTimerConfig({
        focusDuration: new Duration({ seconds: newFocusDuration }),
        shortBreakDuration: new Duration({ seconds: newShortBreakDuration }),
        longBreakDuration: new Duration({ seconds: newLongBreakDuration }),
        numOfPomodoriPerCycle: newNumOfPomodoriPerCycle
      })
    )
  })
})

async function mountPage(initialTimerConfig: PomodoroTimerConfig) {
  const timerConfigStorageService = PomodoroTimerConfigStorageService.createFake()
  await timerConfigStorageService.save(initialTimerConfig)
  const wrapper = mount(TestingConfigPage, {
    props: {
      timerConfigStorageService
    }
  })
  return { timerConfigStorageService, wrapper }
}

function assertInputValue(wrapper: VueWrapper, dataTest: string, value: string) {
  const input = wrapper.find(`[data-test="${dataTest}"]`).element as HTMLInputElement
  expect(input.value).toBe(value)
}
