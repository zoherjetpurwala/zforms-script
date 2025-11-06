/**
 * zForms Storage Handler
 * Manages localStorage/IndexedDB for offline event persistence
 */

import type { zFormsEvent } from './types'

const STORAGE_KEY = 'zForms_events'
const MAX_STORED_EVENTS = 1000

export class Storage {
  private isAvailable: boolean

  constructor() {
    this.isAvailable = this.checkStorageAvailability()
  }

  private checkStorageAvailability(): boolean {
    try {
      const test = '__zForms_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Store events in localStorage for offline persistence
   */
  store(events: zFormsEvent[]): void {
    if (!this.isAvailable || events.length === 0) return

    try {
      const existing = this.retrieve()
      const combined = [...existing, ...events].slice(-MAX_STORED_EVENTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined))
    } catch (error) {
      console.error('[zForms] Failed to store events:', error)
    }
  }

  /**
   * Retrieve stored events from localStorage
   */
  retrieve(): zFormsEvent[] {
    if (!this.isAvailable) return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('[zForms] Failed to retrieve events:', error)
      return []
    }
  }

  /**
   * Clear stored events after successful send
   */
  clear(): void {
    if (!this.isAvailable) return

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('[zForms] Failed to clear events:', error)
    }
  }

  /**
   * Get count of stored events
   */
  count(): number {
    return this.retrieve().length
  }
}
