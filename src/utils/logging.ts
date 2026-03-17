/**
 * src/utils/logging.ts
 * 
 * Centralized logging for auth and app actions
 * Helps with debugging and auditing authentication flow
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  data?: Record<string, any>;
  message?: string;
}

/**
 * Log an authentication action
 * 
 * @param action Name of the auth action (e.g., 'signInWithEmail', 'signOut')
 * @param data Additional context data (sanitized, no passwords)
 */
export function logAuthAction(
  action: string,
  data?: Record<string, any>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'log',
    action,
    data: sanitizeData(data),
  };

  console.log(`[Auth] ${action}`, data);

  // Optional: Send to analytics service
  // analytics.logEvent('auth_action', { action, ...entry });
}

/**
 * Remove sensitive data from logs (passwords, tokens, etc.)
 */
function sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined;

  const sanitized = { ...data };
  const sensitiveKeys = [
    'password',
    'token',
    'refreshToken',
    'idToken',
    'accessToken',
    'secret',
  ];

  sensitiveKeys.forEach((key) => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Log app-level events
 * 
 * @param event Event name
 * @param details Event details
 */
export function logAppEvent(
  event: string,
  details?: Record<string, any>
): void {
  console.log(`[App] ${event}`, details || '');
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
  error: any,
  additionalData?: Record<string, any>
): void {
  const errorData = {
    message: error instanceof Error ? error.message : String(error),
    code: error?.code,
    ...additionalData,
  };

  console.error(`[Error] ${context}`, errorData);
}
