/**
 * Brevo Retry Handler
 * Advanced error handling and retry logic for Brevo operations
 */

import { handleBrevoError } from './client';
import { db } from '@/lib/supabase-client';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
  retryableStatuses: number[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalDuration: number;
}

export class BrevoRetryHandler {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
    retryableStatuses: [429, 500, 502, 503, 504],
  };

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: { userId?: string; operation?: string }
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    
    let lastError: any;
    let attempts = 0;

    for (attempts = 1; attempts <= finalConfig.maxAttempts; attempts++) {
      try {
        const result = await operation();
        
        // Log successful retry if it took more than 1 attempt
        if (attempts > 1 && context) {
          await this.logRetrySuccess(context, attempts, Date.now() - startTime);
        }

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const errorInfo = handleBrevoError(error);
        const isRetryable = this.isRetryableError(error, errorInfo, finalConfig);
        
        // Log the attempt
        if (context) {
          await this.logRetryAttempt(context, attempts, error, isRetryable);
        }

        // If not retryable or max attempts reached, fail
        if (!isRetryable || attempts >= finalConfig.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempts, finalConfig, errorInfo.waitTime);
        
        console.log(
          `Retrying ${context?.operation || 'operation'} for ${context?.userId || 'unknown'} ` +
          `(attempt ${attempts + 1}/${finalConfig.maxAttempts}) after ${delay}ms delay`
        );

        await this.sleep(delay);
      }
    }

    // Log final failure
    if (context) {
      await this.logRetryFailure(context, attempts, lastError, Date.now() - startTime);
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(
    error: any,
    ErrorInfo: { shouldRetry: boolean; waitTime?: number },
    config: RetryConfig
  ): boolean {
    // First check Brevo-specific retry logic
    if (!ErrorInfo.shouldRetry) {
      return false;
    }

    // Check status codes
    if (error.status && config.retryableStatuses.includes(error.status)) {
      return true;
    }

    // Check error codes
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check error types
    if (error.name === 'TimeoutError' || error.code === 'ECONNRESET') {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(
    attempt: number,
    config: RetryConfig,
    suggestedWait?: number
  ): number {
    // Use suggested wait time if provided (e.g., from rate limiting)
    if (suggestedWait && suggestedWait > 0) {
      return Math.min(suggestedWait, config.maxDelay);
    }

    // Exponential backoff with jitter
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log retry attempt
   */
  private async logRetryAttempt(
    context: { userId?: string; operation?: string },
    attempt: number,
    error: any,
    willRetry: boolean
  ): Promise<void> {
    try {
      await db.brevoContactEvents().insert({
        user_id: context.userId || 'system',
        event_type: 'retry_attempt',
        event_data: {
          operation: context.operation,
          attempt,
          error: {
            message: error.message,
            code: error.code,
            status: error.status,
          },
          willRetry,
          timestamp: new Date().toISOString(),
        },
        source: 'retry_handler',
        processed: true, // These are informational events
      });
    } catch (logError) {
      console.error('Failed to log retry attempt:', logError);
    }
  }

  /**
   * Log successful retry
   */
  private async logRetrySuccess(
    context: { userId?: string; operation?: string },
    totalAttempts: number,
    duration: number
  ): Promise<void> {
    try {
      await db.brevoContactEvents().insert({
        user_id: context.userId || 'system',
        event_type: 'retry_success',
        event_data: {
          operation: context.operation,
          totalAttempts,
          duration,
          timestamp: new Date().toISOString(),
        },
        source: 'retry_handler',
        processed: true,
      });
    } catch (logError) {
      console.error('Failed to log retry success:', logError);
    }
  }

  /**
   * Log retry failure
   */
  private async logRetryFailure(
    context: { userId?: string; operation?: string },
    totalAttempts: number,
    finalError: any,
    duration: number
  ): Promise<void> {
    try {
      await db.brevoContactEvents().insert({
        user_id: context.userId || 'system',
        event_type: 'retry_failure',
        event_data: {
          operation: context.operation,
          totalAttempts,
          duration,
          finalError: {
            message: finalError.message,
            code: finalError.code,
            status: finalError.status,
            stack: finalError.stack,
          },
          timestamp: new Date().toISOString(),
        },
        source: 'retry_handler',
        processed: true,
      });
    } catch (logError) {
      console.error('Failed to log retry failure:', logError);
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    averageAttempts: number;
    averageDuration: number;
    errorBreakdown: Record<string, number>;
  }> {
    const cutoffDate = new Date();
    switch (timeframe) {
      case 'hour':
        cutoffDate.setHours(cutoffDate.getHours() - 1);
        break;
      case 'day':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
    }

    const { data: events } = await db.brevoContactEvents()
      .select('event_type, event_data')
      .in('event_type', ['retry_attempt', 'retry_success', 'retry_failure'])
      .gte('created_at', cutoffDate.toISOString());

    if (!events || events.length === 0) {
      return {
        totalAttempts: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageAttempts: 0,
        averageDuration: 0,
        errorBreakdown: {},
      };
    }

    const attempts = events.filter(e => e.event_type === 'retry_attempt');
    const successes = events.filter(e => e.event_type === 'retry_success');
    const failures = events.filter(e => e.event_type === 'retry_failure');

    const averageAttempts = successes.length + failures.length > 0
      ? [...successes, ...failures].reduce((sum, event) => sum + (event.event_data.totalAttempts || 1), 0) / (successes.length + failures.length)
      : 0;

    const averageDuration = successes.length + failures.length > 0
      ? [...successes, ...failures].reduce((sum, event) => sum + (event.event_data.duration || 0), 0) / (successes.length + failures.length)
      : 0;

    const errorBreakdown = attempts.reduce((acc, event) => {
      const errorCode = event.event_data.error?.code || 'unknown';
      acc[errorCode] = (acc[errorCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAttempts: attempts.length,
      successfulRetries: successes.length,
      failedRetries: failures.length,
      averageAttempts,
      averageDuration,
      errorBreakdown,
    };
  }
}

// Singleton instance
let retryHandler: BrevoRetryHandler | null = null;

export function getRetryHandler(): BrevoRetryHandler {
  if (!retryHandler) {
    retryHandler = new BrevoRetryHandler();
  }
  return retryHandler;
}

// Helper function to wrap operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: { userId?: string; operation?: string }
): Promise<T> {
  const handler = getRetryHandler();
  const result = await handler.withRetry(operation, {}, context);
  
  if (!result.success) {
    throw new Error(result.error || 'Operation failed after retries');
  }
  
  return result.data!;
}

// Specific retry configurations for different operations
export const RETRY_CONFIGS = {
  CONTACT_SYNC: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  
  BATCH_IMPORT: {
    maxAttempts: 2,
    baseDelay: 5000,
    maxDelay: 30000,
  },
  
  LIST_MANAGEMENT: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
  },
  
  CRITICAL_OPERATION: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 60000,
  },
} as const;