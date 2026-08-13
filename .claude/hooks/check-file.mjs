#!/usr/bin/env node
/**
 * PostToolUse hook — 파일 저장 직후 검사.
 *
 * 1) 인코딩 사고 차단: BOM / CRLF / 깨진 글자(mojibake).
 *    이 저장소는 한글과 `·`(U+00B7) 를 코드·테스트에 직접 쓴다. CP949 로 저장되면 `·` 가 `쨌` 로
 *    바뀌어 UI 만 깨지고 테스트는 통과하는 사고가 난다 (2026-05 실제 발생).
 * 2) 퍼블리시티권 금지어 차단: 연예인 비교 관련 식별자.
 *    산문 규칙만으로는 강제되지 않으므로 도구 계층에서 막는다.
 *    (Explore/Plan 서브에이전트는 CLAUDE.md 를 읽지 않지만 이 hook 은 그대로 적용된다.)
 *
 * exit 0 = 통과, exit 2 = 차단 + stderr 를 Claude 에게 전달.
 */
import { readFileSync } from 'node:fs';

/** 검사 대상 확장자 — .gitattributes 의 텍스트 목록과 맞춘다. */
const TEXT_EXT = /\.(jsx?|tsx?|css|html|json|md|py|sql|ya?ml|mjs)$/i;

/**
 * 금지 식별자.
 *
 * 주의: 이 단어들은 "정책을 집행하는" 코드에도 정상적으로 등장한다 —
 * Gemini 에게 쓰지 말라고 지시하는 프롬프트, 부재를 검사하는 가드 테스트.
 * 그런 파일은 check-file:allow-policy-terms 마커로 면제한다 (아래 참조).
 * 마커 없이 걸리면 실제로 인물 비교 기능을 구현하려는 것으로 본다.
 */
const BANNED_IDENTIFIERS = [
  /celebrity[_-]?(match|name|ref|look)/i,
  /\blook[_-]?alike\b/i,
  /닮은꼴/,
];

/** 코드에만 금지어를 적용한다. docs/ 와 .claude/ 는 "금지 규칙 자체"를 서술하므로 제외. */
const BANNED_SCOPE = /(^|[\\/])(src|backend|test|tools)[\\/]/;

/**
 * UTF-8 문자열이 CP949/Latin-1 로 잘못 해석됐을 때 나타나는 대표 글자들.
 * 새 사고 패턴을 만나면 여기에 추가한다.
 */
const MOJIBAKE = [
  '�', // replacement char — 디코딩 실패의 확정 신호
  '쨌', // `·` (U+00B7) 가 CP949 로 깨진 형태 — 2026-05 사고
  'â€', // UTF-8 punctuation 이 Latin-1 으로 깨진 형태
  'Ã¬', 'Ã­', 'Ã«', 'ì†', 'ìŠ', // 한글이 Latin-1 으로 깨진 형태
];

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const raw = readStdin();
if (!raw.trim()) process.exit(0);

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0); // 입력을 못 읽으면 조용히 통과 — hook 이 작업을 막아선 안 된다
}

const filePath = payload?.tool_input?.file_path;
if (!filePath || !TEXT_EXT.test(filePath)) process.exit(0);

let content;
try {
  content = readFileSync(filePath, 'utf8');
} catch {
  process.exit(0); // 삭제됐거나 읽을 수 없으면 통과
}

/**
 * 예외 마커 — 금지 대상을 "데이터로" 담아야 하는 파일이 있다.
 *
 *   check-file:allow-encoding-sample
 *     깨진 글자를 예시로 인용하는 파일 (인코딩 규칙을 설명하는 문서, 이 hook 자신).
 *
 *   check-file:allow-policy-terms
 *     금지어를 "쓰지 말라"고 지시하거나 부재를 검사하는 파일.
 *     즉 정책을 집행하는 코드다 — Gemini 프롬프트의 금지 지시문, 가드 테스트.
 *
 * 파일 전체를 경로로 무조건 면제하지 않고 마커를 요구하는 이유는, 진짜 위반이
 * 조용히 통과하는 걸 막고 예외를 grep 으로 감사할 수 있게 하려는 것이다.
 * 마커를 새로 붙일 때는 왜 필요한지 같은 줄에 적는다.
 */
const marker = (name) => ['check-file', name].join(':');

const isEncodingFixture =
  /[\\/]\.claude[\\/]hooks[\\/]/.test(filePath) ||
  content.includes(marker('allow-encoding-sample'));

const isPolicyFixture = content.includes(marker('allow-policy-terms'));

const problems = [];

// --- 1) 인코딩 ---
if (content.charCodeAt(0) === 0xfeff) {
  problems.push(
    'BOM 이 붙어 있습니다. UTF-8 (BOM 없음) 으로 다시 저장하세요.',
  );
}

if (content.includes('\r\n')) {
  problems.push(
    'CRLF 줄끝이 섞여 있습니다. LF 로 저장하세요 (.gitattributes 가 LF 를 강제합니다).',
  );
}

for (const bad of isEncodingFixture ? [] : MOJIBAKE) {
  if (!content.includes(bad)) continue;
  const line = content.slice(0, content.indexOf(bad)).split('\n').length;
  problems.push(
    `${line}번째 줄 부근에 깨진 글자 "${bad}" 가 있습니다. ` +
      '잘못된 코드페이지(CP949 등)로 저장된 것입니다. ' +
      'UTF-8 로 다시 쓰세요 — PowerShell 이라면 -Encoding utf8 을 명시합니다. ' +
      '`·` 는 U+00B7 이어야 합니다.',
  );
}

// --- 2) 퍼블리시티권 금지어 ---
if (BANNED_SCOPE.test(filePath) && !isPolicyFixture) {
  for (const pattern of BANNED_IDENTIFIERS) {
    const hit = content.match(pattern);
    if (!hit) continue;
    const line = content.slice(0, hit.index).split('\n').length;
    problems.push(
      `${line}번째 줄에 금지 식별자 "${hit[0]}" 가 있습니다. ` +
        '연예인 비교·닮은꼴 기능은 퍼블리시티권 침해 리스크로 전면 금지입니다 ' +
        '(판례: 2013가합509239). moodArchetype 8개 키워드로 대체하세요.',
    );
  }
}

if (problems.length === 0) process.exit(0);

console.error(`[check-file] ${filePath}\n- ${problems.join('\n- ')}`);
process.exit(2);
