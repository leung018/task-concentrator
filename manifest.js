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
      32: 'favicon.png'
    }
  },
  background: {
    service_worker: 'src/service_workers/index.ts'
  },
  options_page: 'options.html',
  permissions: ['storage', 'unlimitedStorage', 'declarativeNetRequest', 'alarms', 'notifications'],
  host_permissions: ['<all_urls>']
}

fs.writeFileSync('manifest.json', JSON.stringify(manifestConfig, null, 2))
