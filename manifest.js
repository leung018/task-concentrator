import * as fs from 'fs'
import process from 'process'

const manifestConfig = {
  manifest_version: 3,
  name: process.env.NAME || 'Task Concentrator',
  description: process.env.DESCRIPTION || 'TODO: Write a description',
  version: process.env.VERSION || '0.1',
  version_name: process.env.TAG_NAME || 'local',
  action: {
    default_popup: 'popup.html'
  },
  icons: {
    128: 'icon.png'
  },
  background: {
    service_worker: 'src/service_workers/index.ts'
  },
  options_page: 'options.html',
  permissions: ['storage', 'alarms', 'notifications', 'tabs', 'contextMenus'],
  web_accessible_resources: [
    {
      resources: ['blocked.html'], // Making blocked template accessible can solve the problem of clicking the blocked domain from the google search results triggering ERR_BLOCKED_BY_CLIENT.
      matches: ['<all_urls>']
    }
  ]
}

fs.writeFileSync('manifest.json', JSON.stringify(manifestConfig, null, 2))
