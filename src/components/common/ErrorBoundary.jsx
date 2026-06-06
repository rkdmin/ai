import { Component } from 'react';
import { captureError } from '../../utils/sentry';

// React 렌더 트리에서 던져진 에러를 잡아 Sentry 로 보고하고 폴백 화면을 보여준다.
// 전역 window error / unhandledrejection 은 Sentry 가 자동 캡처하므로, 여기서는
// "렌더 중 크래시" 만 담당한다 (이 경우 화면이 빈 화면으로 죽는 것을 막는다).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          width: '100%', minHeight: '100dvh', background: '#fff', color: '#000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 32px', textAlign: 'center',
        }}
      >
        <div className="label" style={{ color: '#c45a3b', marginBottom: 10 }}>SOMETHING WENT WRONG</div>
        <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 300, lineHeight: 1.35 }}>
          잠시 문제가 발생했어요
        </h1>
        <p className="ko" style={{ margin: '12px 0 24px', fontSize: 13, lineHeight: 1.7, color: '#5a5a5a', fontWeight: 300 }}>
          앱을 다시 시작하면 대부분 해결돼요.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: '#000', color: '#fff', border: 'none', padding: '14px 28px',
            fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer',
          }}
        >
          RESTART →
        </button>
      </div>
    );
  }
}
