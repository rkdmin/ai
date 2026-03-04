# Phase 6 — 모바일 앱 출시 (Android / iOS)

> 목표: Google Play Store + Apple App Store 정식 출시
> 전략: React Native (Expo) — 앱 퍼스트, 확장성 우선
> 선행 조건: Phase 2~5 완료 (백엔드, 인증, UX, 수익화)

---

## 출시 순서

```
1차 출시: Android (Google Play) ← MVP 목표
2차 출시: iOS (App Store)       ← v1.1 목표
```

---

## 모바일 전략: React Native (Expo) ✅

### 선택 이유
- 앱 퍼스트 기준, 확장성 고려
- 네이티브 수준 성능 + UX
- 향후 실시간 카메라 AR 기능 확장 가능
- 앱스토어 심사 거절 리스크 없음
- iOS/Android 단일 코드베이스

### 현재 웹 코드베이스와 관계
```
현재 React + Vite 웹 앱
    ↓
재사용 가능:           재작성 필요:
- src/utils/ragUtils.js  - 모든 컴포넌트 (.jsx → RN StyleSheet)
- src/data/*.json        - CSS 전부
- src/api/*.js           - PhotoUpload, CardList, CardDetail 등
- 비즈니스 로직
```

> 웹 버전은 Vercel 배포 유지 (랜딩/소개 페이지용)
> 앱은 RN으로 별도 개발

---

## 프로젝트 구조

```
/
├── web/          ← 현재 React + Vite (웹 유지)
└── app/          ← React Native (Expo) 새로 생성
    ├── src/
    │   ├── screens/
    │   │   ├── UploadScreen.tsx
    │   │   ├── AnalysisScreen.tsx
    │   │   ├── CardListScreen.tsx
    │   │   ├── CardDetailScreen.tsx
    │   │   ├── HistoryScreen.tsx
    │   │   └── LoginScreen.tsx
    │   ├── components/
    │   ├── api/          ← web/src/api 재사용 (백엔드 호출)
    │   ├── utils/        ← ragUtils.js 이식
    │   ├── data/         ← JSON 파일 그대로 복사
    │   └── navigation/   ← React Navigation
    ├── app.json
    └── package.json
```

---

## 6-1. Expo 초기 세팅

```bash
npx create-expo-app app --template blank-typescript
cd app
npx expo install expo-image-picker expo-camera expo-file-system
npx expo install expo-router  # 네비게이션
```

### 주요 패키지

| 패키지 | 기능 |
|--------|------|
| `expo-router` | 파일 기반 네비게이션 |
| `expo-image-picker` | 갤러리/카메라 접근 |
| `expo-camera` | 카메라 직접 제어 |
| `react-native-purchases` | 인앱결제 (RevenueCat) |
| `react-native-google-mobile-ads` | AdMob |
| `@react-native-google-signin/google-signin` | 구글 로그인 |
| `@react-native-seoul/kakao-login` | 카카오 로그인 |
| `expo-splash-screen` | 스플래시 스크린 |
| `@sentry/react-native` | 에러 트래킹 |

---

## 6-2. MediaPipe 전략 (React Native 환경)

> MediaPipe WebAssembly는 RN에서 직접 실행 불가
> → **백엔드에서 실행**하는 방식으로 전환

### 변경된 흐름

```
기존 계획 (Capacitor):
  앱 → MediaPipe (WebAssembly, 앱 내) → 수치 → Claude

변경 (React Native):
  앱 → 백엔드 /api/analyze
         ├─ MediaPipe (Python, 서버) → 수치 계산
         └─ Claude API → 수치 + 이미지 → 얼굴형 + features
```

### 백엔드 Python MediaPipe

```python
# backend/services/mediapipe_service.py
import mediapipe as mp
import numpy as np

def extract_face_ratios(image_bytes):
    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(static_image_mode=True) as face_mesh:
        results = face_mesh.process(image)
        if not results.multi_face_landmarks:
            return None
        landmarks = results.multi_face_landmarks[0].landmark
        return {
            "foreheadRatio": calc_forehead_ratio(landmarks),
            "jawRatio":      calc_jaw_ratio(landmarks),
            "aspectRatio":   calc_aspect_ratio(landmarks),
            "jawAngle":      calc_jaw_angle(landmarks),
            "upperFaceRatio": calc_upper_ratio(landmarks),
            "midFaceRatio":   calc_mid_ratio(landmarks),
            "lowerFaceRatio": calc_lower_ratio(landmarks),
        }
```

> 백엔드를 Python으로 변경하거나, Node 백엔드에서 Python 서비스를 별도로 실행
> 또는 Node.js에서 `@mediapipe/tasks-vision` Node 어댑터 사용 가능

### 장점
- RN 앱 번들 크기 증가 없음
- 서버에서 실행 → 더 안정적
- 향후 더 강력한 분석 모델로 교체 용이

---

## 6-3. 네비게이션 구조 (Expo Router)

```
app/
├── (auth)/
│   └── login.tsx          # 로그인
├── (tabs)/
│   ├── index.tsx           # 홈 탭 (업로드)
│   ├── trends.tsx          # 트렌드 탭 (뷰티 피드)
│   └── history.tsx         # 히스토리 탭
├── analysis.tsx            # 분석 결과
├── cards.tsx               # 카드 목록
├── card/[id].tsx           # 카드 상세
└── history/[id].tsx        # 히스토리 상세
```

> 탭바는 `analyzing` / `generatingCards` 단계에서 숨김 처리

---

## 6-4. 인앱결제 (RevenueCat)

> Google Play Billing + Apple IAP를 RevenueCat으로 추상화
> → 플랫폼별 코드 분기 없이 단일 API

```bash
npm install react-native-purchases
```

```ts
import Purchases from 'react-native-purchases'

// 구독 여부 확인
const customerInfo = await Purchases.getCustomerInfo()
const isPremium = customerInfo.entitlements.active['premium']

// 구독 구매
const offerings = await Purchases.getOfferings()
await Purchases.purchasePackage(offerings.current.monthly)
```

---

## 6-5. 앱 권한 설정

### Android (`app.json`)
```json
{
  "android": {
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

### iOS (`app.json`)
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "얼굴 분석을 위해 카메라 접근이 필요합니다",
      "NSPhotoLibraryUsageDescription": "갤러리에서 사진을 선택하기 위해 필요합니다"
    }
  }
}
```

---

## 6-6. 앱 아이콘 + 스플래시

```json
// app.json
{
  "icon": "./assets/icon.png",          // 1024×1024
  "splash": {
    "image": "./assets/splash.png",     // 1284×2778
    "backgroundColor": "#FAFAFA"
  }
}
```

---

## 6-7. Android 출시

- [ ] Google Play Console 계정 ($25 일회성)
- [ ] `eas build --platform android` (Expo EAS Build)
- [ ] `.aab` 파일 생성 후 Play Console 업로드
- [ ] 개인정보처리방침 URL
- [ ] 스크린샷 최소 2장, 기능 그래픽 (1024×500)
- [ ] 데이터 보안 섹션 작성
- [ ] 심사 기간: 1~3일

---

## 6-8. iOS 출시

- [ ] Apple Developer 계정 ($99/년, Mac 필요)
- [ ] Apple Sign In 구현 (소셜 로그인 있을 경우 필수)
- [ ] `eas build --platform ios`
- [ ] App Store Connect 업로드
- [ ] 스크린샷 (6.5인치, 5.5인치 각 3장 이상)
- [ ] 심사 기간: 1~7일

---

## 6-9. 앱스토어 최적화 (ASO)

### 키워드
```
주요: 얼굴형 분석, 메이크업 추천, 헤어 추천, AI 뷰티
서브: 퍼스널컬러, 얼굴형 테스트, 뷰티 코치, 얼굴 분석
```

### 스크린샷 순서
```
1. "내 얼굴형을 AI가 분석해드려요" + 메인 화면
2. "얼굴형별 헤어 추천" + 카드 화면
3. "퍼스널컬러에 맞는 메이크업" + 메이크업 카드
4. "AI가 내 얼굴에 적용해봤어요" + 생성 사진
5. "내 스타일 기록 저장" + 히스토리
```

---

## 6-10. 출시 후 운영

- Firebase Crashlytics + Sentry 이중 모니터링
- 1~2성 리뷰 72시간 내 응답
- 핫픽스: 즉시 / 마이너: 2주~1개월 / 메이저: 2~3개월

---

## Phase 6 완료 기준 체크리스트

- [ ] Expo 프로젝트 초기 세팅
- [ ] 백엔드 MediaPipe (Python) 연동 확인
- [ ] 전체 화면 RN으로 재작성 완료
- [ ] 카카오 / 구글 로그인 동작 확인
- [ ] 인앱결제 (RevenueCat) Android 테스트
- [ ] AdMob 광고 동작 확인
- [ ] 쿠팡 파트너스 링크 동작 확인
- [ ] Apple Sign In 구현 (iOS 출시 전)
- [ ] EAS Build Android 빌드 성공
- [ ] Google Play 심사 통과
- [ ] EAS Build iOS 빌드 성공 (Mac 필요)
- [ ] App Store 심사 통과
- [ ] Crashlytics 연동 확인
- [ ] 출시 후 1주 모니터링
