import config from '../config'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { FakeActionService } from '../infra/action'
import { FakeBadgeDisplayService } from '../infra/badge'
import { FakeCommunicationManager } from '../infra/communication'
import { FakePeriodicTaskScheduler } from '../infra/scheduler'
import { BackgroundListener } from '../service_workers/listener'
import { TimerStateStorageService } from '../domain/pomodoro/storage'
import { FocusSessionRecordStorageService } from '../domain/pomodoro/record/storage'
import type { TimerConfig } from '../domain/pomodoro/config'
import { TimerConfigStorageService } from '../domain/pomodoro/config/storage'
import { WeeklyScheduleStorageService } from '../domain/schedules/storage'
import { BrowsingRulesStorageService } from '../domain/browsing_rules/storage'
import { FakeBrowsingControlService } from '../domain/browsing_control'
import { CurrentDateService } from '../infra/current_date'

export async function startBackgroundListener({
  focusSessionRecordHouseKeepDays = 30,
  timerConfig = config.getDefaultTimerConfig(),
  browsingControlService = new FakeBrowsingControlService(),
  weeklyScheduleStorageService = WeeklyScheduleStorageService.createFake(),
  browsingRulesStorageService = BrowsingRulesStorageService.createFake(),
  reminderService = new FakeActionService(),
  badgeDisplayService = new FakeBadgeDisplayService(),
  communicationManager = new FakeCommunicationManager(),
  timerStateStorageService = TimerStateStorageService.createFake(),
  timerConfigStorageService = TimerConfigStorageService.createFake(),
  closeTabsService = new FakeActionService(),
  focusSessionRecordStorageService = FocusSessionRecordStorageService.createFake(),
  currentDateService = CurrentDateService.createFake()
}: {
  focusSessionRecordHouseKeepDays?: number
  timerConfig?: TimerConfig
  browsingControlService?: FakeBrowsingControlService
  weeklyScheduleStorageService?: WeeklyScheduleStorageService
  browsingRulesStorageService?: BrowsingRulesStorageService
  reminderService?: FakeActionService
  badgeDisplayService?: FakeBadgeDisplayService
  communicationManager?: FakeCommunicationManager
  timerStateStorageService?: TimerStateStorageService
  timerConfigStorageService?: TimerConfigStorageService
  closeTabsService?: FakeActionService
  focusSessionRecordStorageService?: FocusSessionRecordStorageService
  currentDateService?: CurrentDateService
}) {
  const scheduler = new FakePeriodicTaskScheduler()
  await timerConfigStorageService.save(timerConfig)
  const timer = PomodoroTimer.createFake({
    scheduler
  })

  const listener = BackgroundListener.createFake({
    browsingControlService,
    weeklyScheduleStorageService,
    browsingRulesStorageService,
    communicationManager,
    reminderService,
    badgeDisplayService,
    timerStateStorageService,
    timerConfigStorageService,
    focusSessionRecordStorageService,
    closeTabsService,
    currentDateService,
    timer,
    focusSessionRecordHouseKeepDays
  })
  await listener.start()
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
}
