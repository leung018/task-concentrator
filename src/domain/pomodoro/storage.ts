import { ChromeStorageFactory } from '../../chrome/storage'
import { FakeStorage, type Storage } from '../../infra/storage'
import type { TimerState } from './timer'

const STORAGE_KEY = 'timerState'

export class TimerStateStorageService {
  static create() {
    return new TimerStateStorageService(ChromeStorageFactory.createLocalStorage())
  }

  static createFake() {
    return new TimerStateStorageService(new FakeStorage())
  }

  private storage: Storage

  private constructor(storage: Storage) {
    this.storage = storage
  }

  async get(): Promise<TimerState | null> {
    return this.storage.get(STORAGE_KEY).then((result: any) => {
      if (result[STORAGE_KEY]) {
        return result[STORAGE_KEY]
      }

      return null
    })
  }

  async save(timerState: TimerState): Promise<void> {
    return this.storage.set({ [STORAGE_KEY]: timerState })
  }
}
