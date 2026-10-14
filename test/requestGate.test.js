import { describe, expect, it } from 'vitest';
import { createRequestGate, isStaleRequestError } from '../src/utils/requestGate';

describe('F01 request gate', () => {
  it('취소·이탈 뒤 늦게 도착한 응답은 stale로 무효화한다', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const gate = createRequestGate();
    const request = gate.run(pending);

    gate.cancel(request.id);
    finish({ faceType: '계란형' });

    await expect(request.task).rejects.toMatchObject({ stale: true });
    await request.task.catch((error) => expect(isStaleRequestError(error)).toBe(true));
  });

  it('현재 요청의 응답은 그대로 전달한다', async () => {
    const gate = createRequestGate();
    const request = gate.run(Promise.resolve({ ok: true }));

    await expect(request.task).resolves.toEqual({ ok: true });
    expect(gate.isCurrent(request.id)).toBe(true);
  });
});
