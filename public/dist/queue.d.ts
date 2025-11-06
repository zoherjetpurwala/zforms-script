/**
 * zForms Event Queue
 * Batches and sends events to API endpoint
 */
import type { zFormsEvent } from './types';
export declare class EventQueue {
    private queue;
    private storage;
    private apiUrl;
    private projectKey;
    private batchSize;
    private batchInterval;
    private sendTimer;
    private isSending;
    private debug;
    constructor(apiUrl: string, projectKey: string, batchSize?: number, batchInterval?: number, debug?: boolean);
    /**
     * Add event to queue
     */
    add(event: zFormsEvent): void;
    /**
     * Load events from storage (offline persistence)
     */
    private loadStoredEvents;
    /**
     * Start timer to send batches at regular intervals
     */
    private startBatchTimer;
    /**
     * Send events to API
     */
    private send;
    /**
     * Send using sendBeacon for guaranteed delivery on page unload
     */
    private sendBeacon;
    /**
     * Setup handlers for page unload
     */
    private setupUnloadHandler;
    /**
     * Force send all queued events
     */
    flush(): void;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=queue.d.ts.map