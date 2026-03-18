/**
 * Logger Utility - Centralized Logging
 *
 * Provides consistent logging across the app with semantic level separation:
 * - info(): normal operational messages (app startup, listeners active)
 * - warn(): concerning but non-critical issues (deprecated APIs, fallbacks)
 * - error(): failures that impact functionality
 *
 * Benefits:
 * - ESLint friendly (no rule bans on logger.* calls)
 * - Distinguishes info/warn/error for production filtering
 * - Single place to add middleware (error tracking, analytics)
 * - Easier to silence in tests
 */

/**
 * Log levels
 */
type LogLevel = 'info' | 'warn' | 'error';

/**
 * Core logger implementation
 */
class Logger {
  private level: LogLevel = 'info';

  /**
   * Informational messages - normal operation
   * @param message Main message
   * @param context Optional context/data
   */
  info(message: string, context?: unknown): void {
    console.info(`[INFO] ${message}`, context);
  }

  /**
   * Warning messages - concerning but recoverable
   * @param message Main message
   * @param context Optional context/data
   */
  warn(message: string, context?: unknown): void {
    console.warn(`[WARN] ${message}`, context);
  }

  /**
   * Error messages - something failed
   * @param message Main message
   * @param context Optional error/context
   */
  error(message: string, context?: unknown): void {
    console.error(`[ERROR] ${message}`, context);
  }

  /**
   * Set minimum log level (for future filtering)
   * @param level Minimum level to log
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Type-safe logger with prefixing for module contexts
 *
 * @example
 * const authLogger = getLogger('Auth');
 * authLogger.info('User signed in'); // [Auth INFO] User signed in
 */
export function getLogger(module: string) {
  return {
    info: (message: string, context?: unknown) =>
      logger.info(`[${module}] ${message}`, context),
    warn: (message: string, context?: unknown) =>
      logger.warn(`[${module}] ${message}`, context),
    error: (message: string, context?: unknown) =>
      logger.error(`[${module}] ${message}`, context),
  };
}
