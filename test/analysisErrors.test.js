import { describe, expect, it } from 'vitest';
import { classifyAnalysisError } from '../src/utils/analysisErrors';

describe('analysis error code routing', () => {
  it.each(['INVALID_IMAGE', 'NO_FACE', 'MULTIPLE_FACES', 'FACE_TOO_SMALL', 'UNSUPPORTED_PHOTO'])('%s는 사진 오류로 분기한다', (code) => {
    expect(classifyAnalysisError({ code, status: 503, message: 'unavailable' })).toBe('face');
  });

  it.each(['RATE_LIMITED', 'AI_UNAVAILABLE', 'AI_ERROR'])('%s는 서비스 오류로 분기한다', (code) => {
    expect(classifyAnalysisError({ code, status: 400, message: 'photo' })).toBe('network');
  });

  it('코드가 없을 때만 기존 status와 문자열 방식으로 폴백한다', () => {
    expect(classifyAnalysisError({ status: 503, message: '사진 오류처럼 보이는 문구' })).toBe('network');
    expect(classifyAnalysisError(new Error('Network timeout'))).toBe('network');
    expect(classifyAnalysisError(new Error('다른 사진을 선택해 주세요.'))).toBe('face');
  });
});
