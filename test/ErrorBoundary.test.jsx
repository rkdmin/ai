/**
 * ErrorBoundary 단위 테스트.
 * 렌더 크래시 시 빈 화면 대신 폴백을 보여주는지 회귀로 고정한다.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

function Boom() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('자식이 throw 하면 폴백 화면을 보여준다', () => {
    // 에러 바운더리는 console.error 로 로그를 남기므로 테스트 출력만 억제.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('SOMETHING WENT WRONG')).toBeInTheDocument();
    expect(screen.getByText('잠시 문제가 발생했어요')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('정상 자식은 그대로 렌더한다', () => {
    render(
      <ErrorBoundary>
        <div>정상 콘텐츠</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('정상 콘텐츠')).toBeInTheDocument();
  });
});
