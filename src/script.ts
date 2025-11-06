/**
 * zForms Tracking Script
 * Privacy-first form analytics
 */

import type { zFormsConfig, zFormsEvent, FormFieldState } from './types'
import { EventQueue } from './queue'

class zForms {
  private config: zFormsConfig
  private queue: EventQueue
  private sessionId: string
  private fieldStates: Map<string, FormFieldState> = new Map()
  private initialized = false

  constructor(config: zFormsConfig) {
    this.config = {
      api_url: 'https://zForms.xyz/api/zForms/events',
      batch_size: 10,
      batch_interval: 5000,
      debug: false,
      ...config,
    }

    this.sessionId = this.generateSessionId()
    this.queue = new EventQueue(
      this.config.api_url!,
      this.config.project_key,
      this.config.batch_size,
      this.config.batch_interval,
      this.config.debug
    )

    this.init()
  }

  /**
   * Initialize tracking
   */
  private init(): void {
    if (this.initialized) return

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.attachListeners())
    } else {
      this.attachListeners()
    }

    this.initialized = true

    if (this.config.debug) {
      console.log('[zForms] Initialized with session:', this.sessionId)
    }
  }

  /**
   * Attach event listeners to all form inputs
   */
  private attachListeners(): void {
    const forms = document.querySelectorAll('form')

    forms.forEach((form) => {
      const formId = this.getFormId(form)

      // Track all input fields
      const fields = form.querySelectorAll(
        'input:not([type="hidden"]):not([type="password"]), select, textarea'
      )

      fields.forEach((field) => {
        const fieldId = this.getFieldId(field as HTMLElement)
        const stateKey = `${formId}_${fieldId}`

        // Initialize field state
        this.fieldStates.set(stateKey, {
          field_id: fieldId,
          focus_time: null,
          last_event: null,
        })

        // Focus event
        field.addEventListener('focus', () => {
          this.handleFocus(formId, fieldId, stateKey)
        })

        // Blur event
        field.addEventListener('blur', () => {
          this.handleBlur(formId, fieldId, stateKey)
        })

        // Error event
        field.addEventListener('invalid', () => {
          this.handleError(formId, fieldId)
        })
      })

      // Submit event
      form.addEventListener('submit', () => {
        this.handleSubmit(formId)
      })
    })

    // Track form abandonment (user leaves without submitting)
    this.setupAbandonmentTracking()
  }

  /**
   * Handle focus event
   */
  private handleFocus(formId: string, fieldId: string, stateKey: string): void {
    const state = this.fieldStates.get(stateKey)
    if (!state) return

    state.focus_time = Date.now()
    state.last_event = 'focus'

    this.trackEvent({
      form_id: formId,
      field_id: fieldId,
      event_type: 'focus',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Handle blur event
   */
  private handleBlur(formId: string, fieldId: string, stateKey: string): void {
    const state = this.fieldStates.get(stateKey)
    if (!state || !state.focus_time) return

    const timeSpent = Date.now() - state.focus_time
    state.focus_time = null
    state.last_event = 'blur'

    this.trackEvent({
      form_id: formId,
      field_id: fieldId,
      event_type: 'blur',
      time_spent_ms: timeSpent,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Handle form submission
   */
  private handleSubmit(formId: string): void {
    this.trackEvent({
      form_id: formId,
      field_id: '__form__',
      event_type: 'submit',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    })

    // Force send immediately
    this.queue.flush()
  }

  /**
   * Handle field validation error
   */
  private handleError(formId: string, fieldId: string): void {
    this.trackEvent({
      form_id: formId,
      field_id: fieldId,
      event_type: 'error',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Setup abandonment tracking
   */
  private setupAbandonmentTracking(): void {
    let hasInteracted = false

    // Track if user has interacted with any field
    document.addEventListener(
      'focusin',
      (e) => {
        const target = e.target as HTMLElement
        if (
          target.matches('input, select, textarea') &&
          target.closest('form')
        ) {
          hasInteracted = true
        }
      },
      true
    )

    // Track abandonment on page leave
    window.addEventListener('beforeunload', () => {
      if (!hasInteracted) return

      // Check for any forms that were started but not submitted
      const forms = document.querySelectorAll('form')
      forms.forEach((form) => {
        const formId = this.getFormId(form)
        const hasSubmitted = Array.from(this.fieldStates.values()).some(
          (state) => state.last_event === 'submit'
        )

        if (!hasSubmitted) {
          this.trackEvent({
            form_id: formId,
            field_id: '__form__',
            event_type: 'abandon',
            session_id: this.sessionId,
            timestamp: new Date().toISOString(),
          })
        }
      })
    })
  }

  /**
   * Track an event
   */
  private trackEvent(event: zFormsEvent): void {
    this.queue.add(event)
  }

  /**
   * Get form identifier
   */
  private getFormId(form: HTMLFormElement): string {
    return (
      form.id ||
      form.getAttribute('name') ||
      form.getAttribute('data-form-id') ||
      `form_${Array.from(document.querySelectorAll('form')).indexOf(form)}`
    )
  }

  /**
   * Get field identifier
   */
  private getFieldId(field: HTMLElement): string {
    return (
      field.id ||
      field.getAttribute('name') ||
      field.getAttribute('data-field-id') ||
      `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    )
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    // Try to reuse session ID from sessionStorage
    const stored = sessionStorage.getItem('zForms_session_id')
    if (stored) return stored

    // Generate new session ID
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('zForms_session_id', sessionId)
    return sessionId
  }

  /**
   * Public API: Manually track custom event
   */
  public track(formId: string, fieldId: string, eventType: string): void {
    if (!['focus', 'blur', 'submit', 'abandon', 'error'].includes(eventType)) {
      console.warn('[zForms] Invalid event type:', eventType)
      return
    }

    this.trackEvent({
      form_id: formId,
      field_id: fieldId,
      event_type: eventType as any,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Public API: Destroy instance
   */
  public destroy(): void {
    this.queue.destroy()
    this.fieldStates.clear()
    this.initialized = false
  }
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Check for script tag with data-zForms attribute
const scriptTag = document.currentScript as HTMLScriptElement
const projectKey = scriptTag?.getAttribute('data-zForms')

if (projectKey) {
  const config: zFormsConfig = {
    project_key: projectKey,
    api_url: scriptTag?.getAttribute('data-api-url') || undefined,
    debug: scriptTag?.hasAttribute('data-debug'),
  }

  // Initialize automatically
  const instance = new zForms(config)

  // Expose to window for manual control
  ;(window as any).zForms = instance
  ;(window as any).zFormsClass = zForms
} else {
  // Expose class for manual initialization
  ;(window as any).zForms = zForms
}

export default zForms
