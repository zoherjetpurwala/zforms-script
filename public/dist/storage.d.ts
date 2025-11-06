/**
 * zForms Storage Handler
 * Manages localStorage/IndexedDB for offline event persistence
 */
import type { zFormsEvent } from './types';
export declare class Storage {
    private isAvailable;
    constructor();
    private checkStorageAvailability;
    /**
     * Store events in localStorage for offline persistence
     */
    store(events: zFormsEvent[]): void;
    /**
     * Retrieve stored events from localStorage
     */
    retrieve(): zFormsEvent[];
    /**
     * Clear stored events after successful send
     */
    clear(): void;
    /**
     * Get count of stored events
     */
    count(): number;
}
//# sourceMappingURL=storage.d.ts.map