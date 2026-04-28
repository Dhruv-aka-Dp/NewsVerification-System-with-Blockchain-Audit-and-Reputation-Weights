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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="win-desktop" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="win-window win-dialog" style={{ maxWidth: 360 }}>
            <div className="win-titlebar" style={{ background: 'linear-gradient(90deg, #c00000, #ff4040)' }}>
              <span className="win-titlebar-text">⚠ Error</span>
              <div className="win-titlebar-buttons">
                <span className="win-titlebar-btn" onClick={() => window.location.href = '/'}>✕</span>
              </div>
            </div>
            <div className="win-content" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💥</div>
              <p style={{ marginBottom: 8, fontWeight: 700 }}>Something went wrong</p>
              <p className="win-text-small win-text-muted" style={{ marginBottom: 12 }}>
                {this.state.error?.message}
              </p>
              <button className="win-btn win-btn-primary" onClick={() => window.location.href = '/'}>
                OK
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
