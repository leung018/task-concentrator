import { ChromeCommunicationManager } from '../chrome/communication'
import { type WorkRequest, WorkRequestName } from './request'
import {
  FakeCommunicationManager,
  type CommunicationManager,
  type Port
} from '../infra/communication'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { WorkResponseName, type WorkResponse } from './response'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { FakeActionService, type ActionService } from '../infra/action'
import { ChromeNewTabService } from '../chrome/new_tab'
import { FakeBadgeDisplayService, type BadgeColor, type BadgeDisplayService } from '../infra/badge'
import { ChromeBadgeDisplayService } from '../chrome/badge'
import { PomodoroStage } from '../domain/pomodoro/stage'
import config from '../config'
import { MultipleActionService } from '../infra/multiple_actions'
import { ChromeNotificationService } from '../chrome/notification'
import { TimerStateStorageService } from '../domain/pomodoro/storage'
import { ChromeCloseTabsService } from '../chrome/close_tabs'
import { getSoundConfig } from '../config/sound_config'
import { SoundService } from '../chrome/sound'

export class BackgroundListener {
  private redirectTogglingService: BrowsingControlTogglingService
  private communicationManager: CommunicationManager
  private timer: PomodoroTimer
  private reminderService: ActionService
  private badgeDisplayService: BadgeDisplayService
  private timerStateStorageService: TimerStateStorageService
  private closeTabsService: ActionService

  static create() {
    const soundConfig = getSoundConfig()
    const reminderService = new MultipleActionService([
      new ChromeNewTabService(config.getReminderPageUrl()),
      new ChromeNotificationService(),
      new SoundService(soundConfig.soundFile)
    ])

    return new BackgroundListener({
      communicationManager: new ChromeCommunicationManager(),
      timer: PomodoroTimer.create(),
      redirectTogglingService: BrowsingControlTogglingService.create(),
      reminderService,
      badgeDisplayService: new ChromeBadgeDisplayService(),
      timerStateStorageService: TimerStateStorageService.create(),
      closeTabsService: new ChromeCloseTabsService(config.getReminderPageUrl())
    })
  }

  static createFake({
    timer = PomodoroTimer.createFake(),
    communicationManager = new FakeCommunicationManager(),
    redirectTogglingService = BrowsingControlTogglingService.createFake(),
    reminderService = new FakeActionService(),
    badgeDisplayService = new FakeBadgeDisplayService(),
    timerStateStorageService = TimerStateStorageService.createFake(),
    closeTabsService = new FakeActionService()
  } = {}) {
    return new BackgroundListener({
      communicationManager,
      timer: timer,
      redirectTogglingService,
      reminderService,
      badgeDisplayService,
      timerStateStorageService,
      closeTabsService
    })
  }

  private constructor({
    communicationManager,
    timer,
    redirectTogglingService,
    reminderService,
    badgeDisplayService,
    timerStateStorageService,
    closeTabsService
  }: {
    communicationManager: CommunicationManager
    timer: PomodoroTimer
    redirectTogglingService: BrowsingControlTogglingService
    reminderService: ActionService
    badgeDisplayService: BadgeDisplayService
    timerStateStorageService: TimerStateStorageService
    closeTabsService: ActionService
  }) {
    this.communicationManager = communicationManager
    this.redirectTogglingService = redirectTogglingService
    this.reminderService = reminderService
    this.badgeDisplayService = badgeDisplayService
    this.timerStateStorageService = timerStateStorageService
    this.closeTabsService = closeTabsService

    this.timer = timer
  }

  async start() {
    return this.setUpTimerRelated().then(() => {
      this.communicationManager.onNewClientConnect(
        (backgroundPort: Port<WorkResponse, WorkRequest>) => {
          const listener = (message: WorkRequest) => {
            switch (message.name) {
              case WorkRequestName.TOGGLE_REDIRECT_RULES: {
                this.redirectTogglingService.run()
                break
              }
              case WorkRequestName.START_TIMER: {
                this.timer.start()
                this.closeTabsService.trigger()
                break
              }
              case WorkRequestName.PAUSE_TIMER: {
                this.timer.pause()
                this.badgeDisplayService.clearBadge()
                break
              }
              case WorkRequestName.LISTEN_TO_TIMER: {
                const subscriptionId = this.timer.subscribeTimerState((update) => {
                  backgroundPort.send({
                    name: WorkResponseName.TIMER_STATE,
                    payload: update
                  })
                })
                backgroundPort.onDisconnect(() => {
                  console.debug('Connection closed, unsubscribing timer update.')
                  this.timer.unsubscribeTimerState(subscriptionId)
                })
                break
              }
              case WorkRequestName.LISTEN_TO_POMODORO_RECORDS_UPDATE: {
                const subscriptionId = this.timer.subscribePomodoroRecordsUpdate(() => {
                  backgroundPort.send({
                    name: WorkResponseName.POMODORO_RECORDS_UPDATED
                  })
                })
                backgroundPort.onDisconnect(() => {
                  this.timer.unsubscribePomodoroRecordsUpdate(subscriptionId)
                })
                break
              }
              case WorkRequestName.RESTART_FOCUS: {
                this.timer.restartFocus(message.payload?.nth)
                break
              }
              case WorkRequestName.RESTART_SHORT_BREAK: {
                this.timer.restartShortBreak(message.payload?.nth)
                break
              }
              case WorkRequestName.RESTART_LONG_BREAK: {
                this.timer.restartLongBreak()
                break
              }
            }
          }
          backgroundPort.onMessage(listener)
        }
      )
    })
  }

  private async setUpTimerRelated() {
    return this.timerStateStorageService.get().then((backupState) => {
      if (backupState) {
        this.timer.setState(backupState)
      }

      this.timer.setOnStageComplete(() => {
        this.reminderService.trigger()
        this.badgeDisplayService.clearBadge()
      })
      this.timer.subscribeTimerState((newState) => {
        this.timerStateStorageService.save(newState)

        if (newState.isRunning) {
          this.badgeDisplayService.displayBadge({
            text: roundUpToRemainingMinutes(newState.remainingSeconds).toString(),
            color: getBadgeColor(newState.stage)
          })
        }
      })
    })
  }
}

function roundUpToRemainingMinutes(remainingSeconds: number): number {
  return Math.ceil(remainingSeconds / 60)
}

function getBadgeColor(stage: PomodoroStage): BadgeColor {
  const colorConfig = config.getBadgeColorConfig()
  if (stage === PomodoroStage.FOCUS) {
    return colorConfig.focusBadgeColor
  } else {
    return colorConfig.breakBadgeColor
  }
}
