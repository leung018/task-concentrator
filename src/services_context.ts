import { ChromeBadgeDisplayService } from './chrome/badge'
import { ChromeBrowsingControlService } from './chrome/browsing_control'
import { ChromeCloseTabsService } from './chrome/close_tabs'
import { ChromeCommunicationManager } from './chrome/communication'
import { ChromeNewTabService } from './chrome/new_tab'
import { ChromeNotificationService } from './chrome/notification'
import config from './config'
import { FakeBrowsingControlService, type BrowsingControlService } from './domain/browsing_control'
import { TimerConfigStorageService } from './domain/pomodoro/config/storage'
import { FocusSessionRecordStorageService } from './domain/pomodoro/record/storage'
import { TimerStateStorageService } from './domain/pomodoro/storage'
import { FakeActionService, type ActionService } from './infra/action'
import { FakeBadgeDisplayService, type BadgeDisplayService } from './infra/badge'
import { FakeCommunicationManager, type CommunicationManager } from './infra/communication'
import { MultipleActionService } from './infra/multiple_actions'

interface ServicesContext {
  readonly communicationManager: CommunicationManager
  readonly browsingControlService: BrowsingControlService
  readonly reminderService: ActionService
  readonly badgeDisplayService: BadgeDisplayService
  readonly timerStateStorageService: TimerStateStorageService
  readonly timerConfigStorageService: TimerConfigStorageService
  readonly focusSessionRecordStorageService: FocusSessionRecordStorageService
  readonly closeTabsService: ActionService
}

class ServiceContextImpl implements ServicesContext {
  readonly communicationManager = new ChromeCommunicationManager()
  readonly browsingControlService = new ChromeBrowsingControlService()
  readonly reminderService = new MultipleActionService([
    new ChromeNewTabService(config.getReminderPageUrl()),
    new ChromeNotificationService()
  ])
  readonly badgeDisplayService = new ChromeBadgeDisplayService()
  readonly timerStateStorageService = TimerStateStorageService.create()
  readonly timerConfigStorageService = TimerConfigStorageService.create()
  readonly focusSessionRecordStorageService = FocusSessionRecordStorageService.create()
  readonly closeTabsService = new ChromeCloseTabsService(config.getReminderPageUrl())
}

export class ServicesContextProvider {
  static getContext(): ServicesContext {
    return new ServiceContextImpl()
  }

  static inTestSetServicesContext(servicesContext: ServicesContext): void {
    this.getContext = () => {
      return servicesContext
    }
  }
}

export class FakeServicesContext implements ServicesContext {
  communicationManager = new FakeCommunicationManager()
  browsingControlService = new FakeBrowsingControlService()
  reminderService = new FakeActionService()
  badgeDisplayService = new FakeBadgeDisplayService()
  timerStateStorageService = TimerStateStorageService.createFake()
  timerConfigStorageService = TimerConfigStorageService.createFake()
  focusSessionRecordStorageService = FocusSessionRecordStorageService.createFake()
  closeTabsService = new FakeActionService()
}
