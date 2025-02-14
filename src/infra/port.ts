import EventEmitter from 'events'

export interface Port {
  send(message: any): void
  addListener(callback: (message: any) => void): void
}
export class FakePort implements Port {
  private emitter: EventEmitter
  private id: string
  private otherId: string

  static createPaired(): [Port, Port] {
    const emitter = new EventEmitter()
    const port1 = new FakePort(emitter, 'port1', 'port2')
    const port2 = new FakePort(emitter, 'port2', 'port1')

    return [port1, port2]
  }

  private constructor(emitter: EventEmitter, id: string, otherId: string) {
    this.emitter = emitter
    this.id = id
    this.otherId = otherId
  }

  send(message: any): void {
    this.emitter.emit(this.otherId, message)
  }

  addListener(callback: (message: any) => void): void {
    this.emitter.on(this.id, callback)
  }
}
