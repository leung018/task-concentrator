import { Duration } from '../duration'

export class PomodoroTimerConfig {
  static newTestInstance({
    focusDuration = new Duration({ minutes: 25 }),
    shortBreakDuration = new Duration({ minutes: 5 }),
    longBreakDuration = new Duration({ minutes: 15 }),
    numOfPomodoriPerCycle = 4
  } = {}): PomodoroTimerConfig {
    return new PomodoroTimerConfig({
      focusDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomodoriPerCycle
    })
  }

  readonly focusDuration: Duration
  readonly shortBreakDuration: Duration
  readonly longBreakDuration: Duration
  readonly numOfPomodoriPerCycle: number

  constructor({
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfPomodoriPerCycle
  }: {
    focusDuration: Duration
    shortBreakDuration: Duration
    longBreakDuration: Duration
    numOfPomodoriPerCycle: number
  }) {
    if (
      focusDuration.totalMilliseconds < 1000 ||
      shortBreakDuration.totalMilliseconds < 1000 ||
      longBreakDuration.totalMilliseconds < 1000
    ) {
      throw new Error('Duration must not be less than 1 second')
    }

    if (numOfPomodoriPerCycle < 1) {
      throw new Error('Number of pomodori per cycle must be greater than 0')
    }

    this.focusDuration = focusDuration
    this.shortBreakDuration = shortBreakDuration
    this.longBreakDuration = longBreakDuration
    this.numOfPomodoriPerCycle = numOfPomodoriPerCycle
  }
}
