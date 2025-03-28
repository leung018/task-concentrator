import { formatNumber } from '../../utils/util'

export class Time {
  readonly hour: number
  readonly minute: number

  static fromDate(date: Date): Time {
    return new Time(date.getHours(), date.getMinutes())
  }

  constructor(hour: number, minute: number) {
    if (hour < 0 || hour >= 24) {
      throw new TimeInvalidInputError('Invalid hour')
    }
    if (minute < 0 || minute >= 60) {
      throw new TimeInvalidInputError('Invalid minute')
    }

    this.hour = hour
    this.minute = minute
  }

  isBefore(otherTime: Time): boolean {
    if (this.hour < otherTime.hour) return true
    if (this.hour == otherTime.hour && this.minute < otherTime.minute) return true
    return false
  }

  toHhMmString(): string {
    return formatNumber(this.hour) + ':' + formatNumber(this.minute)
  }
}

export class TimeInvalidInputError extends Error {}
