import { type CommunicationManager, type Port } from '../infra/communication'

export class ChromeCommunicationManager implements CommunicationManager {
  clientConnect() {
    const chromePort = chrome.runtime.connect()
    return new ChromePortWrapper(chromePort)
  }

  onNewClientConnect(callback: (backgroundPort: Port) => void) {
    chrome.runtime.onConnect.addListener((chromePort) => {
      const port = new ChromePortWrapper(chromePort)
      return callback(port)
    })
  }
}

class ChromePortWrapper implements Port {
  private chromePort: chrome.runtime.Port

  constructor(chromePort: chrome.runtime.Port) {
    this.chromePort = chromePort
  }

  send(message: any): void {
    try {
      this.chromePort.postMessage(message)
    } catch (error) {
      console.error('Error sending message:', error)
      this.chromePort = chrome.runtime.connect()
      return this.send(message)
    }
  }

  onMessage(callback: (message: any) => void): void {
    this.chromePort.onMessage.addListener(callback)
  }

  onDisconnect(callback: () => void): void {
    this.chromePort.onDisconnect.addListener(callback)
  }

  disconnect(): void {
    this.chromePort.disconnect()
  }
}
