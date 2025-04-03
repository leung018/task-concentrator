import { FakeBrowsingControlService, type BrowsingControlService } from './browsing_control'
import { BrowsingRulesStorageService } from './browsing_rules/storage'
import type { WeeklySchedule } from './schedules'
import { WeeklyScheduleStorageService } from './schedules/storage'
import { ChromeBrowsingControlService } from '../chrome/browsing_control'

export class BrowsingControlTogglingService {
  readonly browsingControlService: BrowsingControlService
  readonly browsingRulesStorageService: BrowsingRulesStorageService
  readonly weeklyScheduleStorageService: WeeklyScheduleStorageService

  static create() {
    return new BrowsingControlTogglingService({
      browsingControlService: new ChromeBrowsingControlService(),
      browsingRulesStorageService: BrowsingRulesStorageService.create(),
      weeklyScheduleStorageService: WeeklyScheduleStorageService.create()
    })
  }

  static createFake({
    browsingControlService = new FakeBrowsingControlService(),
    browsingRulesStorageService = BrowsingRulesStorageService.createFake(),
    weeklyScheduleStorageService = WeeklyScheduleStorageService.createFake()
  } = {}) {
    return new BrowsingControlTogglingService({
      browsingControlService,
      browsingRulesStorageService,
      weeklyScheduleStorageService
    })
  }

  constructor({
    browsingControlService,
    browsingRulesStorageService,
    weeklyScheduleStorageService
  }: {
    browsingControlService: BrowsingControlService
    browsingRulesStorageService: BrowsingRulesStorageService
    weeklyScheduleStorageService: WeeklyScheduleStorageService
  }) {
    this.browsingControlService = browsingControlService
    this.browsingRulesStorageService = browsingRulesStorageService
    this.weeklyScheduleStorageService = weeklyScheduleStorageService
  }

  async run(currentTime: Date = new Date()): Promise<void> {
    const schedules = await this.weeklyScheduleStorageService.getAll()

    if (isDateWithinSchedules(currentTime, schedules)) {
      return this.browsingRulesStorageService.get().then((browsingRules) => {
        return this.browsingControlService.setAndActivateNewRules(browsingRules)
      })
    }

    return this.browsingControlService.deactivateExistingRules()
  }
}

function isDateWithinSchedules(date: Date, schedules: ReadonlyArray<WeeklySchedule>) {
  if (schedules.length === 0) {
    return true
  }
  return schedules.some((schedule) => schedule.isContain(date))
}
