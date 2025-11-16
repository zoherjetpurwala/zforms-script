/**
 * zForms Event Queue
 * Batches and sends events to API endpoint
 */

import type { zFormsEvent, EventBatch } from './types'
import { Storage } from './storage'

export class EventQueue {
  private queue: zFormsEvent[] = []
  private storage: Storage
  private apiUrl: string
  private projectKey: string
  private batchSize: number
  private batchInterval: number
  private sendTimer: number | null = null
  private isSending = false
  private debug: boolean

  constructor(
    apiUrl: string,
    projectKey: string,
    batchSize = 10,
    batchInterval = 5000,
    debug = false
  ) {
    this.apiUrl = apiUrl
    this.projectKey = projectKey
    this.batchSize = batchSize
    this.batchInterval = batchInterval
    this.debug = debug
    this.storage = new Storage()

    // Load any stored events from previous session
    this.loadStoredEvents()

    // Start batch timer
    this.startBatchTimer()

    // Send on page unload
    this.setupUnloadHandler()
  }

  /**
   * Add event to queue
   */
  add(event: zFormsEvent): void {
    this.queue.push(event)

    if (this.debug) {
      console.log('[zForms] Event queued:', event)
    }

    // Send immediately if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.send()
    }
  }

  /**
   * Load events from storage (offline persistence)
   */
  private loadStoredEvents(): void {
    const stored = this.storage.retrieve()
    if (stored.length > 0) {
      this.queue.push(...stored)
      this.storage.clear()

      if (this.debug) {
        console.log(`[zForms] Loaded ${stored.length} stored events`)
      }
    }
  }

  /**
   * Start timer to send batches at regular intervals
   */
  private startBatchTimer(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer)
    }

    this.sendTimer = window.setInterval(() => {
      if (this.queue.length > 0) {
        this.send()
      }
    }, this.batchInterval)
  }

  /**
   * Send events to API
   */
  private async send(): Promise<void> {
    if (this.isSending || this.queue.length === 0) return

    this.isSending = true
    const batch = this.queue.splice(0, this.batchSize)

    const payload: EventBatch = {
      project_key: this.projectKey,
      events: batch,
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true, // Important for sendBeacon-like behavior
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (this.debug) {
        console.log(`[zForms] Sent ${batch.length} events`)
      }
    } catch (error) {
      console.error('[zForms] Failed to send events:', error)

      // Store failed events for retry
      this.storage.store(batch)

      // Re-queue events
      this.queue.unshift(...batch)
    } finally {
      this.isSending = false
    }
  }

  /**
   * Send using sendBeacon for guaranteed delivery on page unload
   */
  private sendBeacon(): void {
    if (this.queue.length === 0) return

    const payload: EventBatch = {
      project_key: this.projectKey,
      events: this.queue,
    }

    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json',
    })

    const sent = navigator.sendBeacon(this.apiUrl, blob)

    if (sent) {
      if (this.debug) {
        console.log(`[zForms] Sent ${this.queue.length} events via beacon`)
      }
      this.queue = []
    } else {
      // Store for next session
      this.storage.store(this.queue)
    }
  }

  /**
   * Setup handlers for page unload
   */
  private setupUnloadHandler(): void {
    // Try sendBeacon first (most reliable)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendBeacon()
      }
    })

    // Fallback for older browsers
    window.addEventListener('beforeunload', () => {
      this.sendBeacon()
    })

    // Also try on page freeze
    window.addEventListener('pagehide', () => {
      this.sendBeacon()
    })
  }

  /**
   * Force send all queued events (async version)
   * CRITICAL: Returns promise to ensure events are sent before page unload
   */
  async flushAsync(): Promise<void> {
    if (this.queue.length > 0) {
      await this.send()
    }
  }

  /**
   * Force send all queued events (sync version for backwards compatibility)
   */
  flush(): void {
    if (this.queue.length > 0) {
      this.send()
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer)
      this.sendTimer = null
    }
    this.flush()
  }
}
