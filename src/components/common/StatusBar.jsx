// 모바일 안전영역(상단 노치/카메라/시간 표시) 확보 spacer.
// 실제 시계·와이파이·배터리는 OS(Android·iOS)가 직접 그려준다.
// 디자인 시안에 그려져 있던 9:41/와이파이/배터리 글리프는 mock 이었으므로 제거.
//
// dark prop 은 호출부 호환을 위해 그대로 받지만, 색상은 부모 컨테이너에서 결정.
// CSS env(safe-area-inset-top) 가 0 이어도 16px 의 최소 여백을 확보한다.
export function StatusBar() {
  return (
    <div
      style={{
        height: 'max(env(safe-area-inset-top), 16px)',
        flexShrink: 0,
      }}
    />
  );
}
