import * as fs from 'fs'
import process from 'process'

const manifestConfig = {
  manifest_version: 3,
  name: 'Task Concentrator',
  description: 'TODO: Write a description',
  version: '0.1',
  version_name: process.env.TAG_NAME || 'local',
  action: {
    default_popup: 'popup.html',
    default_icon: {
      32: 'icon.png' // I am using a 120x120 icon because I reuse the same image for iconUrl of notification. See src/chrome/notifications.ts about the notification.
    }
  },
  background: {
    service_worker: 'src/service_workers/index.ts'
  },
  options_page: 'options.html',
  permissions: ['storage', 'unlimitedStorage', 'declarativeNetRequest', 'alarms', 'notifications'],
  host_permissions: ['<all_urls>'],
  web_accessible_resources: [
    {
      resources: ['blocked.html'], // Making blocked template accessible can solve the problem of clicking the blocked domain from the google search results triggering ERR_BLOCKED_BY_CLIENT.
      matches: ['<all_urls>']
    }
  ]
}

fs.writeFileSync('manifest.json', JSON.stringify(manifestConfig, null, 2))
