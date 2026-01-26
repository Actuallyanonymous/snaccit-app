import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// Global error handlers to catch unhandled errors and promise rejections
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  try {
    localStorage.setItem('global_error', JSON.stringify({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.toString(),
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }));
  } catch (e) {
    console.error('Could not save global error:', e);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  try {
    localStorage.setItem('unhandled_rejection', JSON.stringify({
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }));
  } catch (e) {
    console.error('Could not save rejection error:', e);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
