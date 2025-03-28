import type { PomodoroTimerConfig } from '.'
import { ChromeStorageFactory } from '../../../chrome/storage'
import config from '../../../config'
import { FakeStorage, type Storage } from '../../../infra/storage'
import { deserializePomodoroTimerConfig, serializePomodoroTimerConfig } from './serialize'

export class PomodoroTimerConfigStorageService {
  static create() {
    return new PomodoroTimerConfigStorageService(ChromeStorageFactory.createLocalStorage())
  }

  static createFake() {
    return new PomodoroTimerConfigStorageService(new FakeStorage())
  }

  private storage: Storage

  private constructor(storage: Storage) {
    this.storage = storage
  }

  async get(): Promise<PomodoroTimerConfig> {
    return this.storage.get('pomodoroTimerConfig').then((result: any) => {
      if (result.pomodoroTimerConfig) {
        return deserializePomodoroTimerConfig(result.pomodoroTimerConfig)
      }

      return config.getDefaultPomodoroTimerConfig()
    })
  }

  async save(pomodoroTimerConfig: PomodoroTimerConfig) {
    return this.storage.set({
      pomodoroTimerConfig: serializePomodoroTimerConfig(pomodoroTimerConfig)
    })
  }
}
