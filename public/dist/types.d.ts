/**
 * zForms Tracking Script Types
 */
export type EventType = 'focus' | 'blur' | 'submit' | 'abandon' | 'error' | 'change' | 'interaction';
export interface zFormsEvent {
    form_id: string;
    field_id: string;
    event_type: EventType;
    time_spent_ms?: number;
    session_id: string;
    timestamp: string;
    metadata?: {
        interaction_count?: number;
        field_completed?: boolean;
        validation_errors?: number;
        field_position?: number;
        total_fields?: number;
        abandonment_field?: string;
    };
}
export interface zFormsConfig {
    project_key: string;
    api_url?: string;
    batch_size?: number;
    batch_interval?: number;
    debug?: boolean;
    track_changes?: boolean;
    debounce_time?: number;
}
export interface EventBatch {
    project_key: string;
    events: zFormsEvent[];
}
export interface FormFieldState {
    field_id: string;
    focus_time: number | null;
    last_event: EventType | null;
    interaction_count: number;
    total_time_spent: number;
    has_value: boolean;
    validation_errors: number;
    field_element: WeakRef<HTMLElement>;
    blur_debounce_timer: number | null;
}
export interface FormState {
    form_id: string;
    field_states: Map<string, FormFieldState>;
    submitted: boolean;
    last_focused_field: string | null;
    total_fields: number;
}
export interface SessionData {
    session_id: string;
    started_at: number;
    form_states: Map<string, FormState>;
}
//# sourceMappingURL=types.d.ts.map