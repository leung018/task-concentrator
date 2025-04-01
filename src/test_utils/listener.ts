import config from '../config'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { FakeActionService } from '../infra/action'
import { FakeBadgeDisplayService } from '../infra/badge'
import { FakeCommunicationManager } from '../infra/communication'
import { FakePeriodicTaskScheduler } from '../infra/scheduler'
import { BackgroundListener } from '../service_workers/listener'
import { PomodoroTimerStateStorageService } from '../domain/pomodoro/storage'
import { FocusSessionRecordStorageService } from '../domain/pomodoro/record/storage'
import type { PomodoroTimerConfig } from '../domain/pomodoro/config'
import { PomodoroTimerConfigStorageService } from '../domain/pomodoro/config/storage'

export async function startBackgroundListener({
  focusSessionRecordHouseKeepDays = 30,
  timerConfig = config.getDefaultPomodoroTimerConfig(),
  redirectTogglingService = BrowsingControlTogglingService.createFake(),
  reminderService = new FakeActionService(),
  badgeDisplayService = new FakeBadgeDisplayService(),
  communicationManager = new FakeCommunicationManager(),
  timerStateStorageService = PomodoroTimerStateStorageService.createFake(),
  timerConfigStorageService = PomodoroTimerConfigStorageService.createFake(),
  closeTabsService = new FakeActionService(),
  focusSessionRecordStorageService = FocusSessionRecordStorageService.createFake(),
  getCurrentDate = undefined
}: {
  focusSessionRecordHouseKeepDays?: number
  timerConfig?: PomodoroTimerConfig
  redirectTogglingService?: BrowsingControlTogglingService
  reminderService?: FakeActionService
  badgeDisplayService?: FakeBadgeDisplayService
  communicationManager?: FakeCommunicationManager
  timerStateStorageService?: PomodoroTimerStateStorageService
  timerConfigStorageService?: PomodoroTimerConfigStorageService
  closeTabsService?: FakeActionService
  focusSessionRecordStorageService?: FocusSessionRecordStorageService
  getCurrentDate?: () => Date
}) {
  const scheduler = new FakePeriodicTaskScheduler()
  await timerConfigStorageService.save(timerConfig)
  const timerFactory = (tc: PomodoroTimerConfig) => {
    return PomodoroTimer.createFake({
      scheduler,
      timerConfig: tc
    })
  }
  return BackgroundListener.startFake({
    timerFactory,
    focusSessionRecordHouseKeepDays,
    focusSessionRecordStorageService,
    reminderService,
    badgeDisplayService,
    redirectTogglingService,
    communicationManager,
    timerStateStorageService,
    timerConfigStorageService,
    closeTabsService,
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
