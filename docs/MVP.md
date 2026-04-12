# 🎯 MVP — Android 출시 기준

> 목표: 기존 React 웹 앱을 그대로 활용해 `Capacitor`로 Android 앱을 먼저 출시한다.
> 이 문서의 항목이 모두 충족되어야 Play Store 제출 가능.

---

## 출시 전 필수 완료 항목

### 핵심 기능
- [ ] 정면 사진 업로드 + 측면 사진 선택 업로드
- [ ] MediaPipe(백엔드) + Gemini 2.5 Flash 얼굴형 분석
- [ ] 퍼스널컬러 확정 흐름 (알면 선택 / 모르면 건너뛰기 또는 질문 흐름)
- [ ] RAG 기반 헤어 / 메이크업 / 종합 카드 4장 생성
- [ ] 카드 상세 + 전문가 코멘트
- [ ] 헤어 / 종합 추천 카드 적용 사진 생성
- [ ] 메이크업 카드 추천 제품 + 쿠팡파트너스 링크

### 보안 / 백엔드
- [ ] AI API 키를 백엔드로 완전 이동
- [ ] `Render 무료`로 개발·테스트 배포 확인
- [ ] 출시 직전 `Railway Hobby`로 이전해 슬립 없는 운영 환경 확보
- [ ] Rate Limiting 적용 (게스트 / 로그인 차등)

### 인증
- [ ] 카카오 로그인: Supabase OAuth + InAppBrowser 플로우 동작 확인
- [ ] 구글 로그인: `@codetrix-studio/capacitor-google-auth` 동작 확인
- [ ] 게스트 1회 체험

### 히스토리
- [ ] 분석 결과 저장 (로그인 시 자동)
- [ ] 최근 5회 조회

### 수익화
- [ ] 카드 잠금 구조: Rank 3 무료, Rank 1·2는 보상형 광고 시청 후 해금
- [ ] AdMob 보상형 광고 1회 시청 → 카드 1장 해금
- [ ] AdMob 배너 광고
- [ ] 쿠팡 파트너스: 메이크업 카드 상세 내 추천 제품 영역 노출

### 바이럴
- [ ] 결과 카드 이미지 저장/공유 (`html2canvas` + `@capacitor/share`)
- [ ] 감성 얼굴형 레이블 (`styleLabel`)
- [ ] 연예인 스타일 매칭 텍스트
- [ ] 전후 비교 토글 (헤어/종합 추천 카드 한정)

### 앱 패키징
- [ ] Capacitor 초기 세팅 (`npx cap init`)
- [ ] Android 플랫폼 추가 및 실기기 테스트 완료
- [ ] 앱 아이콘 / 스플래시 설정
- [ ] 개인정보처리방침 페이지
- [ ] Play Store 제출용 `.aab` 생성

### 테스트 / 품질 게이트
- [ ] 프론트 unit test 기본 세트 구축 (`Vitest`)
- [ ] 백엔드 API contract/integration test 구축 (`pytest + TestClient`)
- [ ] 핵심 사용자 플로우 E2E 1~2개 구축 (`Playwright`)
- [ ] 얼굴형/카드 품질 eval 데이터셋 10~15장 구축
- [ ] Android 실기기 smoke test 통과

---

## 출시 후로 미루는 것 (v1.1+)

| 항목 | 이유 |
|------|------|
| iOS 출시 | Android 지표 검증 후 진행 |
| Apple 로그인 | iOS 출시 시 필수 |
| 뷰티 트렌드 피드 | 주간 수집/요약 백엔드 운영 부담 큼 |
| 친구 공유 → 비교 기능 | 실제 공유 데이터 쌓인 후 설계 |
| 주간 리포트 푸시 알림 | 리텐션 지표 확인 후 |
| 실시간 AR | 기술 난이도와 운영비 높음 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Vite |
| 앱 패키징 | Capacitor |
| 백엔드 | Python + FastAPI |
| 얼굴 측정 | MediaPipe (Python, 백엔드) |
| 얼굴 분석 + 카드 생성 | Gemini 2.5 Flash |
| 이미지 생성 | Gemini 2.5 Flash (헤어/종합 카드 전용) |
| DB / 인증 | Supabase |
| 앱 빌드 | Capacitor CLI + Android Studio |
| 광고 | Google AdMob (`@capacitor-community/admob`) |
| 제휴 | 쿠팡 파트너스 |

---

## 출시 판단 기준 (Go / No-Go)

| 지표 | 기준 | 측정 방법 |
|------|------|---------|
| 얼굴형 분석 정확도 | 10명 테스트 중 9명 이상 납득 | 내부 테스트 |
| 분석 완료까지 소요 시간 | 30초 이내 | Android 실기기 측정 |
| 카드 생성 성공률 | 99% 이상 | 반복 테스트 |
| API 키 노출 여부 | 없음 | 개발자 도구 / 앱 번들 점검 |
| 앱 안정성 | 치명적 크래시 없음 | Sentry + Play Console Pre-launch Report |

---

## 테스트 문서

→ `test.md` 참고
