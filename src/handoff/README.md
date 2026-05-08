# Beaumi 디자인 적용 핸드오프 패키지

이 폴더의 `src/` 내용을 로컬 `ai/src/` 에 그대로 복사하면 와이어프레임 디자인이 즉시 적용됩니다.

## 적용 순서 (Claude Code 한테 시키기)

```
1. handoff/src/ 의 모든 파일을 ai/src/ 에 덮어쓰기
   - 기존 App.jsx, App.css, components/ 는 백업 후 교체
2. handoff/CLAUDE_CODE_NOTES.md 읽고 백엔드 정책 변경사항 적용
3. npm run dev 로 확인
```

## 구조

```
handoff/
├── src/
│   ├── styles/
│   │   ├── tokens.css         # 컬러·폰트·간격 토큰
│   │   └── globals.css        # @font-face, utility classes (label/ko/serif-i)
│   ├── components/
│   │   ├── common/            # Section, BackHeader, CtaTile, Icons, FacePlaceholder, MosaicOverlay 등
│   │   ├── PhotoUpload.jsx    # ← 기존 교체
│   │   ├── AnalysisResult.jsx # ← 기존 교체 (= Result Home)
│   │   ├── CardList.jsx       # ← 기존 교체
│   │   ├── CardDetail.jsx     # ← 기존 교체
│   │   ├── Loading.jsx        # 분석 로딩 (4-step)
│   │   ├── AdGate.jsx         # 15초 광고 게이트
│   │   └── ShareCard.jsx      # 공유 카드
│   ├── App.jsx                # 간단한 라우팅
│   ├── App.css
│   ├── index.css
│   └── main.jsx
└── CLAUDE_CODE_NOTES.md       # 백엔드 정책 변경 (연예인 필드 제거)
```

## 디자인 시스템 요약

- **컬러:** `#fff` 배경 + `#000` 라인/텍스트 + 액센트 `#f6f1ed` (warm beige)
- **폰트:** Pretendard (한글), Jost (영문 라벨, `letter-spacing: .22em` uppercase), Cormorant Garamond Italic (nº 표기)
- **모서리:** 0px (사각 그리드)
- **톤:** 에디토리얼 매거진 — 1px 검정 라인 + 큰 흑백 사진

## 라벨 패턴 (어디서든 동일하게)

- `STEP 04 · TRY ON` (Jost uppercase + 12px)
- `nº 01` (serif italic)
- `1ST · BEST MATCH` (Jost uppercase)
- `ROMANTIC` / `CLEAN` / `SOFT` (무드 키워드, **연예인 이름 절대 X**)

## 절대 추가하지 말 것

- 실제 연예인 이름·사진
- "닮은꼴" / "look-alike" 비교 기능
- "○○ st" 표기
- 인물 비주얼은 모두 추상 무드 카드 또는 가상 placeholder
