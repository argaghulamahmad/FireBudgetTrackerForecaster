/**
 * src/utils/logging.ts
 * 
 * Centralized logging for auth and app actions
 * Helps with debugging and auditing authentication flow
 */

/**
 * Log an authentication action
 * 
 * @param action Name of the auth action (e.g., 'signInWithEmail', 'signOut')
 * @param data Additional context data (sanitized, no passwords)
 */
export function logAuthAction(
  action: string,
  data?: Record<string, unknown>
): void {
  console.warn(`[Auth] ${action}`, data);

  // Optional: Send to analytics service
  // const entry = { timestamp: new Date().toISOString(), level: 'log' as const, action, data: sanitizeData(data) };
  // analytics.logEvent('auth_action', entry);
}

/**
 * Log app-level events
 * 
 * @param event Event name
 * @param details Event details
 */
export function logAppEvent(
  event: string,
  details?: Record<string, unknown>
): void {
  console.warn(`[App] ${event}`, details || '');
}

/**
 * Log errors with context
 * 
 * @param context Where the error occurred
 * @param error The error object
 * @param additionalData Any additional context
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const errorData = {
    message: error instanceof Error ? error.message : String(error),
    code: (error as { code?: unknown })?.code,
    ...additionalData,
  };

  console.error(`[Error] ${context}`, errorData);
}
