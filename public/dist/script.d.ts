/**
 * zForms Tracking Script
 * Privacy-first form analytics
 */
import type { zFormsConfig } from './types';
declare class zForms {
    private config;
    private queue;
    private sessionId;
    private fieldStates;
    private initialized;
    constructor(config: zFormsConfig);
    /**
     * Initialize tracking
     */
    private init;
    /**
     * Attach event listeners to all form inputs
     */
    private attachListeners;
    /**
     * Handle focus event
     */
    private handleFocus;
    /**
     * Handle blur event
     */
    private handleBlur;
    /**
     * Handle form submission
     */
    private handleSubmit;
    /**
     * Handle field validation error
     */
    private handleError;
    /**
     * Setup abandonment tracking
     */
    private setupAbandonmentTracking;
    /**
     * Track an event
     */
    private trackEvent;
    /**
     * Get form identifier
     */
    private getFormId;
    /**
     * Get field identifier
     */
    private getFieldId;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Public API: Manually track custom event
     */
    track(formId: string, fieldId: string, eventType: string): void;
    /**
     * Public API: Destroy instance
     */
    destroy(): void;
}
export default zForms;
//# sourceMappingURL=script.d.ts.map