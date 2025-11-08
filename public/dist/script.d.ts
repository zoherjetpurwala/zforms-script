/**
 * zForms Tracking Script
 * Privacy-first form analytics with optimized resource usage
 */
import type { zFormsConfig } from './types';
declare class zForms {
    private config;
    private queue;
    private sessionId;
    private formStates;
    private initialized;
    private mutationObserver;
    constructor(config: zFormsConfig);
    /**
     * Initialize tracking
     */
    private init;
    /**
     * Setup tracking for all forms
     */
    private setupTracking;
    /**
     * Setup tracking for dynamically added forms
     */
    private setupDynamicFormTracking;
    /**
     * Attach event listeners to all existing forms
     */
    private attachListeners;
    /**
     * Attach listeners to a specific form
     */
    private attachFormListeners;
    /**
     * Check if field has a value
     */
    private hasFieldValue;
    /**
     * Handle focus event - tracks interaction count and updates last focused field
     */
    private handleFocus;
    /**
     * Handle blur event with debouncing - reduces resource usage
     */
    private handleBlur;
    /**
     * Handle field change - tracks completion
     */
    private handleChange;
    /**
     * Handle form submission
     */
    private handleSubmit;
    /**
     * Handle field validation error
     */
    private handleError;
    /**
     * Setup accurate abandonment tracking
     */
    private setupAbandonmentTracking;
    /**
     * Track form abandonment with specific field information
     */
    private trackAbandonment;
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
     * Public API: Get current session analytics
     */
    getSessionAnalytics(): {
        session_id: string;
        forms: Array<{
            form_id: string;
            total_fields: number;
            completed_fields: number;
            total_interactions: number;
            total_time_spent: number;
            submitted: boolean;
        }>;
    };
    /**
     * Public API: Destroy instance and clean up
     */
    destroy(): void;
}
export default zForms;
//# sourceMappingURL=script.d.ts.map