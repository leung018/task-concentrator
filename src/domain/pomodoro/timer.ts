import config from '../../config'
import {
  FakePeriodicTaskScheduler,
  PeriodicTaskSchedulerImpl,
  type PeriodicTaskScheduler
} from '../../infra/scheduler'
import type { PomodoroTimerConfig } from './config'
import { Duration } from './duration'
import { PomodoroStage } from './stage'
import { SubscriptionManager } from '../../utils/subscription'

export class PomodoroTimer {
  static create(timerConfig: PomodoroTimerConfig) {
    return new PomodoroTimer({
      scheduler: new PeriodicTaskSchedulerImpl(),
      timerConfig
    })
  }

  static createFake({
    scheduler = new FakePeriodicTaskScheduler(),
    timerConfig = config.getDefaultPomodoroTimerConfig()
  }: {
    scheduler?: PeriodicTaskScheduler
    timerConfig?: PomodoroTimerConfig
  } = {}) {
    return new PomodoroTimer({
      timerConfig,
      scheduler
    })
  }

  private stage: PomodoroStage = PomodoroStage.FOCUS

  private config: PomodoroTimerConfig

  private isRunning: boolean = false

  private remaining: Duration

  private numOfPomodoriCompleted: number = 0

  private scheduler: PeriodicTaskScheduler

  private timerStateSubscriptionManager = new SubscriptionManager<PomodoroTimerState>()

  private onStageComplete: (stage: PomodoroStage) => void = () => {}

  private constructor({
    timerConfig,
    scheduler
  }: {
    timerConfig: PomodoroTimerConfig
    scheduler: PeriodicTaskScheduler
  }) {
    this.config = this.newInternalConfig(timerConfig)
    this.remaining = timerConfig.focusDuration
    this.scheduler = scheduler
  }

  private newInternalConfig(config: PomodoroTimerConfig): PomodoroTimerConfig {
    return {
      ...config,
      focusDuration: this.roundUpToSeconds(config.focusDuration),
      shortBreakDuration: this.roundUpToSeconds(config.shortBreakDuration),
      longBreakDuration: this.roundUpToSeconds(config.longBreakDuration)
    }
  }

  private roundUpToSeconds(duration: Duration): Duration {
    return new Duration({
      seconds: duration.remainingSeconds()
    })
  }

  getState(): Readonly<PomodoroTimerState> {
    return {
      remainingSeconds: this.remaining.remainingSeconds(),
      isRunning: this.isRunning,
      stage: this.stage,
      numOfPomodoriCompleted: this.numOfPomodoriCompleted
    }
  }

  getConfig(): Readonly<PomodoroTimerConfig> {
    return this.config
  }

  setConfig(config: PomodoroTimerConfig) {
    this.config = this.newInternalConfig(config)
    this.setState({
      remainingSeconds: this.config.focusDuration.remainingSeconds(),
      isRunning: false,
      stage: PomodoroStage.FOCUS,
      numOfPomodoriCompleted: 0
    })
  }

  start() {
    if (this.isRunning) {
      return
    }

    const timerUnit = new Duration({ milliseconds: 100 })

    this.scheduler.scheduleTask(() => {
      this.advanceTime(timerUnit)
      if (this.remaining.totalMilliseconds % 1000 === 0) {
        this.broadcastTimerState()
      }
    }, timerUnit.totalMilliseconds)
    this.isRunning = true
    this.broadcastTimerState()
  }

  pause() {
    this.stopRunning()
    this.broadcastTimerState()
  }

  private advanceTime(duration: Duration) {
    this.remaining = this.remaining.subtract(duration)
    if (this.remaining.isZero()) {
      this.stopRunning()
      this.completeCurrentStage()
    }
  }

  private stopRunning() {
    this.isRunning = false
    this.scheduler.stopTask()
  }

  subscribeTimerState(callback: (state: PomodoroTimerState) => void) {
    const subscriptionId = this.timerStateSubscriptionManager.subscribe(callback)
    this.timerStateSubscriptionManager.publish(this.getState(), subscriptionId)
    return subscriptionId
  }

  unsubscribeTimerState(subscriptionId: number) {
    this.timerStateSubscriptionManager.unsubscribe(subscriptionId)
  }

  getTimerStateSubscriptionCount() {
    return this.timerStateSubscriptionManager.getSubscriptionCount()
  }

  setOnStageComplete(callback: (completedStage: PomodoroStage) => void) {
    this.onStageComplete = callback
  }

  restartShortBreak(nth?: number) {
    if (nth != null) {
      this.resetNumOfPomodoriCompleted(nth)
    }
    this.restart({ stage: PomodoroStage.SHORT_BREAK })
  }

  restartLongBreak() {
    this.restart({ stage: PomodoroStage.LONG_BREAK })
  }

  restartFocus(nth?: number) {
    if (nth != null) {
      this.resetNumOfPomodoriCompleted(nth - 1)
    }
    this.restart({ stage: PomodoroStage.FOCUS })
  }

  private resetNumOfPomodoriCompleted(n: number) {
    const upperLimit = this.config.numOfPomodoriPerCycle - 1
    n = Math.min(upperLimit, n)
    n = Math.max(0, n)
    this.numOfPomodoriCompleted = n
  }

  private restart({ stage }: { stage: PomodoroStage }) {
    this.stopRunning()
    switch (stage) {
      case PomodoroStage.FOCUS:
        this.setToBeginOfFocus()
        break
      case PomodoroStage.SHORT_BREAK:
        this.setToBeginOfShortBreak()
        break
      case PomodoroStage.LONG_BREAK:
        this.setToBeginOfLongBreak()
        break
    }
    this.start()
  }

  private broadcastTimerState() {
    this.timerStateSubscriptionManager.broadcast(this.getState())
  }

  private completeCurrentStage() {
    this.onStageComplete(this.stage)
    if (this.stage === PomodoroStage.FOCUS) {
      this.handleFocusComplete()
    } else {
      this.handleBreakComplete()
    }
  }

  private handleFocusComplete() {
    this.numOfPomodoriCompleted++

    if (this.numOfPomodoriCompleted >= this.config.numOfPomodoriPerCycle) {
      this.setToBeginOfLongBreak()
    } else {
      this.setToBeginOfShortBreak()
    }
  }

  private handleBreakComplete() {
    if (this.stage === PomodoroStage.LONG_BREAK) {
      this.numOfPomodoriCompleted = 0
    }
    this.setToBeginOfFocus()
  }

  private setToBeginOfLongBreak() {
    this.stage = PomodoroStage.LONG_BREAK
    this.remaining = this.config.longBreakDuration
  }

  private setToBeginOfShortBreak() {
    this.stage = PomodoroStage.SHORT_BREAK
    this.remaining = this.config.shortBreakDuration
  }

  private setToBeginOfFocus() {
    this.stage = PomodoroStage.FOCUS
    this.remaining = this.config.focusDuration
  }

  setState(state: PomodoroTimerState) {
    this.remaining = new Duration({ seconds: state.remainingSeconds })
    this.stage = state.stage
    this.numOfPomodoriCompleted = state.numOfPomodoriCompleted

    if (state.isRunning) {
      this.start()
    } else {
      this.pause()
    }
  }
}

export type PomodoroTimerState = {
  remainingSeconds: number
  isRunning: boolean
  stage: PomodoroStage
  numOfPomodoriCompleted: number
}
