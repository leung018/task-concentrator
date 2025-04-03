import { describe, expect, it } from 'vitest'
import { BrowsingRules } from './browsing_rules'
import { BrowsingRulesStorageService } from './browsing_rules/storage'
import { FakeBrowsingControlService } from './browsing_control'
import { Weekday, WeeklySchedule } from './schedules'
import { Time } from './time'
import { WeeklyScheduleStorageService } from './schedules/storage'
import { BrowsingControlTogglingService } from './browsing_control_toggling'

describe('BrowsingControlTogglingService', () => {
  it('should toggle according to browsing rules if current time is within schedule', async () => {
    const browsingRules = new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })
    const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
    browsingRulesStorageService.save(browsingRules)

    const schedules = [
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.MON, Weekday.TUE]),
        startTime: new Time(9, 0),
        endTime: new Time(17, 0)
      })
    ]
    const weeklyScheduleStorageService = WeeklyScheduleStorageService.createFake()
    weeklyScheduleStorageService.saveAll(schedules)

    const browsingControlService = new FakeBrowsingControlService()

    const browsingControlTogglingService = BrowsingControlTogglingService.createFake({
      browsingRulesStorageService,
      browsingControlService,
      weeklyScheduleStorageService
    })

    await browsingControlTogglingService.run(new Date('2025-02-03T11:00:00')) // 2025-02-03 is Mon

    expect(browsingControlService.getActivatedBrowsingRules()).toEqual(browsingRules)

    await browsingControlTogglingService.run(new Date('2025-02-03T17:01:00'))
    expect(browsingControlService.getActivatedBrowsingRules()).toBeNull()
  })

  it('should always activate when weekly schedules are empty', async () => {
    const browsingRules = new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })
    const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
    browsingRulesStorageService.save(browsingRules)

    const weeklyScheduleStorageService = WeeklyScheduleStorageService.createFake()

    const browsingControlService = new FakeBrowsingControlService()

    const browsingControlTogglingService = BrowsingControlTogglingService.createFake({
      browsingRulesStorageService,
      browsingControlService,
      weeklyScheduleStorageService
    })

    await browsingControlTogglingService.run()

    expect(browsingControlService.getActivatedBrowsingRules()).toEqual(browsingRules)
  })
})
