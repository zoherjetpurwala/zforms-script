/**
 * zForms Tracking Script
 * Privacy-first form analytics with optimized resource usage
 */

import type { zFormsConfig, zFormsEvent, FormFieldState, FormState } from './types'
import { EventQueue } from './queue'

class zForms {
  private config: zFormsConfig
  private queue: EventQueue
  private sessionId: string
  private formStates: Map<string, FormState> = new Map()
  private initialized = false
  private mutationObserver: MutationObserver | null = null

  constructor(config: zFormsConfig) {
    this.config = {
      api_url: 'https://zForms.xyz/api/zForms/events',
      batch_size: 10,
      batch_interval: 5000,
      debug: false,
      track_changes: false, // Default to false for better performance
      debounce_time: 300, // 300ms debounce for blur events
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
      document.addEventListener('DOMContentLoaded', () => this.setupTracking())
    } else {
      this.setupTracking()
    }

    this.initialized = true

    if (this.config.debug) {
      console.log('[zForms] Initialized with session:', this.sessionId)
    }
  }

  /**
   * Setup tracking for all forms
   */
  private setupTracking(): void {
    this.attachListeners()
    this.setupDynamicFormTracking()
    this.setupAbandonmentTracking()
  }

  /**
   * Setup tracking for dynamically added forms
   */
  private setupDynamicFormTracking(): void {
    // Use MutationObserver to detect dynamically added forms
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLFormElement) {
              this.attachFormListeners(node)
            } else if (node instanceof HTMLElement) {
              const forms = node.querySelectorAll('form')
              forms.forEach((form) => this.attachFormListeners(form))
            }
          })
        }
      }
    })

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  /**
   * Attach event listeners to all existing forms
   */
  private attachListeners(): void {
    const forms = document.querySelectorAll('form')
    forms.forEach((form) => this.attachFormListeners(form))
  }

  /**
   * Attach listeners to a specific form
   */
  private attachFormListeners(form: HTMLFormElement): void {
    const formId = this.getFormId(form)

    // Skip if already tracking this form
    if (this.formStates.has(formId)) return

    // Track all input fields
    const fields = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="password"]), select, textarea'
    )

    // Initialize form state
    const formState: FormState = {
      form_id: formId,
      field_states: new Map(),
      submitted: false,
      last_focused_field: null,
      total_fields: fields.length,
    }

    this.formStates.set(formId, formState)

    fields.forEach((field, index) => {
      const fieldId = this.getFieldId(field as HTMLElement)
      const element = field as HTMLElement

      // Initialize field state with WeakRef to prevent memory leaks
      formState.field_states.set(fieldId, {
        field_id: fieldId,
        focus_time: null,
        last_event: null,
        interaction_count: 0,
        total_time_spent: 0,
        has_value: this.hasFieldValue(element),
        validation_errors: 0,
        field_element: new WeakRef(element),
        blur_debounce_timer: null,
      })

      // Focus event - now tracks interaction count
      field.addEventListener('focus', () => {
        this.handleFocus(formId, fieldId, index)
      })

      // Blur event - debounced
      field.addEventListener('blur', () => {
        this.handleBlur(formId, fieldId, index)
      })

      // Change event - optional, tracks field completion
      if (this.config.track_changes) {
        field.addEventListener('change', () => {
          this.handleChange(formId, fieldId)
        })
      }

      // Error event - tracks validation issues
      field.addEventListener('invalid', () => {
        this.handleError(formId, fieldId)
      })
    })

    // Submit event
    form.addEventListener('submit', () => {
      this.handleSubmit(formId)
    })

    if (this.config.debug) {
      console.log(`[zForms] Tracking form: ${formId} with ${fields.length} fields`)
    }
  }

  /**
   * Check if field has a value
   */
  private hasFieldValue(element: HTMLElement): boolean {
    if (element instanceof HTMLInputElement) {
      return element.value.trim().length > 0
    } else if (element instanceof HTMLSelectElement) {
      return element.value.trim().length > 0
    } else if (element instanceof HTMLTextAreaElement) {
      return element.value.trim().length > 0
    }
    return false
  }

  /**
   * Handle focus event - tracks interaction count and updates last focused field
   */
  private handleFocus(formId: string, fieldId: string, fieldPosition: number): void {
    const formState = this.formStates.get(formId)
    if (!formState) return

    const fieldState = formState.field_states.get(fieldId)
    if (!fieldState) return

    // Update interaction count
    fieldState.interaction_count++
    fieldState.focus_time = Date.now()
    fieldState.last_event = 'focus'

    // Update form's last focused field for accurate abandonment tracking
    formState.last_focused_field = fieldId

    // Only track first interaction to reduce events (performance optimization)
    if (fieldState.interaction_count === 1) {
      this.trackEvent({
        form_id: formId,
        field_id: fieldId,
        event_type: 'interaction',
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          field_position: fieldPosition,
          total_fields: formState.total_fields,
        },
      })
    }

    if (this.config.debug && fieldState.interaction_count > 1) {
      console.log(
        `[zForms] Field re-visited (${fieldState.interaction_count}x): ${fieldId}`
      )
    }
  }

  /**
   * Handle blur event with debouncing - reduces resource usage
   */
  private handleBlur(formId: string, fieldId: string, fieldPosition: number): void {
    const formState = this.formStates.get(formId)
    if (!formState) return

    const fieldState = formState.field_states.get(fieldId)
    if (!fieldState || !fieldState.focus_time) return

    // Clear existing debounce timer
    if (fieldState.blur_debounce_timer) {
      clearTimeout(fieldState.blur_debounce_timer)
    }

    // Debounce blur event to avoid tracking rapid focus/blur switches
    fieldState.blur_debounce_timer = window.setTimeout(() => {
      const timeSpent = Date.now() - fieldState.focus_time!
      fieldState.total_time_spent += timeSpent
      fieldState.focus_time = null
      fieldState.last_event = 'blur'
      fieldState.blur_debounce_timer = null

      // Check if field has value after blur
      const element = fieldState.field_element.deref()
      if (element) {
        fieldState.has_value = this.hasFieldValue(element)
      }

      // Only track blur if significant time was spent (>500ms) to reduce noise
      if (timeSpent > 500) {
        this.trackEvent({
          form_id: formId,
          field_id: fieldId,
          event_type: 'blur',
          time_spent_ms: timeSpent,
          session_id: this.sessionId,
          timestamp: new Date().toISOString(),
          metadata: {
            interaction_count: fieldState.interaction_count,
            field_completed: fieldState.has_value,
            validation_errors: fieldState.validation_errors,
            field_position: fieldPosition,
            total_fields: formState.total_fields,
          },
        })
      }
    }, this.config.debounce_time)
  }

  /**
   * Handle field change - tracks completion
   */
  private handleChange(formId: string, fieldId: string): void {
    const formState = this.formStates.get(formId)
    if (!formState) return

    const fieldState = formState.field_states.get(fieldId)
    if (!fieldState) return

    const element = fieldState.field_element.deref()
    if (element) {
      const hadValue = fieldState.has_value
      fieldState.has_value = this.hasFieldValue(element)

      // Only track when field goes from empty to filled
      if (!hadValue && fieldState.has_value) {
        this.trackEvent({
          form_id: formId,
          field_id: fieldId,
          event_type: 'change',
          session_id: this.sessionId,
          timestamp: new Date().toISOString(),
          metadata: {
            field_completed: true,
          },
        })
      }
    }
  }

  /**
   * Handle form submission
   */
  private handleSubmit(formId: string): void {
    const formState = this.formStates.get(formId)
    if (formState) {
      formState.submitted = true
    }

    // Calculate completion metrics
    let completedFields = 0
    let totalInteractions = 0

    if (formState) {
      formState.field_states.forEach((field) => {
        if (field.has_value) completedFields++
        totalInteractions += field.interaction_count
      })
    }

    this.trackEvent({
      form_id: formId,
      field_id: '__form__',
      event_type: 'submit',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      metadata: {
        total_fields: formState?.total_fields || 0,
        field_completed: completedFields === (formState?.total_fields || 0),
        interaction_count: totalInteractions,
      },
    })

    // Force send immediately
    this.queue.flush()
  }

  /**
   * Handle field validation error
   */
  private handleError(formId: string, fieldId: string): void {
    const formState = this.formStates.get(formId)
    if (!formState) return

    const fieldState = formState.field_states.get(fieldId)
    if (fieldState) {
      fieldState.validation_errors++
    }

    this.trackEvent({
      form_id: formId,
      field_id: fieldId,
      event_type: 'error',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      metadata: {
        validation_errors: fieldState?.validation_errors || 1,
      },
    })
  }

  /**
   * Setup accurate abandonment tracking
   */
  private setupAbandonmentTracking(): void {
    // Track abandonment on page visibility change (more reliable than beforeunload)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.trackAbandonment()
      }
    }

    const handleBeforeUnload = () => {
      this.trackAbandonment()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
  }

  /**
   * Track form abandonment with specific field information
   */
  private trackAbandonment(): void {
    this.formStates.forEach((formState, formId) => {
      // Skip if form was submitted
      if (formState.submitted) return

      // Skip if no fields were interacted with
      if (!formState.last_focused_field) return

      // Calculate progress metrics
      let completedFields = 0
      let totalTimeSpent = 0
      let totalInteractions = 0
      let fieldsWithErrors = 0

      formState.field_states.forEach((fieldState) => {
        if (fieldState.has_value) completedFields++
        totalTimeSpent += fieldState.total_time_spent
        totalInteractions += fieldState.interaction_count
        if (fieldState.validation_errors > 0) fieldsWithErrors++
      })

      // Find the position of the last focused field
      let abandonmentPosition = 0
      let currentIndex = 0
      for (const [fieldId] of formState.field_states) {
        if (fieldId === formState.last_focused_field) {
          abandonmentPosition = currentIndex
          break
        }
        currentIndex++
      }

      this.trackEvent({
        form_id: formId,
        field_id: formState.last_focused_field,
        event_type: 'abandon',
        time_spent_ms: totalTimeSpent,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          abandonment_field: formState.last_focused_field,
          field_position: abandonmentPosition,
          total_fields: formState.total_fields,
          field_completed: completedFields === formState.total_fields,
          interaction_count: totalInteractions,
          validation_errors: fieldsWithErrors,
        },
      })

      if (this.config.debug) {
        console.log(
          `[zForms] Form abandoned at field: ${formState.last_focused_field} ` +
            `(${completedFields}/${formState.total_fields} fields completed)`
        )
      }
    })

    // Send abandonment events immediately
    this.queue.flush()
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
    if (
      !['focus', 'blur', 'submit', 'abandon', 'error', 'change', 'interaction'].includes(
        eventType
      )
    ) {
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
   * Public API: Get current session analytics
   */
  public getSessionAnalytics(): {
    session_id: string
    forms: Array<{
      form_id: string
      total_fields: number
      completed_fields: number
      total_interactions: number
      total_time_spent: number
      submitted: boolean
    }>
  } {
    const forms = Array.from(this.formStates.values()).map((formState) => {
      let completedFields = 0
      let totalInteractions = 0
      let totalTimeSpent = 0

      formState.field_states.forEach((field) => {
        if (field.has_value) completedFields++
        totalInteractions += field.interaction_count
        totalTimeSpent += field.total_time_spent
      })

      return {
        form_id: formState.form_id,
        total_fields: formState.total_fields,
        completed_fields: completedFields,
        total_interactions: totalInteractions,
        total_time_spent: totalTimeSpent,
        submitted: formState.submitted,
      }
    })

    return {
      session_id: this.sessionId,
      forms,
    }
  }

  /**
   * Public API: Destroy instance and clean up
   */
  public destroy(): void {
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    // Clear all debounce timers
    this.formStates.forEach((formState) => {
      formState.field_states.forEach((fieldState) => {
        if (fieldState.blur_debounce_timer) {
          clearTimeout(fieldState.blur_debounce_timer)
        }
      })
    })

    // Clean up queue and states
    this.queue.destroy()
    this.formStates.clear()
    this.initialized = false

    if (this.config.debug) {
      console.log('[zForms] Instance destroyed and cleaned up')
    }
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
