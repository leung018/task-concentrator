import { describe, expect, it } from 'vitest'
import { TimerConfig } from '../domain/pomodoro/config'
import { startBackgroundListener } from '../test_utils/listener'
import { flushPromises, mount } from '@vue/test-utils'
import TimerSettingPage from './TimerSettingPage.vue'
import { Duration } from '../domain/pomodoro/duration'
import { assertCheckboxValue, assertInputValue } from '../test_utils/assert'
import { FakeActionService } from '../infra/action'

describe('TimerSettingPage', () => {
  it('should render timer config properly', async () => {
    const { wrapper } = await mountPage(
      new TimerConfig({
        focusDuration: new Duration({ minutes: 24 }),
        shortBreakDuration: new Duration({ minutes: 4 }),
        longBreakDuration: new Duration({ minutes: 13 }),
        focusSessionsPerCycle: 3
      })
    )
    await flushPromises()

    assertInputValue(wrapper, '[data-test="focus-duration"]', '24')
    assertInputValue(wrapper, '[data-test="short-break-duration"]', '4')
    assertInputValue(wrapper, '[data-test="long-break-duration"]', '13')
    assertInputValue(wrapper, '[data-test="focus-sessions-per-cycle"]', '3')
  })

  it('should check perform cycle, show short break and focus sessions per cycle when focus sessions per cycles higher than 1', async () => {
    const { wrapper } = await mountPage(
      TimerConfig.newTestInstance({
        focusSessionsPerCycle: 2
      })
    )
    await flushPromises()

    assertCheckboxValue(wrapper, '[data-test="perform-cycle"]', true)
    expect(wrapper.find('[data-test="short-break-duration"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-test="focus-sessions-per-cycle"]').isVisible()).toBe(true)
  })

  it('should uncheck perform cycle, hide short break and focus sessions per cycle when focus sessions per cycles equal to 1', async () => {
    const { wrapper } = await mountPage(
      TimerConfig.newTestInstance({
        focusSessionsPerCycle: 1
      })
    )
    await flushPromises()

    assertCheckboxValue(wrapper, '[data-test="perform-cycle"]', false)
    expect(wrapper.find('[data-test="short-break-duration"]').isVisible()).toBe(false)
    expect(wrapper.find('[data-test="focus-sessions-per-cycle"]').isVisible()).toBe(false)
  })

  it('should update timer config', async () => {
    const { timerConfigStorageService, wrapper, timer } = await mountPage(
      new TimerConfig({
        focusDuration: new Duration({ minutes: 24 }),
        shortBreakDuration: new Duration({ minutes: 4 }),
        longBreakDuration: new Duration({ minutes: 14 }),
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
    await wrapper.find('[data-test="focus-sessions-per-cycle"]').setValue(newNumOfPomodoriPerCycle)

    await wrapper.find('[data-test="save-button"]').trigger('click')
    await flushPromises()

    const newConfig = new TimerConfig({
      focusDuration: new Duration({ minutes: newFocusDuration }),
      shortBreakDuration: new Duration({ minutes: newShortBreakDuration }),
      longBreakDuration: new Duration({ minutes: newLongBreakDuration }),
      focusSessionsPerCycle: newNumOfPomodoriPerCycle
    })
    expect(await timerConfigStorageService.get()).toEqual(newConfig)

    // Should listener also reload the timer with new config
    expect(timer.getConfig()).toEqual(newConfig)
  })

  it('should ignore the value of short break when perform cycle is unchecked', async () => {
    const { timerConfigStorageService, wrapper } = await mountPage(
      TimerConfig.newTestInstance({
        focusSessionsPerCycle: 3,
        shortBreakDuration: new Duration({ minutes: 4 })
      })
    )
    await flushPromises()

    const newShortBreakDuration = 0
    await wrapper.find('[data-test="short-break-duration"]').setValue(newShortBreakDuration)

    await wrapper.find('[data-test="perform-cycle"]').setValue(false)
    await wrapper.find('[data-test="save-button"]').trigger('click')
    await flushPromises()

    const newConfig = await timerConfigStorageService.get()
    expect(newConfig.shortBreakDuration).toEqual(new Duration({ minutes: 4 }))
  })

  it('should set focus sessions per cycle to 1 when perform cycle is unchecked', async () => {
    const { timerConfigStorageService, wrapper } = await mountPage(
      TimerConfig.newTestInstance({
        focusSessionsPerCycle: 3
      })
    )
    await flushPromises()

    await wrapper.find('[data-test="perform-cycle"]').setValue(false)
    await wrapper.find('[data-test="save-button"]').trigger('click')
    await flushPromises()

    const newConfig = await timerConfigStorageService.get()
    expect(newConfig.focusSessionsPerCycle).toBe(1)
  })

  it('should reload page after clicked save', async () => {
    const { wrapper, reloadService } = await mountPage()

    expect(reloadService.getTriggerCount()).toBe(0)

    await wrapper.find('[data-test="save-button"]').trigger('click')
    await flushPromises()

    expect(reloadService.getTriggerCount()).toBe(1)
  })
})

async function mountPage(initialTimerConfig: TimerConfig = TimerConfig.newTestInstance()) {
  const { timerConfigStorageService, timer, communicationManager } = await startBackgroundListener({
    timerConfig: initialTimerConfig
  })
  const reloadService = new FakeActionService()
  const wrapper = await mount(TimerSettingPage, {
    props: {
      port: communicationManager.clientConnect(),
      timerConfigStorageService,
      reloadService
    }
  })
  return { timerConfigStorageService, timer, wrapper, communicationManager, reloadService }
}
