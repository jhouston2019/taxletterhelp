/**
 * ERROR TRACKING UTILITY
 * 
 * Centralized error tracking for all Netlify functions.
 * Supports Sentry when configured, falls back to console logging.
 * 
 * Usage:
 * const { trackError, wrapHandler } = require('./_error-tracking.js');
 * 
 * exports.handler = wrapHandler(async (event) => {
 *   // your function code
 * });
 */

let Sentry = null;
let sentryInitialized = false;

// Try to load Sentry if available
try {
  if (process.env.SENTRY_DSN) {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
      beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[SENTRY] Would send error:', event);
          return null;
        }
        return event;
      }
    });
    sentryInitialized = true;
    console.log('[ERROR-TRACKING] Sentry initialized');
  }
} catch (error) {
  console.log('[ERROR-TRACKING] Sentry not available, using console logging');
}

/**
 * Track an error (sends to Sentry if configured, otherwise logs to console)
 * @param {Error} error - The error to track
 * @param {Object} context - Additional context about the error
 */
function trackError(error, context = {}) {
  // Add context to error
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString()
  };
  
  // Send to Sentry if available
  if (sentryInitialized && Sentry) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        function: context.functionName || 'unknown',
        errorType: error.name || 'Error'
      }
    });
  }
  
  // Always log to console for CloudWatch/Netlify logs
  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
}

/**
 * Track a warning (non-critical issue)
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
function trackWarning(message, context = {}) {
  const warningInfo = {
    message,
    ...context,
    timestamp: new Date().toISOString()
  };
  
  if (sentryInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: context
    });
  }
  
  console.warn('[WARNING]', JSON.stringify(warningInfo, null, 2));
}

/**
 * Track an info event (for monitoring)
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
function trackInfo(message, context = {}) {
  if (sentryInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level: 'info',
      extra: context
    });
  }
  
  console.log('[INFO]', message, context);
}

/**
 * Wraps a Netlify function handler with error tracking
 * @param {Function} handler - The function handler to wrap
 * @param {string} functionName - Name of the function (for tracking)
 * @returns {Function} Wrapped handler
 */
function wrapHandler(handler, functionName = 'unknown') {
  return async (event, context) => {
    const startTime = Date.now();
    
    try {
      // Log function invocation
      console.log(`[${functionName}] Function invoked`, {
        method: event.httpMethod,
        path: event.path
      });
      
      // Execute the handler
      const result = await handler(event, context);
      
      // Log success
      const duration = Date.now() - startTime;
      console.log(`[${functionName}] Function completed in ${duration}ms`, {
        statusCode: result.statusCode
      });
      
      // Track slow functions
      if (duration > 10000) {
        trackWarning(`Slow function execution: ${functionName}`, {
          duration,
          functionName
        });
      }
      
      return result;
      
    } catch (error) {
      // Track the error
      trackError(error, {
        functionName,
        method: event.httpMethod,
        path: event.path,
        duration: Date.now() - startTime
      });
      
      // Return error response
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        })
      };
    }
  };
}

/**
 * Track a custom metric or event
 * @param {string} eventName - Name of the event
 * @param {Object} properties - Event properties
 */
function trackEvent(eventName, properties = {}) {
  if (sentryInitialized && Sentry) {
    Sentry.captureMessage(eventName, {
      level: 'info',
      extra: properties
    });
  }
  
  console.log(`[EVENT] ${eventName}`, properties);
}

module.exports = {
  trackError,
  trackWarning,
  trackInfo,
  trackEvent,
  wrapHandler
};
