
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { storage } from '@/lib/storage';

// Initialize data
storage.seed();

// React Query client with smart caching settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — data is "fresh" for 5 min
      gcTime: 10 * 60 * 1000,          // 10 minutes — keep unused data in memory
      refetchOnWindowFocus: false,      // Don't re-fetch when window regains focus
      retry: 1,                         // Retry once on failure
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
