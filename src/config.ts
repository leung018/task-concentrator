import type { NotificationSetting } from './domain/notification_setting'
import { TimerConfig } from './domain/pomodoro/config'
import { Duration } from './domain/pomodoro/duration'
import type { BadgeColor } from './infra/badge'

const getBlockedTemplateUrl = () => {
  return chrome.runtime.getURL('blocked.html')
}

const getReminderPageUrl = () => {
  return chrome.runtime.getURL('reminder.html')
}

const getDefaultTimerConfig = () => {
  return new TimerConfig({
    focusDuration: new Duration({ minutes: 26 }),
    shortBreakDuration: new Duration({ minutes: 5 }),
    longBreakDuration: new Duration({ minutes: 19 }),
    focusSessionsPerCycle: 4
  })
}

const getDefaultNotificationSetting = () => {
  const notificationSetting: NotificationSetting = {
    reminderTab: true,
    desktopNotification: true,
    sound: true
  }
  return notificationSetting
}

const getFocusSessionRecordHouseKeepDays = () => 30

const getBadgeColorConfig = (): {
  focusBadgeColor: BadgeColor
  breakBadgeColor: BadgeColor
} => {
  return {
    focusBadgeColor: {
      textColor: '#ffffff',
      backgroundColor: '#ff0000'
    },
    breakBadgeColor: {
      textColor: '#ffffff',
      backgroundColor: '#6495ed'
    }
  }
}

export default {
  getDefaultTimerConfig,
  getFocusSessionRecordHouseKeepDays,
  getBlockedTemplateUrl,
  getBadgeColorConfig,
  getReminderPageUrl,
  getDefaultNotificationSetting
}
