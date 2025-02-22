import { BackgroundListener } from './listener'
import { RedirectTogglingService } from '../domain/redirect_toggling'

const redirectTogglingService = RedirectTogglingService.create()

// Noted that e2e tests are hard to cover below related to alarms properly. Better use a bit manual testing if needed.
// Wrapper isn't used for alarms listener which is different from chrome.runtime.onMessage wrapped by MessageListenersInitializer.
// Because unit tests are not needed for alarms.
chrome.alarms.onAlarm.addListener((alarm) => {
  console.debug('Alarm fired:', alarm)
  redirectTogglingService.run()
})
chrome.alarms.create({ periodInMinutes: 0.5, when: Date.now() })

BackgroundListener.create().start()
