import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  validatePhoto: vi.fn(),
  analyzeFace: vi.fn(),
}));

vi.mock('../src/api/ai', () => api);

import PhotoUpload, { PhotoPermissionDenied } from '../src/components/PhotoUpload';

const OK_RESULT = {
  ok: true,
  code: null,
  message: '얼굴이 확인됐어요.',
  checks: { imageDecoded: true, faceDetected: true, singleFace: true, faceLargeEnough: true },
  faceCount: 1,
};

async function choosePhoto(container) {
  const galleryInput = container.querySelectorAll('input[type="file"]')[1];
  const file = new File(['image'], 'face.jpg', { type: 'image/jpeg' });
  fireEvent.change(galleryInput, { target: { files: [file] } });
  await waitFor(() => expect(api.validatePhoto).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/jpeg;base64,/)));
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.validatePhoto.mockResolvedValue(OK_RESULT);
});

describe('PhotoUpload 사진 사전검사', () => {
  it('선택 즉시 검사 API만 호출하고 checks를 표시한 뒤 동의 시 업로드한다', async () => {
    const onUpload = vi.fn();
    const { container } = render(<PhotoUpload onUpload={onUpload} onBack={() => {}} />);

    const file = await choosePhoto(container);
    expect(api.analyzeFace).not.toHaveBeenCalled();
    expect(await screen.findByText('사진을 확인했어요')).toBeInTheDocument();
    expect(screen.getByText('얼굴이 확인됐어요')).toBeInTheDocument();
    expect(screen.getByText('한 명의 얼굴이 보여요')).toBeInTheDocument();
    expect(screen.getByText('얼굴 크기가 충분해요')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('분석 가능한');

    fireEvent.click(screen.getByRole('button', { name: '이 사진으로 분석하기' }));
    expect(screen.getByRole('alert')).toHaveTextContent('사진 분석 동의에 체크해 주세요.');
    expect(onUpload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '이 사진으로 분석하기' }));
    expect(onUpload).toHaveBeenCalledWith(file, expect.stringMatching(/^data:image\/jpeg;base64,/));
  });

  it.each([
    ['NO_FACE', '사진을 분석하기 어려워요', 'Face not detected'],
    ['MULTIPLE_FACES', '한 명의 얼굴만 선택해 주세요', 'Multiple faces'],
    ['FACE_TOO_SMALL', '얼굴이 더 크게 보이는 사진이 필요해요', 'Face too small'],
    ['INVALID_IMAGE', '사진 파일을 읽지 못했어요', 'Invalid image'],
  ])('%s 코드를 전용 화면으로 분기한다', async (code, title, placeholder) => {
    api.validatePhoto.mockResolvedValue({ ok: false, code, message: code, checks: {}, faceCount: 0 });
    const { container } = render(<PhotoUpload onUpload={() => {}} onBack={() => {}} />);

    await choosePhoto(container);

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(placeholder)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다른 사진 선택하기' })).toBeInTheDocument();
  });
});

describe('사진 권한 거절 화면', () => {
  it('네이티브는 설정 이동, 웹은 다시 선택 폴백을 표시한다', () => {
    const { rerender } = render(<PhotoPermissionDenied native onSettings={() => {}} onReselect={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: '설정에서 권한 허용하기' })).toBeInTheDocument();

    rerender(<PhotoPermissionDenied native={false} onSettings={() => {}} onReselect={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: '사진 다시 선택하기' })).toBeInTheDocument();
  });
});
