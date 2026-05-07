# Phase 6 — Android 앱 출시 (1차)

> 목표: 기존 React + Vite 앱을 `Capacitor`로 패키징해 **Play Store에 1차 출시**한다.
> 선행 조건: Phase 1~4 완료 (Phase 5 수익화는 v1.1로 연기)
> iOS 출시는 별도 `phase7-ios.md`에서 다룬다.

---

## 모바일 전략: React + Capacitor

### 선택 이유

- 기존 React 컴포넌트와 상태 흐름을 그대로 재사용할 수 있다
- React Native처럼 화면 전체를 재작성할 필요가 없다
- 유지보수 포인트가 웹과 앱으로 이원화되지 않는다
- 콘텐츠 중심 앱이어서 WebView 기반 성능으로 충분하다

### 핵심 원칙

- 웹 앱이 곧 앱 UI다
- 모바일 전용 기능만 Capacitor 플러그인으로 브리지한다
- **Android 1차 출시에 집중**한다. iOS 플랫폼 추가는 Phase 7에서 진행
- 1차 출시는 광고/카드 잠금 없이 진행한다 (수익화는 v1.1)

---

## 프로젝트 구조

```
/
├── src/                  ← 현재 React + Vite 앱
├── public/
├── backend/
├── capacitor.config.ts
└── android/
```

- 별도의 `app/` 디렉터리를 만들지 않는다
- `npm run build` 결과물을 Capacitor가 감싼다
- `ios/` 디렉터리는 Phase 7에서 추가한다

---

## 6-1. Capacitor 초기 세팅 (Android만)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android
npx cap add android
```

### 기본 개발 루프

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 6-2. 필수 플러그인/브리지

| 기능 | 선택 | 도입 시점 |
|------|------|---------|
| 사진 접근 | `@capacitor/camera` | v1.0 |
| 공유 | `html2canvas` + `@capacitor/share` | v1.0 |
| 구글 로그인 | `@codetrix-studio/capacitor-google-auth` | v1.0 |
| 카카오 로그인 | Supabase OAuth + InAppBrowser | v1.0 |
| 에러 트래킹 | `@sentry/browser` | v1.0 |
| 광고 | `@capacitor-community/admob` | v1.1 |
| 애플 로그인 | `@capacitor-community/apple-sign-in` | Phase 7 (iOS) |

### 구현 원칙

- `src` 내부 공용 로직은 유지
- 플랫폼 의존 기능만 별도 브리지 파일로 분리
- 브라우저에서도 동작해야 하므로 fallback 분기 필요

### 카카오 OAuth 리스크

카카오 OAuth는 Phase 3 시작 전 1일 PoC를 거친다. 상세 케이스와 기준은 `phase3-auth.md` 3-1 "카카오 OAuth PoC" 섹션 참고.
Phase 6에서는 release candidate 빌드에서 PoC 케이스를 device smoke로 다시 검증한다.

---

## 6-3. MediaPipe / 분석 구조

```
Capacitor 앱
   ↓
/api/analyze
   ├─ MediaPipe (Python, 백엔드)
   └─ Gemini 2.5 Flash
```

- 모바일에서도 분석은 백엔드 수행
- 앱은 사진 촬영/선택과 결과 표시만 담당

---

## 6-4. 인증 / 외부 링크 구조

### 인증

- 카카오: Supabase OAuth + InAppBrowser
- 구글: Capacitor Google Auth
- 애플: Phase 7 (iOS 출시 시)

### 외부 링크

- 메이크업 카드 CTA는 시스템 브라우저에서 쿠팡파트너스 링크를 연다
- 외부 이동 전 고지 문구와 링크 목적을 명확히 표시한다

---

## 6-5. 빌드 및 배포

### Android

1. `npm run build`
2. `npx cap sync android`
3. `npx cap open android`
4. Android Studio에서 signed `.aab` 생성
5. Play Console 업로드

---

## 6-6. 배포 인프라 연계

- 개발·실기기 테스트 단계: `Render 무료` 백엔드 사용 가능
- Play Store 제출 전: `Railway Hobby`로 이전해 슬립 제거
- 앱 심사/초기 운영 동안은 Railway + Supabase 무료 조합 유지

---

## 6-7. 스토어 준비물 (Android)

- [ ] Google Play Console 계정
- [ ] 개인정보처리방침 URL
- [ ] 앱 설명 / 키워드 / 카테고리
- [ ] 스크린샷
- [ ] 데이터 보안 설문

---

## 6-8. 운영 모니터링

- Sentry로 런타임 오류 수집
- Play Console Android Vitals 모니터링
- 심사 후 1주 동안 크래시 / 외부 링크 콜백 집중 확인

---

## 6-9. 테스트 전략

- [ ] Capacitor 브리지별 device smoke checklist 유지
- [ ] 카메라 / OAuth / 공유 / 외부 링크 실기기 테스트
- [ ] Play Console Pre-launch Report 확인
- [ ] release candidate마다 smoke test 재실행

---

## Phase 6 완료 기준 체크리스트

- [ ] Capacitor 초기 세팅 완료
- [ ] Android 플랫폼 생성 완료
- [ ] 카메라 업로드 동작 확인
- [ ] 결과 카드 공유 동작 확인
- [ ] 카카오 / 구글 로그인 동작 확인
- [ ] 쿠팡 외부 링크 동작 확인
- [ ] Render 백엔드로 실기기 QA 완료
- [ ] Railway Hobby 이전 완료
- [ ] Android Studio signed `.aab` 생성 성공
- [ ] Play Store 심사 통과
- [ ] Android device smoke test 통과

---

## 🙋 사용자 직접 테스트 체크리스트 (Phase 6)

### 사전 빌드 검증
- [ ] `npm run build` 후 `npx cap sync android` → 에러 없이 완료
- [ ] Android Studio에서 signed `.aab` 빌드 성공
- [ ] 빌드 결과물 크기가 적정 (대략 < 30MB)
- [ ] 빌드 산출물에서 `grep -ri "AIza\|Bearer "` 같은 시크릿 흔적 없음

### 실기기 (내부 테스트 트랙)
- [ ] Play Console 내부 테스트 트랙으로 본인 폰에 설치
- [ ] 첫 실행 → 온보딩 → 카메라 권한 허용 → 분석까지 30초 이내
- [ ] 카메라로 직접 촬영 → 사진이 정상으로 전달
- [ ] 갤러리에서 사진 선택 → 동일하게 분석 성공
- [ ] 카카오 로그인 → 카카오톡 앱 → 콜백 성공
- [ ] 구글 로그인 → 콜백 성공
- [ ] 카드 이미지 공유 → 카카오톡/인스타로 정상 전달
- [ ] 메이크업 카드 → 쿠팡 외부 링크 → 크롬 또는 기본 브라우저로 열림
- [ ] 백그라운드 → 포그라운드 복귀 시 분석 결과 유지

### 오류·안정성
- [ ] 오프라인 상태로 분석 시도 → 네트워크 안내
- [ ] 30분 사용해도 메모리 증가/렉 없음
- [ ] Sentry 대시보드에서 첫 사용 후 크래시 0건
- [ ] Play Console Pre-launch Report 모든 ANR/크래시 0
- [ ] 알림창에 앱 권한 외 추가로 요청되는 권한 없는지

### 출시 준비물 점검
- [ ] 앱 아이콘이 다양한 런처에서 깨지지 않음
- [ ] 스플래시 화면이 자연스럽게 사라짐
- [ ] 개인정보처리방침 URL이 실제 도메인에서 200 응답
- [ ] 스토어 등록 스크린샷이 실제 화면과 일치
