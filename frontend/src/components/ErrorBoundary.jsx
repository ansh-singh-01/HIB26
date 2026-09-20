import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('shg_token');
    localStorage.removeItem('shg_user');
    this.setState({ hasError: false, error: null });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf5f1',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          color: '#0e0f0a'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#fefffa',
            border: '1px solid rgba(14, 15, 10, 0.12)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#fdf0ed',
              color: '#de7653',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '26px'
            }}>
              ⚕️
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px', color: '#0e0f0a' }}>
              Application Recovery
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#666c5a', lineHeight: 1.5, marginBottom: '24px' }}>
              The application encountered a temporary display issue. You can reload the session or sign in again.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#de7653',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#f0eedf',
                  color: '#3d4128',
                  border: '1px solid rgba(14, 15, 10, 0.12)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
