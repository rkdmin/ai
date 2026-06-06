import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { initSentry } from './utils/sentry.js';

// 렌더 전에 Sentry 초기화 — 전역 에러 핸들러를 앱 코드보다 먼저 설치한다.
// VITE_SENTRY_DSN 이 없으면 no-op.
initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
