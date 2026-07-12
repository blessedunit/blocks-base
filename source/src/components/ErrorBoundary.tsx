import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Last-resort catch — a crash inside the game loop or a wallet provider should
// land on a "reload" card instead of a white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[blocks] crash:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5"
        style={{ background: '#050a16' }}
      >
        <div
          className="font-pix"
          style={{
            color: '#FFD23F',
            fontSize: 18,
            letterSpacing: '0.18em',
            textShadow: '3px 3px 0 #0052FF',
          }}
        >
          GLITCHED!
        </div>
        <div className="font-mono" style={{ color: '#EEF4FF', fontSize: 15 }}>
          Something broke mid-run.
        </div>
        <button
          type="button"
          className="font-pix"
          onClick={() => window.location.reload()}
          style={{
            background: '#00D4FF',
            color: '#050a16',
            border: '3px solid #EEF4FF',
            padding: '12px 28px',
            fontSize: 12,
            letterSpacing: '0.14em',
            boxShadow: '0 4px 0 0 #007EAA',
            cursor: 'pointer',
          }}
        >
          RESTART
        </button>
      </div>
    );
  }
}
