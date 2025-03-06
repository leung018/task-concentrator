import { ChromeLocalStorageFactory } from '../../chrome/storage'
import { FakeChromeLocalStorage, type StorageHandler } from '../../infra/storage'
import { Time } from '../time'

export class DailyCutoffTimeStorageService {
  static create() {
    return new DailyCutoffTimeStorageService(ChromeLocalStorageFactory.createStorageHandler())
  }

  static createFake() {
    return new DailyCutoffTimeStorageService(new FakeChromeLocalStorage())
  }

  private storageHandler: StorageHandler

  private constructor(storageHandler: StorageHandler) {
    this.storageHandler = storageHandler
  }

  async save(dailyCutoffTime: Time) {
    return this.storageHandler.set({
      dailyCutoffTime: serializeTime(dailyCutoffTime)
    })
  }

  async get(): Promise<Time> {
    return this.storageHandler.get('dailyCutoffTime').then((result) => {
      if (result.dailyCutoffTime) {
        return deserializeTime(result.dailyCutoffTime)
      }

      return new Time(0, 0)
    })
  }
}

type SerializedTime = {
  hour: number
  minute: number
}

function serializeTime(time: Time): SerializedTime {
  return {
    hour: time.hour,
    minute: time.minute
  }
}

function deserializeTime(data: SerializedTime): Time {
  return new Time(data.hour, data.minute)
}
