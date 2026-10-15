import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RouteMiddleware } from '@/components/auth';
import { queryClient } from '@/config';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteMiddleware />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
