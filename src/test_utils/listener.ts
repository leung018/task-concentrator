import config from '../config'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { FakeActionService } from '../infra/action'
import { FakeBadgeDisplayService } from '../infra/badge'
import { FakeCommunicationManager } from '../infra/communication'
import { FakePeriodicTaskScheduler } from '../infra/scheduler'
import { BackgroundListener } from '../service_workers/listener'
import { TimerStateStorageService } from '../domain/pomodoro/storage'
import { FocusSessionRecordStorageService } from '../domain/pomodoro/record/storage'
import type { TimerConfig } from '../domain/pomodoro/config'
import { TimerConfigStorageService } from '../domain/pomodoro/config/storage'
import { FakeServicesContext, ServicesContextProvider } from '../services_context'

export async function startBackgroundListener({
  focusSessionRecordHouseKeepDays = 30,
  timerConfig = config.getDefaultTimerConfig(),
  redirectTogglingService = BrowsingControlTogglingService.createFake(),
  reminderService = new FakeActionService(),
  badgeDisplayService = new FakeBadgeDisplayService(),
  communicationManager = new FakeCommunicationManager(),
  timerStateStorageService = TimerStateStorageService.createFake(),
  timerConfigStorageService = TimerConfigStorageService.createFake(),
  closeTabsService = new FakeActionService(),
  focusSessionRecordStorageService = FocusSessionRecordStorageService.createFake(),
  getCurrentDate = undefined
}: {
  focusSessionRecordHouseKeepDays?: number
  timerConfig?: TimerConfig
  redirectTogglingService?: BrowsingControlTogglingService
  reminderService?: FakeActionService
  badgeDisplayService?: FakeBadgeDisplayService
  communicationManager?: FakeCommunicationManager
  timerStateStorageService?: TimerStateStorageService
  timerConfigStorageService?: TimerConfigStorageService
  closeTabsService?: FakeActionService
  focusSessionRecordStorageService?: FocusSessionRecordStorageService
  getCurrentDate?: () => Date
}) {
  const context = new FakeServicesContext()

  context.communicationManager = communicationManager
  context.reminderService = reminderService
  context.badgeDisplayService = badgeDisplayService
  context.timerStateStorageService = timerStateStorageService
  context.timerConfigStorageService = timerConfigStorageService
  context.focusSessionRecordStorageService = focusSessionRecordStorageService
  context.closeTabsService = closeTabsService

  ServicesContextProvider.inTestSetServicesContext(context)

  const scheduler = new FakePeriodicTaskScheduler()
  await timerConfigStorageService.save(timerConfig)
  const timerFactory = (tc: TimerConfig) => {
    return PomodoroTimer.createFake({
      scheduler,
      timerConfig: tc
    })
  }

  return BackgroundListener.startFake({
    timerFactory,
    focusSessionRecordHouseKeepDays,
    redirectTogglingService,
    getCurrentDate
  }).then((listener) => {
    return {
      scheduler,
      timer: listener.timer,
      listener,
      reminderService,
      badgeDisplayService,
      communicationManager,
      closeTabsService,
      timerConfigStorageService,
      focusSessionRecordStorageService
    }
  })
}
