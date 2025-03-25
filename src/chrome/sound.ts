import type { ActionService } from '../infra/action'

export class SoundService implements ActionService {
  // Require manual testing
  private soundFile: string

  constructor(soundFile: string = 'notification.mp3') {
    this.soundFile = soundFile
  }

  trigger(): void {
    new Audio(chrome.runtime.getURL(this.soundFile)).play()
  }
}
