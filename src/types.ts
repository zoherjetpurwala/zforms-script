/**
 * zForms Tracking Script Types
 */

export type EventType = 'focus' | 'blur' | 'submit' | 'abandon' | 'error'

export interface zFormsEvent {
  form_id: string
  field_id: string
  event_type: EventType
  time_spent_ms?: number
  session_id: string
  timestamp: string
}

export interface zFormsConfig {
  project_key: string
  api_url?: string
  batch_size?: number
  batch_interval?: number
  debug?: boolean
}

export interface EventBatch {
  project_key: string
  events: zFormsEvent[]
}

export interface FormFieldState {
  field_id: string
  focus_time: number | null
  last_event: EventType | null
}

export interface SessionData {
  session_id: string
  started_at: number
  form_states: Map<string, Map<string, FormFieldState>>
}
