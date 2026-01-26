import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to help debug iOS issues
    try {
      localStorage.setItem('last_error', JSON.stringify({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }));
    } catch (e) {
      console.error('Could not save error to localStorage:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#22c55e' }}>
              Oops! Something went wrong
            </h1>
            <p style={{ marginBottom: '24px', color: '#9ca3af' }}>
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '24px'
              }}
            >
              Refresh Page
            </button>
            
            {this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                padding: '16px',
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px', color: '#f87171' }}>
                  Technical Details (for developers)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#fca5a5'
                }}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <p style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
              User Agent: {navigator.userAgent}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
