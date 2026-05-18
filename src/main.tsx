import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { injectTenantTheme } from './config/tenant';
import { TenantProvider } from './contexts/TenantContext';
import './i18n/config';

import { logger } from './lib/logger';

injectTenantTheme();

// --- Global Error Tracking ---
window.onerror = (message, source, lineno, colno, error) => {
  logger.error(`Global Error: ${message}`, error, undefined, { source, lineno, colno });
  return false; // Let default handler run
};

window.onunhandledrejection = (event) => {
  logger.error(`Unhandled Rejection: ${event.reason}`, event.reason);
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh data
      refetchOnWindowFocus: false, // Don't refetch on every tab switch unless stale
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <App />
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

// Register Service Worker for PWA handled by Vite Plugin
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerSW({ 
      immediate: true,
      onRegistered(r: ServiceWorkerRegistration | undefined) {
        console.log('SW Registered: ', r);
      },
      onRegisterError(error: any) {
        console.log('SW registration error', error);
      }
    })();
  });
}
