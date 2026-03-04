# Phase 5 — 수익화 시스템

> 목표: API 비용 충당 + 수익 창출
> 전략: 광고 + 쿠팡 파트너스 (비침습적 방식)

---

## 수익 구조 설계

### API 비용 추산 (기준: 월 1,000명 사용자)

| API | 사용 시점 | 예상 비용/회 | 월 추산 |
|-----|----------|------------|--------|
| Gemini (분석+카드) | 분석 + 카드 생성 | ~$0.03 | $30/월 |
| Gemini (사진생성) | 유료 사용자만 | ~$0.01 | $5/월 |
| 합계 | | | **~$35/월** |

> ⚠️ 사용자 급증 시 비용 급증 위험 → Rate Limiting 필수 (Phase 2)

### 수익 모델

| 수익원 | 예상 수익 | 구현 난이도 |
|--------|---------|-----------|
| AdMob 보상형 광고 (카드 잠금 해제) | 월 $100~400 | 중간 |
| AdMob 배너 광고 | 월 $30~100 | 쉬움 |
| 쿠팡 파트너스 TOP 3 | 월 $50~200 | 중간 |
| 유료 구독 (광고 제거 + 전체 해금) | 월 구독자 × ₩2,900 | 중간 |

---

## 5-1. 카드 잠금 구조 (보상형 광고)

### 구조
```
카드 목록 화면:
  Rank 3 (3rd)  → 무료 공개
  Rank 1 (Best) → 🔒 잠금 — "광고 보고 확인하기"
  Rank 2 (2nd)  → 🔒 잠금 — "광고 보고 확인하기"
  Avoid 카드    → 무료 공개

유료 구독자: 전체 잠금 해제, 광고 없음
```

### UI 흐름
```
1. 카드 목록: Rank 1·2 블러 처리 + 자물쇠 아이콘
2. 탭 → "광고를 보면 이 카드를 확인할 수 있어요" 모달
3. 광고 시청 완료 → 해당 카드 잠금 해제 (세션 유지)
4. 앱 재시작 시 잠금 초기화 (재광고 유도)
```

### 구현
```python
# 보상형 광고 (AdMob Rewarded)
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads'

const rewarded = RewardedAd.createForAdRequest('ca-app-pub-xxx/xxx')
rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
  unlockCard(cardRank)  # rank 1 또는 2 해제
})
rewarded.load()
rewarded.show()
```

---

## 5-2. 쿠팡 파트너스 — TOP 3 상품 추천

### 변경된 방식 (링크 → 상품 큐레이션)

```
기존: "쿠팡에서 보기 →" (링크만)

변경:
┌─────────────────────────────────┐
│ 💄 내 퍼스널컬러 립 추천 TOP 3  │
│                                 │
│ 1위 ● 코랄 레드 립틴트    ₩15,900│ → 쿠팡 링크
│ 2위 ● 피치 립글로스       ₩12,500│ → 쿠팡 링크
│ 3위 ● 누드 코랄 립스틱    ₩18,000│ → 쿠팡 링크
└─────────────────────────────────┘
```

### 구현 방법
- 쿠팡 파트너스 검색 링크에 퍼스널컬러 × 제품 카테고리 키워드 조합
- 카드 상세 하단에 고정 노출

### 카드 상세 화면 — 메이크업 카드
```
┌─────────────────────────────────┐
│ 💄 Lip                          │
│ 코랄 레드, 매트 텍스처          │
│ 이유: 따뜻한 톤을 살려줍니다    │
│                                 │
│ 내 퍼스널컬러 립 추천 TOP 3     │
│ 1위 ● 코랄 레드 립틴트  ₩15,900 │
│ 2위 ● 피치 립스틱       ₩12,500 │
│ 3위 ● 누드 코랄         ₩18,000 │
└─────────────────────────────────┘
```

#### 헤어 카드 상세
```
┌─────────────────────────────────┐
│ 추천 헤어: 레이어드 컷          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🛍️ 관련 헤어 제품 보기      │ │  ← 헤어 오일, 드라이어 등
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 구현 방법

#### Option A: 쿠팡 파트너스 검색 링크 (간단)
```js
// 쿠팡 검색 링크 생성 (파트너스 태그 포함)
function buildCoupangSearchUrl(keyword) {
  const encoded = encodeURIComponent(keyword)
  return `https://www.coupang.com/np/search?q=${encoded}&ref=파트너스태그`
}

// 사용 예
buildCoupangSearchUrl('코랄 레드 립스틱')
buildCoupangSearchUrl('레이어드컷 헤어 오일')
```

#### Option B: 쿠팡 파트너스 API (정교함)
- 쿠팡 파트너스 API 신청 (partners.coupang.com)
- 제품 검색 API로 실제 제품 이미지 + 가격 + 링크 가져오기
- 백엔드에서 API 호출 후 프론트에 전달

### 키워드 매핑 전략
```js
// RAG 카드 데이터 → 쿠팡 검색 키워드 변환
const COUPANG_KEYWORDS = {
  // 립 컬러
  '코랄 레드': '코랄 레드 립스틱',
  '피치 핑크': '피치 핑크 립틴트',
  '버건디': '버건디 립스틱 가을',
  '누드 베이지': '누드 베이지 립글로스',

  // 블러셔
  '피치': '피치 블러셔 팔레트',
  '로즈': '로즈 블러셔',
  '산호': '산호색 블러셔',

  // 헤어
  '레이어드컷': '레이어드컷 헤어 스타일링',
  '볼륨매직': '볼륨매직 헤어 제품',
  '앞머리': '앞머리 클립 고정',
}
```

### UI 표시 규칙
- "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." 문구 필수 표시
- 작은 글씨로 하단에 표시 (법적 의무)

---

## 5-2. 광고 시스템

### 웹 (Google AdSense)

#### 광고 위치 (비침습적 원칙)
```
위치 1: 카드 목록 화면 — 추천 카드 3장과 Avoid 카드 사이
위치 2: 카드 상세 화면 — 최하단 (스크롤 끝)
위치 3: 히스토리 목록 — 2번째 항목 사이
위치 4: 트렌드 탭 — 피드 3번째 카드 사이 (배너)
```

❌ 광고 금지 위치:
- 분석 결과 화면 (집중 필요)
- 로딩 화면
- 카드 상세 내 추천 정보 섹션 내부

### 앱 (Google AdMob)

| 광고 타입 | 위치 | 빈도 |
|----------|------|------|
| 배너 광고 | 카드 목록 하단 고정 | 항상 |
| 전면 광고 | 분석 완료 → 결과 화면 전환 시 | 1회/세션 |
| 보상형 광고 | "사진 생성 1회 추가 보너스" | 선택적 |

#### 보상형 광고 활용 (창의적)
```
기본 제공:
- 분석 3회/일 무료
- Gemini 사진 생성 0회/일 (로그인 유저)

광고 시청으로 추가 획득:
- 광고 1회 시청 → 사진 생성 1회 추가
- 광고 1회 시청 → 분석 1회 추가
```

### Capacitor AdMob 플러그인
```bash
npm install @capacitor-community/admob
```

```js
// 전면 광고 표시 (분석 완료 후)
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob'

async function showInterstitial() {
  await AdMob.prepareInterstitial({ adId: 'ca-app-pub-xxx/xxx' })
  await AdMob.showInterstitial()
}
```

---

## 5-3. 유료 플랜 (MVP 포함 — Android 출시 기준)

> Android 인앱결제 (Google Play Billing) + 웹 결제 (Stripe 등) 지원

| 기능 | 무료 | 유료 (월 ₩2,900) |
|------|------|----------------|
| 얼굴 분석 | 3회/일 | 무제한 |
| 카드 생성 | 9회/일 | 무제한 |
| Gemini 사진 생성 | ❌ 불가 | ✅ 무제한 |
| 히스토리 보관 | 최근 5회 | 무제한 |
| 광고 | 있음 | 없음 |

### 인앱결제 구현 (Capacitor)
```bash
npm install @capacitor-community/in-app-purchases
```
- Google Play Billing API 연동
- iOS 출시 시 Apple In-App Purchase 추가
- 구독 상태는 백엔드(Supabase)에서 검증 후 기능 해제

### 결제 후 Gemini 사진 생성 흐름
```
1. 카드 상세 → "AI 사진 생성" 버튼
2. 비유료: "유료 플랜에서 이용 가능" + 구독 유도 UI
3. 유료: Gemini API 호출 → 사진 생성 (백엔드 경유)
```

---

## 5-4. 수익화 트래킹

### 추적해야 할 이벤트 (Google Analytics / Firebase)

```js
// 쿠팡 링크 클릭
analytics.track('coupang_link_click', {
  card_type: 'makeup',
  keyword: '코랄 레드 립스틱',
  card_rank: 1,
})

// 광고 시청
analytics.track('ad_watched', {
  ad_type: 'rewarded',
  reward: 'photo_generation',
})

// 카드 상세 조회
analytics.track('card_detail_view', {
  card_type: 'hair',
  face_type: '계란형',
  personal_color: 'spring_warm',
})
```

---

## Phase 5 완료 기준 체크리스트

- [ ] 쿠팡 파트너스 계정 신청 및 승인
- [ ] 메이크업 카드 내 쿠팡 링크 표시
- [ ] 헤어 카드 내 쿠팡 링크 표시
- [ ] 법적 고지 문구 표시
- [ ] Google AdSense 계정 신청 및 승인
- [ ] 웹 배너 광고 3곳 적용
- [ ] AdMob 앱 광고 (배너 + 전면) 적용 (Phase 6 연계)
- [ ] 보상형 광고로 사진 생성 추가 획득 기능
- [ ] Firebase Analytics 이벤트 트래킹 적용
- [ ] 첫 달 수익 보고 (수익 > API 비용 확인)
