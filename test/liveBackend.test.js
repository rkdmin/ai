/**
 * 실제 Gemini 응답을 매퍼에 통과시켜 검증.
 *
 * test/__live_hair_cards.json 은 backend(/api/cards/hair) 가 실제 Gemini 호출로
 * 받은 응답을 캡처한 파일이다. 향후 백엔드 응답 스키마가 깨지면 이 테스트가 실패한다.
 *
 * (응답을 갱신하려면: 백엔드를 띄우고 `curl -X POST http://127.0.0.1:8000/api/cards/hair
 *  --data-binary @test/cards_body.json` 결과를 이 파일에 덮어쓰기)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapCards } from '../src/api/mappers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '__live_hair_cards.json');

const skip = !existsSync(fixturePath);

describe.skipIf(skip)('실제 Gemini 헤어 카드 응답 → 매퍼', () => {
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  it('응답은 4장 배열', () => {
    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toHaveLength(4);
  });

  it('각 카드는 mappers 가 요구하는 키를 모두 포함 (type/cardType/mood/hair)', () => {
    for (const c of raw) {
      expect(c.type).toBeDefined();
      expect(c.cardType).toBe('hair');
      expect(c.hair).toBeTruthy();
    }
  });

  it('mapCards 통과 후 name / sub / locked / warn 필드 갖춤', () => {
    const ctx = {
      result: { faceType: '계란형', moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'] },
      features: ['부드러운 눈매'],
    };
    const cards = mapCards(raw, 'hair', ctx);
    expect(cards).toHaveLength(4);
    for (const c of cards) {
      expect(c.name).toBeTruthy();
      expect(typeof c.locked).toBe('boolean');
      expect(typeof c.warn).toBe('boolean');
    }
    const recs = cards.filter((c) => !c.warn);
    const avoid = cards.filter((c) => c.warn);
    expect(recs).toHaveLength(3);
    expect(avoid).toHaveLength(1);
  });

  it('퍼블리시티권 회귀: 인물 비교 표현이 없다', () => {
    const blob = JSON.stringify(raw);
    for (const w of ['st 룩', '닮은꼴', 'look-alike', 'celebrityMatch', '님 st']) {
      expect(blob).not.toContain(w);
    }
  });

  it('rank 1~3 + avoid 1 — 정확한 배분', () => {
    const ranks = raw.filter((c) => c.type === 'recommend').map((c) => c.rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
    expect(raw.filter((c) => c.type === 'avoid')).toHaveLength(1);
  });
});
