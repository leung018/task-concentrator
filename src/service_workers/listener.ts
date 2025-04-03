import { type WorkRequest, WorkRequestName } from './request'
import { type CommunicationManager, type Port } from '../infra/communication'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { WorkResponseName, type WorkResponse } from './response'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { type ActionService } from '../infra/action'
import { type BadgeColor, type BadgeDisplayService } from '../infra/badge'
import { PomodoroStage } from '../domain/pomodoro/stage'
import config from '../config'
import { TimerStateStorageService } from '../domain/pomodoro/storage'
import { TimerConfigStorageService } from '../domain/pomodoro/config/storage'
import type { TimerConfig } from '../domain/pomodoro/config'
import { FocusSessionRecordStorageService } from '../domain/pomodoro/record/storage'
import { newFocusSessionRecord } from '../domain/pomodoro/record'
import { FocusSessionRecordHousekeeper } from '../domain/pomodoro/record/house_keep'
import { SubscriptionManager } from '../utils/subscription'
import { ServicesContextProvider } from '../services_context'

export class BackgroundListener {
  static async start() {
    return BackgroundListener._start({
      focusSessionRecordHouseKeepDays: config.getFocusSessionRecordHouseKeepDays(),
      timerFactory: (timerConfig) => {
        return PomodoroTimer.create(timerConfig)
      }
    })
  }

  static async startFake({
    timerFactory = (timerConfig: TimerConfig) => PomodoroTimer.createFake({ timerConfig }),
    focusSessionRecordHouseKeepDays = 30,
    getCurrentDate = undefined
  }: {
    timerFactory?: (timerConfig: TimerConfig) => PomodoroTimer
    focusSessionRecordHouseKeepDays?: number
    redirectTogglingService?: BrowsingControlTogglingService
    getCurrentDate?: () => Date
  } = {}) {
    return BackgroundListener._start({
      focusSessionRecordHouseKeepDays,
      timerFactory,
      getCurrentDate
    })
  }

  private static async _start({
    focusSessionRecordHouseKeepDays,
    timerFactory,
    getCurrentDate = () => new Date()
  }: {
    focusSessionRecordHouseKeepDays: number
    timerFactory: (timerConfig: TimerConfig) => PomodoroTimer
    getCurrentDate?: () => Date
  }) {
    const context = ServicesContextProvider.getContext()
    const timerConfig = {
      ...(await context.timerConfigStorageService.get()),
      focusSessionRecordHouseKeepDays
    }

    const timer = timerFactory(timerConfig)
    const backupState = await context.timerStateStorageService.get()
    if (backupState) {
      timer.setState(backupState)
    }

    const listener = new BackgroundListener({
      getCurrentDate,
      timer,
      focusSessionRecordHouseKeepDays
    })

    listener.start()

    return listener
  }

  private browsingControlTogglingService: BrowsingControlTogglingService
  private communicationManager: CommunicationManager
  readonly timer: PomodoroTimer // TODO: Make it private when removed the dependency on timer in tests of listener
  private reminderService: ActionService
  private badgeDisplayService: BadgeDisplayService
  private timerStateStorageService: TimerStateStorageService
  private timerConfigStorageService: TimerConfigStorageService
  private closeTabsService: ActionService

  private focusSessionRecordStorageService: FocusSessionRecordStorageService
  private focusSessionRecordHouseKeepDays: number
  private focusSessionRecordsUpdateSubscriptionManager = new SubscriptionManager()
  private getCurrentDate: () => Date

  private constructor({
    timer,
    focusSessionRecordHouseKeepDays,
    getCurrentDate
  }: {
    timer: PomodoroTimer
    focusSessionRecordHouseKeepDays: number
    getCurrentDate: () => Date
  }) {
    const context = ServicesContextProvider.getContext()
    this.communicationManager = context.communicationManager
    this.browsingControlTogglingService = new BrowsingControlTogglingService({
      browsingControlService: context.browsingControlService,
      browsingRulesStorageService: context.browsingRulesStorageService,
      weeklyScheduleStorageService: context.weeklyScheduleStorageService
    })
    this.reminderService = context.reminderService
    this.badgeDisplayService = context.badgeDisplayService
    this.timerStateStorageService = context.timerStateStorageService
    this.timerConfigStorageService = context.timerConfigStorageService
    this.closeTabsService = context.closeTabsService
    this.focusSessionRecordStorageService = context.focusSessionRecordStorageService
    this.focusSessionRecordHouseKeepDays = focusSessionRecordHouseKeepDays
    this.getCurrentDate = getCurrentDate

    this.timer = timer
  }

  private start() {
    this.setUpTimerSubscriptions()
    this.setUpListener()
  }

  private setUpTimerSubscriptions() {
    this.timer.setOnStageComplete((completedStage) => {
      this.reminderService.trigger()
      this.badgeDisplayService.clearBadge()

      if (completedStage === PomodoroStage.FOCUS) {
        this.updateFocusSessionRecords()
      }
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
  }

  private async updateFocusSessionRecords() {
    return this.focusSessionRecordStorageService
      .getAll()
      .then((records) => {
        this.focusSessionRecordStorageService.saveAll([
          ...records,
          newFocusSessionRecord(this.getCurrentDate())
        ])
      })
      .then(() => {
        FocusSessionRecordHousekeeper.houseKeep({
          focusSessionRecordStorageService: this.focusSessionRecordStorageService,
          houseKeepDays: this.focusSessionRecordHouseKeepDays
        })
      })
      .then(() => {
        this.focusSessionRecordsUpdateSubscriptionManager.broadcast(undefined)
      })
  }

  getFocusSessionRecordsUpdateSubscriptionCount() {
    return this.focusSessionRecordsUpdateSubscriptionManager.getSubscriptionCount()
  }

  private setUpListener() {
    this.communicationManager.onNewClientConnect(
      (backgroundPort: Port<WorkResponse, WorkRequest>) => {
        const listener = (message: WorkRequest) => {
          switch (message.name) {
            case WorkRequestName.TOGGLE_BROWSING_RULES: {
              this.browsingControlTogglingService.run()
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
              const subscriptionId = this.focusSessionRecordsUpdateSubscriptionManager.subscribe(
                () => {
                  backgroundPort.send({
                    name: WorkResponseName.POMODORO_RECORDS_UPDATED
                  })
                }
              )
              backgroundPort.onDisconnect(() => {
                this.focusSessionRecordsUpdateSubscriptionManager.unsubscribe(subscriptionId)
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
            case WorkRequestName.RESET_TIMER_CONFIG: {
              this.timerConfigStorageService.get().then((config) => {
                this.timer.setConfig(config)
                this.badgeDisplayService.clearBadge()
              })
              break
            }
          }
        }
        backgroundPort.onMessage(listener)
      }
    )
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
