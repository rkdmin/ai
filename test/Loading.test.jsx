/**
 * Loading 컴포넌트 단위 테스트 — 핵심: task promise 가 resolve 되면 onSuccess 가 호출된다.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Loading from '../src/components/Loading';

describe('Loading', () => {
  it('task resolve 시 onSuccess 가 결과와 함께 호출된다', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const result = { faceType: '계란형', features: ['a'] };
    render(
      <Loading
        task={Promise.resolve(result)}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(result), { timeout: 1500 });
    expect(onError).not.toHaveBeenCalled();
  });

  it('task reject 시 onError 가 호출된다', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const err = new Error('서버에 연결할 수 없어요');
    render(
      <Loading
        task={Promise.reject(err)}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err), { timeout: 1500 });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('label 과 steps 는 화면에 표시된다', () => {
    render(
      <Loading
        task={new Promise(() => {})}
        label="헤어 추천"
        steps={[
          { label: '얼굴형 매칭', en: 'SHAPE MATCH' },
          { label: '카드 큐레이션', en: 'CURATION' },
        ]}
      />,
    );
    expect(screen.getByText('헤어 추천'.toUpperCase())).toBeInTheDocument();
    expect(screen.getByText('SHAPE MATCH')).toBeInTheDocument();
    expect(screen.getByText('CURATION')).toBeInTheDocument();
  });
});
