import type { TimerState } from '@/domain/pomodoro/state'

export enum WorkResponseName {
  TIMER_STATE,
  POMODORO_RECORDS_UPDATED
}

type WorkResponsePayloadMap = {
  [WorkResponseName.TIMER_STATE]: TimerState
  [WorkResponseName.POMODORO_RECORDS_UPDATED]: undefined
}

export type WorkResponse = {
  name: WorkResponseName
  payload?: WorkResponsePayloadMap[WorkResponseName]
}
