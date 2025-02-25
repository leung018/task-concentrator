import config from '../../config'
import {
  FakePeriodicTaskScheduler,
  PeriodicTaskSchedulerImpl,
  type PeriodicTaskScheduler
} from '../../infra/scheduler'
import type { PomodoroTimerConfig } from './config'
import { Duration } from './duration'
import { PomodoroStage } from './stage'

export class PomodoroTimer {
  static create() {
    return new PomodoroTimer({
      scheduler: new PeriodicTaskSchedulerImpl(),
      config: config.getPomodoroTimerConfig()
    })
  }

  static createFake({
    scheduler = new FakePeriodicTaskScheduler(),
    focusDuration = new Duration({ minutes: 25 }),
    shortBreakDuration = new Duration({ minutes: 5 }),
    longBreakDuration = new Duration({ minutes: 15 }),
    numOfFocusPerCycle = 4
  } = {}) {
    const config: PomodoroTimerConfig = {
      focusDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfFocusPerCycle
    }
    return new PomodoroTimer({
      config,
      scheduler
    })
  }

  private stage: PomodoroStage = PomodoroStage.FOCUS

  private focusDuration: Duration

  private shortBreakDuration: Duration

  private longBreakDuration: Duration

  private numOfFocusPerCycle: number

  private isRunning: boolean = false

  private remaining: Duration

  private numOfFocusCompleted: number = 0

  private scheduler: PeriodicTaskScheduler

  private onTimerUpdate: (state: PomodoroTimerState) => void = () => {}

  private onStageTransit: () => void = () => {}

  private constructor({
    config,
    scheduler
  }: {
    config: PomodoroTimerConfig
    scheduler: PeriodicTaskScheduler
  }) {
    this.focusDuration = config.focusDuration
    this.shortBreakDuration = config.shortBreakDuration
    this.longBreakDuration = config.longBreakDuration
    this.numOfFocusPerCycle = config.numOfFocusPerCycle

    this.remaining = config.focusDuration
    this.scheduler = scheduler
  }

  getState(): Readonly<PomodoroTimerState> {
    return {
      remaining: this.remaining,
      isRunning: this.isRunning,
      stage: this.stage
    }
  }

  start() {
    if (this.isRunning) {
      return
    }

    const timerUnit = new Duration({ milliseconds: 100 })

    this.scheduler.scheduleTask(() => {
      this.advanceTime(timerUnit)
      this.publishTimerUpdate()
    }, timerUnit.totalMilliseconds)
    this.isRunning = true
    this.publishTimerUpdate()
  }

  pause() {
    this.isRunning = false
    this.scheduler.stopTask()
  }

  private advanceTime(duration: Duration) {
    this.remaining = this.remaining.subtract(duration)
    if (this.remaining.isZero()) {
      this.pause()
      this.transit()
    }
  }

  setOnTimerUpdate(callback: (state: PomodoroTimerState) => void) {
    this.onTimerUpdate = callback
  }

  setOnStageTransit(callback: () => void) {
    this.onStageTransit = callback
  }

  private publishTimerUpdate() {
    this.onTimerUpdate(this.getState())
  }

  private transit() {
    if (this.stage === PomodoroStage.FOCUS) {
      this.numOfFocusCompleted++

      if (this.numOfFocusCompleted === this.numOfFocusPerCycle) {
        this.stage = PomodoroStage.LONG_BREAK
        this.remaining = this.longBreakDuration
        this.numOfFocusCompleted = 0
      } else {
        this.stage = PomodoroStage.SHORT_BREAK
        this.remaining = this.shortBreakDuration
      }
    } else {
      this.stage = PomodoroStage.FOCUS
      this.remaining = this.focusDuration
    }
    this.onStageTransit()
  }
}

export type PomodoroTimerState = {
  remaining: Duration
  isRunning: boolean
  stage: PomodoroStage
}
