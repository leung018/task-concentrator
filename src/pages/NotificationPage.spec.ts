import { describe, expect, it } from 'vitest'
import {
  newTestNotificationSetting,
  type NotificationSetting
} from '../domain/notification_setting'
import { flushPromises, mount } from '@vue/test-utils'
import NotificationPage from './NotificationPage.vue'
import { assertCheckboxValue } from '../test_utils/assert'
import { dataTestSelector } from '../test_utils/selector'
import { NotificationSettingStorageService } from '../domain/notification_setting/storage'

describe('NotificationPage', () => {
  it('should render the saved notification setting', async () => {
    const { wrapper } = await mountPage({
      notificationSetting: {
        reminderTab: true,
        desktopNotification: false,
        sound: true
      }
    })

    assertCheckboxValue(wrapper, dataTestSelector('reminder-tab-option'), true)
    assertCheckboxValue(wrapper, dataTestSelector('desktop-notification-option'), false)
    assertCheckboxValue(wrapper, dataTestSelector('sound-option'), true)
  })

  it('should update the notification setting when the user changes the options', async () => {
    const { wrapper, notificationSettingStorageService } = await mountPage({
      notificationSetting: {
        reminderTab: false,
        desktopNotification: false,
        sound: false
      }
    })

    const reminderTabOption = wrapper.find(dataTestSelector('reminder-tab-option'))
    const desktopNotificationOption = wrapper.find(dataTestSelector('desktop-notification-option'))
    const soundOption = wrapper.find(dataTestSelector('sound-option'))

    await Promise.all([
      reminderTabOption.setValue(true),
      desktopNotificationOption.setValue(true),
      soundOption.setValue(true)
    ])

    wrapper.find(dataTestSelector('save-button')).trigger('click')
    await flushPromises()

    const expected: NotificationSetting = {
      reminderTab: true,
      desktopNotification: true,
      sound: true
    }
    expect(await notificationSettingStorageService.get()).toEqual(expected)
  })
})

async function mountPage({ notificationSetting = newTestNotificationSetting() }) {
  const notificationSettingStorageService = NotificationSettingStorageService.createFake()
  await notificationSettingStorageService.save(notificationSetting)
  const wrapper = mount(NotificationPage, {
    props: {
      notificationSettingStorageService
    }
  })
  await flushPromises()
  return { wrapper, notificationSettingStorageService }
}
