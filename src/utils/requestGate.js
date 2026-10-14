export class StaleRequestError extends Error {
  constructor() {
    super('stale request');
    this.name = 'StaleRequestError';
    this.stale = true;
  }
}

// 취소·이탈 뒤 늦게 끝난 Promise 가 화면 상태를 바꾸지 못하게 순번으로 무효화한다.
export function createRequestGate() {
  let currentId = 0;

  return {
    run(promise) {
      const id = ++currentId;
      return {
        id,
        task: Promise.resolve(promise).then(
          (value) => {
            if (id !== currentId) throw new StaleRequestError();
            return value;
          },
          (error) => {
            if (id !== currentId) throw new StaleRequestError();
            throw error;
          },
        ),
      };
    },
    cancel(id) {
      if (id == null || id === currentId) currentId += 1;
    },
    isCurrent(id) {
      return id === currentId;
    },
  };
}

export function isStaleRequestError(error) {
  return error?.stale === true || error?.name === 'StaleRequestError';
}
