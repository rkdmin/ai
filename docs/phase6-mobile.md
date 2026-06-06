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

### ✅ 적용 현황 (2026-06-06)

초기 세팅과 Android 플랫폼 생성을 완료했다.

- `@capacitor/cli`(devDep), `@capacitor/android` 설치. `@capacitor/core`(8.3.3)는 기존 플러그인 전이 의존성으로 이미 있었음.
- 설정 파일은 `capacitor.config.ts` 대신 **`capacitor.config.json`** 사용 — 이 프로젝트는 TypeScript 툴체인이 없어 JSON 이 의존성 없이 항상 동작한다.
  - `appId: "app.beaumi.coach"` (Play Store 패키지명 — **출시 전까지만 변경 가능**, 첫 제출 후 영구 고정)
  - `appName: "Beaumi"`, `webDir: "dist"`
- `npx cap add android` 로 `android/` 네이티브 프로젝트 스캐폴딩 완료. 기존 플러그인 2개(`@capacitor/app`, `@capacitor/haptics`) 자동 감지됨.
- SDK 버전(`android/variables.gradle`): `minSdk 24`, `compile/targetSdk 36` — Play Store targetSdk 요구치 충족.
- `android/` 는 커밋한다. 빌드 산출물(`build/`, `.gradle/`, `app/src/main/assets/public`, keystore, `local.properties`)은 `android/.gitignore` 가 제외.

#### 첫 빌드/실행 검증 (2026-06-06)

- Android Studio Quail(2026.1.1) 설치. SDK `%LOCALAPPDATA%\Android\Sdk`, 번들 JBR(JDK 21) `C:\Program Files\Android\Android Studio\jbr` 사용.
- `gradlew assembleDebug` (JAVA_HOME=JBR, ANDROID_HOME=SDK) → **BUILD SUCCESSFUL**, `app-debug.apk` 4.41MB 생성. 툴체인 end-to-end 동작 확인.
- 에뮬레이터(Pixel 8 / API 37 Google Play x86_64)에 `adb install` → `am start app.beaumi.coach/.MainActivity` 로 실행.
- **홈 화면 정상 렌더 확인**: 히어로/EXPLORE 타일/하단 탭바/게스트 RECENT 안내 카피, 한글 깨짐 없음.
- `VITE_MOCK=true` 빌드로도 에뮬레이터 렌더 확인 (TREND 준비중 화면 등). 백엔드 없이 UI 흐름 점검 가능.
- 아직 검증 전: 분석 플로우(백엔드 도달 필요), 카메라/공유/OAuth 네이티브 브리지.

> ⚠️ **에뮬레이터 이미지 주의**: Pixel_8 에 받은 "16 KB Page Size" 이미지(API 37)는
> 첫 페인트 때 `libmonochrome_64.so dlopen failed` (Chromium WebView 네이티브 로드 지연)로
> **백지 화면이 잠깐 보였다가 복구**된다. 동작엔 지장 없으나 첫 로딩이 느리다.
> 플레이키하면 일반(non-16KB) 시스템 이미지로 AVD 를 다시 만들면 해소된다.

#### 검증 전략 (PC mock / 실폰 real) — 2026-06-06 확정

- **PC 에뮬레이터 + `VITE_MOCK=true`**: UI 흐름·네이티브 브리지(카메라/공유) 검증. 백엔드 불필요.
- **실제 폰 + 배포 백엔드(Render/Railway)**: 진짜 분석·OAuth·쿠팡 링크·실제 카메라 검증.
- 주의: mock 은 실제 HTTP/CORS 경로를 타지 않는다. 그 경로는 배포 백엔드+실폰에서 처음 검증되므로,
  배포 시 `ALLOWED_ORIGINS` 에 Capacitor WebView origin(`https://localhost`, `capacitor://localhost`)을 반드시 포함한다.
  (현재 `.env` 에 `capacitor://localhost`·`http://localhost` 는 있으나 `https://localhost` 누락 → 배포 단계에서 추가)

> ⚠️ **빌드/실행 선행 조건**: 이 작업 시점의 개발 머신에는 **JDK·Android Studio·Android SDK 가 미설치**다.
> `npx cap add/sync` 같은 스캐폴딩은 SDK 없이 동작하지만, `npx cap open android` → signed `.aab` 빌드·실기기 실행은 **Android Studio(JDK+SDK 번들) 설치가 선행**되어야 한다. 설치 후 위 "기본 개발 루프"로 진행한다.

### 6-1.1 개발 머신 준비 (Windows)

스캐폴딩 기준 버전: **Gradle 8.14.3 / AGP 8.13.0** → JDK 17+ 필요(권장 21).
최신 Android Studio 가 **JDK 21(JBR)을 번들**하므로 별도 JDK 설치는 불필요하다.

1. **Android Studio 설치** — https://developer.android.com/studio 에서 받아 기본 옵션으로 설치.
   첫 실행 시 "Standard" 셋업을 고르면 Android SDK / Platform-Tools / Emulator / JBR 를 함께 받는다 (수 GB).
   기본 SDK 경로: `%LOCALAPPDATA%\Android\Sdk`
2. **(선택) 환경변수** — CLI(`gradlew`) 빌드까지 쓰려면 `ANDROID_HOME` 를 위 SDK 경로로 설정.
   첫 실행은 Android Studio 안에서 Run 하면 되므로 필수는 아니다.
3. **실행 대상 준비** — 둘 중 하나
   - 실기기: USB 연결 + 개발자 옵션 → USB 디버깅 켜기 (카메라/OAuth 검증에 가장 적합)
   - 에뮬레이터: Android Studio → Device Manager → AVD 생성
4. **첫 빌드/실행**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android   # Android Studio 열림 → Gradle sync 대기 → 기기 선택 → ▶ Run
   ```
   런처에 **Beaumi** 앱이 뜨면 성공.
5. **백엔드 연결 주의** — 빌드 시점의 `VITE_API_URL` 이 앱에 박힌다.
   폰에서는 `localhost` 가 PC 를 가리키지 않으므로, 분석 플로우까지 보려면 도달 가능한 백엔드 주소(Render/Railway 또는 터널)로 빌드해야 한다.
   "앱이 뜨고 화면이 렌더되는지"만 보는 첫 스모크는 백엔드 없이도 가능.

---

## 6-2. 필수 플러그인/브리지

| 기능 | 선택 | 도입 시점 |
|------|------|---------|
| 사진 접근 | `@capacitor/camera` | v1.0 |
| 공유 | `html2canvas` + `@capacitor/share` | v1.0 |
| 구글 로그인 | Supabase OAuth redirect bridge | v1.0 |
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
- 구글: Supabase OAuth redirect bridge
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

## Phase 6 저장소/구현 기준 체크리스트

> 위 체크는 **저장소/빌드/설정 기준으로 확인 가능한 항목**이다.
> 실제 Android 기기와 스토어 환경에서 확인해야 하는 항목은 아래 `🙋 사용자 직접 테스트 체크리스트`에서 따로 체크한다.

- [x] Capacitor 초기 세팅 완료 (`capacitor.config.json` — appId `app.beaumi.coach` / appName `Beaumi` / webDir `dist`)
- [x] Android 플랫폼 생성 완료 (`npx cap add android` — `android/` 스캐폴딩, target/compileSdk 36)
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
