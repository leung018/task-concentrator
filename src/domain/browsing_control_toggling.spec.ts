import { describe, expect, it } from 'vitest'
import { FakeBrowsingControlService } from '../infra/browsing_control'
import { CurrentDateService } from '../infra/current_date'
import type { BlockingTimerIntegration } from './blocking_timer_integration'
import { BlockingTimerIntegrationStorageService } from './blocking_timer_integration/storage'
import { BrowsingControlTogglingService } from './browsing_control_toggling'
import { BrowsingRules } from './browsing_rules'
import { BrowsingRulesStorageService } from './browsing_rules/storage'
import { Weekday, WeeklySchedule } from './schedules'
import { WeeklyScheduleStorageService } from './schedules/storage'
import { Time } from './time'
import { Duration } from './timer/duration'
import { newFocusSessionRecord } from './timer/record'
import { FocusSessionRecordStorageService } from './timer/record/storage'
import { TimerStage } from './timer/stage'

describe('BrowsingControlTogglingService', () => {
  const browsingRules = new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })

  it('should toggle according to if current time is within schedule', async () => {
    const schedules = [
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.MON, Weekday.TUE]),
        startTime: new Time(9, 0),
        endTime: new Time(17, 0)
      })
    ]

    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules,
        currentDate: new Date('2025-02-03T11:00:00'), // 2025-02-03 is Monday
        shouldPauseBlockingDuringBreaks: false
      })
    ).toEqual(browsingRules)
    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules,
        currentDate: new Date('2025-02-03T17:01:00'),
        shouldPauseBlockingDuringBreaks: false
      })
    ).toBeNull()
  })

  it('should toggle according to target focus sessions complete if current time is within schedule and target focus sessions is set', async () => {
    const schedules = [
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.MON, Weekday.TUE]),
        startTime: new Time(9, 0),
        endTime: new Time(17, 0),
        targetFocusSessions: 2
      })
    ]

    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules,
        currentDate: new Date('2025-02-04T16:59:59'), // 2025-02-04 is Tuesday
        shouldPauseBlockingDuringBreaks: false,
        focusSessionRecords: [
          newFocusSessionRecord(new Date('2025-02-03T11:00:00')),
          newFocusSessionRecord(new Date('2025-02-03T11:26:00')),

          newFocusSessionRecord(new Date('2025-02-04T08:59:59')),
          newFocusSessionRecord(new Date('2025-02-04T09:00:00'))
        ]
      })
    ).toEqual(browsingRules)

    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules,
        currentDate: new Date('2025-02-03T16:59:59'),
        shouldPauseBlockingDuringBreaks: false,
        focusSessionRecords: [
          newFocusSessionRecord(new Date('2025-02-03T09:00:00')),
          newFocusSessionRecord(new Date('2025-02-03T16:59:59'))
        ]
      })
    ).toBeNull()
  })

  it('should always activate when weekly schedules are empty', async () => {
    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules: [],
        currentDate: new Date(),
        shouldPauseBlockingDuringBreaks: false
      })
    ).toEqual(browsingRules)
  })

  it('should overlapped schedules will make the blocking active when one of them is active', async () => {
    const schedules = [
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.MON]),
        startTime: new Time(9, 0),
        endTime: new Time(17, 0),
        targetFocusSessions: 1
      }),
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.MON]),
        startTime: new Time(10, 0),
        endTime: new Time(13, 0)
      })
    ]

    // 2025-02-03 is Monday
    expect(
      await getBrowsingRulesAfterToggling({
        browsingRules,
        schedules,
        focusSessionRecords: [newFocusSessionRecord(new Date('2025-02-03T10:00:00'))],
        currentDate: new Date('2025-02-03T11:00:00'),
        shouldPauseBlockingDuringBreaks: false
      })
    ).toEqual(browsingRules)
  })

  it.each([
    newTimerInfo({
      timerStage: TimerStage.SHORT_BREAK,
      isRunning: true,
      remainingSeconds: 99,
      shortBreakSeconds: 99
    }),
    newTimerInfo({
      timerStage: TimerStage.LONG_BREAK,
      isRunning: true,
      remainingSeconds: 99,
      longBreakSeconds: 99
    }),
    newTimerInfo({
      timerStage: TimerStage.SHORT_BREAK,
      isRunning: false,
      remainingSeconds: 98,
      shortBreakSeconds: 99
    }),
    newTimerInfo({
      timerStage: TimerStage.LONG_BREAK,
      isRunning: false,
      remainingSeconds: 98,
      longBreakSeconds: 99
    }),
    newTimerInfo({
      timerStage: TimerStage.SHORT_BREAK,
      isRunning: true,
      remainingSeconds: 0,
      shortBreakSeconds: 99
    }),
    newTimerInfo({
      timerStage: TimerStage.LONG_BREAK,
      isRunning: true,
      remainingSeconds: 0,
      longBreakSeconds: 99
    })
  ])(
    'should not activate browsing rules when timer is in break and shouldPauseBlockingDuringBreaks is enabled',
    async (timerInfo) => {
      expect(
        await getBrowsingRulesAfterToggling({
          browsingRules,
          schedules: [],
          shouldPauseBlockingDuringBreaks: true,
          timerInfo
        })
      ).toBeNull()
    }
  )

  it.each([
    {
      shouldPauseBlockingDuringBreaks: true,
      timerInfo: newTimerInfo({
        timerStage: TimerStage.FOCUS
      })
    },
    {
      shouldPauseBlockingDuringBreaks: false,
      timerInfo: newTimerInfo({
        timerStage: TimerStage.SHORT_BREAK,
        isRunning: true
      })
    },
    {
      shouldPauseBlockingDuringBreaks: false,
      timerInfo: newTimerInfo({
        timerStage: TimerStage.LONG_BREAK,
        isRunning: true
      })
    },
    {
      shouldPauseBlockingDuringBreaks: true,
      timerInfo: newTimerInfo({
        timerStage: TimerStage.SHORT_BREAK,
        isRunning: false,
        remainingSeconds: 99,
        shortBreakSeconds: 99
      })
    },
    {
      shouldPauseBlockingDuringBreaks: true,
      timerInfo: newTimerInfo({
        timerStage: TimerStage.LONG_BREAK,
        isRunning: false,
        remainingSeconds: 99,
        longBreakSeconds: 99
      })
    }
  ])(
    'should activate browsing rule if timer is not in break or shouldPauseBlockingDuringBreaks is disabled',
    async ({ shouldPauseBlockingDuringBreaks, timerInfo }) => {
      expect(
        await getBrowsingRulesAfterToggling({
          browsingRules,
          schedules: [],
          shouldPauseBlockingDuringBreaks,
          timerInfo
        })
      ).toEqual(browsingRules)
    }
  )
})

function newTimerInfo({
  timerStage = TimerStage.FOCUS,
  isRunning = false,
  remainingSeconds = 99,
  longBreakSeconds = 999,
  shortBreakSeconds = 499
} = {}) {
  return {
    timerStage,
    isRunning,
    remaining: new Duration({ seconds: remainingSeconds }),
    longBreak: new Duration({ seconds: longBreakSeconds }),
    shortBreak: new Duration({ seconds: shortBreakSeconds })
  }
}

async function getBrowsingRulesAfterToggling({
  browsingRules = new BrowsingRules(),
  schedules = [
    new WeeklySchedule({
      weekdaySet: new Set([Weekday.MON]),
      startTime: new Time(0, 0),
      endTime: new Time(23, 59)
    })
  ],
  currentDate = new Date(),
  shouldPauseBlockingDuringBreaks = false,
  timerInfo = newTimerInfo(),
  focusSessionRecords = [newFocusSessionRecord()]
} = {}) {
  const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
  await browsingRulesStorageService.save(browsingRules)

  const weeklyScheduleStorageService = WeeklyScheduleStorageService.createFake()
  await weeklyScheduleStorageService.saveAll(schedules)

  const currentDateService = CurrentDateService.createFake(currentDate)

  const browsingControlService = new FakeBrowsingControlService()

  const blockingTimerIntegration: BlockingTimerIntegration = {
    shouldPauseBlockingDuringBreaks
  }
  const blockingTimerIntegrationStorageService = BlockingTimerIntegrationStorageService.createFake()
  await blockingTimerIntegrationStorageService.save(blockingTimerIntegration)

  const focusSessionRecordStorageService = FocusSessionRecordStorageService.createFake()
  await focusSessionRecordStorageService.saveAll(focusSessionRecords)

  const browsingControlTogglingService = BrowsingControlTogglingService.createFake({
    browsingRulesStorageService,
    browsingControlService,
    weeklyScheduleStorageService,
    currentDateService,
    blockingTimerIntegrationStorageService,
    focusSessionRecordStorageService,
    timerInfoGetter: { getTimerInfo: () => timerInfo }
  })

  await browsingControlTogglingService.run()

  return browsingControlService.getActivatedBrowsingRules()
}
