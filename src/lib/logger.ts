import { supabase } from './supabase';

interface LogOptions {
  level?: 'error' | 'warning' | 'info';
  stack?: string;
  componentStack?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private userEmail: string | null = null;
  private recentLogs: Map<string, number> = new Map(); // message -> timestamp
  private totalLogCount = 0;
  private rateLimitResetTime = Date.now() + 60000;
  private isSyncing = false;

  constructor() {
    // Sync offline logs when connection is restored
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncOfflineLogs());
      // Run an initial sync attempt
      setTimeout(() => this.syncOfflineLogs(), 3000);
    }
  }

  setUserEmail(email: string | null) {
    this.userEmail = email;
  }

  // Check if an error should be ignored (e.g., third-party browser extensions)
  private isIgnoredError(message: string, stack?: string): boolean {
    const noisePatterns = [
      'chrome-extension://',
      'safari-extension://',
      'moz-extension://',
      'extension://',
      'webviewprogressproxy',
      'Grammarly',
      '__gCrWeb',
      'top.location.origin',
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded'
    ];

    const searchStr = `${message} ${stack || ''}`.toLowerCase();
    return noisePatterns.some(pattern => searchStr.includes(pattern.toLowerCase()));
  }

  // Rate Limiting to prevent infinite loop or memory leaks
  private checkRateLimit(message: string): boolean {
    const now = Date.now();

    // Reset rate limit every 60 seconds
    if (now > this.rateLimitResetTime) {
      this.totalLogCount = 0;
      this.rateLimitResetTime = now + 60000;
      this.recentLogs.clear();
    }

    // Limit identical messages to once every 5 seconds
    const lastSeen = this.recentLogs.get(message);
    if (lastSeen && now - lastSeen < 5000) {
      return true; // Throttle identical message
    }
    this.recentLogs.set(message, now);

    // Limit absolute logs to 20 per minute
    if (this.totalLogCount >= 20) {
      if (this.totalLogCount === 20) {
        console.warn('[LOGGER] Log rate limit reached. Throttling all logs for the current minute.');
        this.totalLogCount++;
      }
      return true; // Throttle everything
    }

    this.totalLogCount++;
    return false;
  }

  async log(message: string, options: LogOptions = {}) {
    // Prevent infinite loops if Supabase logging itself fails
    if (message.includes('Error sending log to Supabase')) return;

    const {
      level = 'error',
      stack,
      componentStack,
      metadata = {}
    } = options;

    const rawStack = stack || new Error().stack;

    // 1. Filter out known extension noise and browser loops
    if (this.isIgnoredError(message, rawStack)) {
      if (import.meta.env.DEV) {
        console.log(`%c[LOGGER:IGNORED] Ignored 3rd party extension noise: ${message}`, 'color: #94a3b8; font-style: italic;');
      }
      return;
    }

    // 2. Apply Throttling/Rate Limiting
    if (this.checkRateLimit(message)) {
      return;
    }

    const logEntry = {
      level,
      message,
      stack: rawStack,
      component_stack: componentStack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      user_email: this.userEmail,
      metadata: {
        ...metadata,
        environment: import.meta.env.PROD ? 'production' : 'development',
        timestamp: new Date().toISOString()
      }
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      const colors = {
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      };
      console.log(
        `%c[LOGGER:${level.toUpperCase()}]`,
        `color: ${colors[level]}; font-weight: bold;`,
        message,
        { stack: rawStack, componentStack, metadata: logEntry.metadata }
      );
    }

    // 3. Offline fallbacks and Supabase inserts
    if (!navigator.onLine) {
      this.saveToOfflineQueue(logEntry);
      return;
    }

    try {
      const { error } = await supabase
        .from('error_logs')
        .insert([logEntry]);

      if (error) {
        console.error('Error sending log to Supabase:', error);
        // If DB insertion fails, save it locally so we don't lose it
        this.saveToOfflineQueue(logEntry);
      }
    } catch (err) {
      console.error('Failed to send log to Supabase (catastrophic):', err);
      this.saveToOfflineQueue(logEntry);
    }
  }

  // LocalStorage queue helper
  private saveToOfflineQueue(entry: any) {
    try {
      const stored = localStorage.getItem('pu_offline_logs');
      const queue = stored ? JSON.parse(stored) : [];
      
      // Limit queue to 50 logs to prevent memory leaks
      if (queue.length >= 50) {
        queue.shift(); // Remove oldest
      }
      
      queue.push(entry);
      localStorage.setItem('pu_offline_logs', JSON.stringify(queue));
      
      if (import.meta.env.DEV) {
        console.log('[LOGGER] Saved log to offline queue:', entry.message);
      }
    } catch (err) {
      console.error('[LOGGER] Failed to save offline log to queue:', err);
    }
  }

  // Flush offline queue when online
  async syncOfflineLogs() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const stored = localStorage.getItem('pu_offline_logs');
      if (!stored) {
        this.isSyncing = false;
        return;
      }

      const queue = JSON.parse(stored);
      if (queue.length === 0) {
        localStorage.removeItem('pu_offline_logs');
        this.isSyncing = false;
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`[LOGGER] Synchronizing ${queue.length} offline logs with Supabase...`);
      }

      // Insert all queued logs in bulk
      const { error } = await supabase
        .from('error_logs')
        .insert(queue);

      if (!error) {
        localStorage.removeItem('pu_offline_logs');
        if (import.meta.env.DEV) {
          console.log('[LOGGER] Successfully synchronized offline logs.');
        }
      } else {
        console.error('[LOGGER] Failed to synchronize offline logs:', error);
      }
    } catch (err) {
      console.error('[LOGGER] Error during offline sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  error(message: string, error?: any, componentStack?: string, metadata?: Record<string, any>) {
    this.log(message, {
      level: 'error',
      stack: error instanceof Error ? error.stack : (typeof error === 'string' ? error : undefined),
      componentStack,
      metadata
    });
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(message, { level: 'warning', metadata });
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(message, { level: 'info', metadata });
  }
}

export const logger = new Logger();
