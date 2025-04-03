export enum WorkRequestName {
  TOGGLE_BROWSING_RULES,
  START_TIMER,
  LISTEN_TO_TIMER,
  PAUSE_TIMER,
  RESTART_FOCUS,
  RESTART_SHORT_BREAK,
  RESTART_LONG_BREAK,
  LISTEN_TO_POMODORO_RECORDS_UPDATE,
  RESET_TIMER_CONFIG
}

export type RestartNthPayload = {
  nth: number
}

export type WorkRequestPayloadMap = {
  [WorkRequestName.TOGGLE_BROWSING_RULES]: undefined
  [WorkRequestName.START_TIMER]: undefined
  [WorkRequestName.LISTEN_TO_TIMER]: undefined
  [WorkRequestName.PAUSE_TIMER]: undefined
  [WorkRequestName.RESTART_FOCUS]: RestartNthPayload
  [WorkRequestName.RESTART_SHORT_BREAK]: RestartNthPayload
  [WorkRequestName.RESTART_LONG_BREAK]: undefined
  [WorkRequestName.LISTEN_TO_POMODORO_RECORDS_UPDATE]: undefined
  [WorkRequestName.RESET_TIMER_CONFIG]: undefined
}

export type WorkRequest = {
  name: WorkRequestName
  payload?: WorkRequestPayloadMap[WorkRequestName]
}
