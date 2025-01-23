import type { Time } from './time'

export enum Weekday {
  Sun = 0,
  Mon,
  Tue,
  Wed,
  Thu,
  Fri,
  Sat
}

export class WeeklySchedule {
  weekdaySet: ReadonlySet<Weekday>
  readonly startTime: Time
  readonly endTime: Time

  constructor({
    weekdaySet,
    startTime,
    endTime
  }: {
    weekdaySet: ReadonlySet<Weekday>
    startTime: Time
    endTime: Time
  }) {
    if (weekdaySet.size === 0) {
      throw new WeeklyScheduleInvalidInputError('Empty weekday set')
    }

    this.weekdaySet = weekdaySet
    this.startTime = startTime
    this.endTime = endTime
  }
}

export class WeeklyScheduleInvalidInputError extends Error {}
