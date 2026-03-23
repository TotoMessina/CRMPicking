import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh data
      refetchOnWindowFocus: false, // Don't refetch on every tab switch unless stale
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
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
      onRegistered(r) {
        console.log('SW Registered: ', r);
      },
      onRegisterError(error) {
        console.log('SW registration error', error);
      }
    })();
  });
}
