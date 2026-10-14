// 모바일 안전영역(상단 노치/카메라/시간 표시) 확보 spacer.
// 실제 시계·와이파이·배터리는 OS(Android·iOS)가 직접 그려준다.
// 디자인 시안에 그려져 있던 9:41/와이파이/배터리 글리프는 mock 이었으므로 제거.
//
// dark prop 은 호출부 호환을 위해 그대로 받지만, 색상은 부모 컨테이너에서 결정.
// 네이티브는 시스템 상태바를 위해 32px 이상, 웹은 과한 빈 띠를 피하도록 16px만 확보한다.
import { isNativePlatform } from '../../utils/platform';

export function StatusBar() {
  const height = isNativePlatform() ? 'max(env(safe-area-inset-top), 32px)' : 16;
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        flexShrink: 0,
      }}
    />
  );
}
