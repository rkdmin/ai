import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PhotoUpload from '../src/components/PhotoUpload';

describe('PhotoUpload Figma 상태 전환', () => {
  it('가이드에서 사진 확인 상태로 전환하고 동의 후 업로드한다', async () => {
    const onUpload = vi.fn();
    const { container } = render(<PhotoUpload onUpload={onUpload} onBack={() => {}} />);

    expect(screen.getByRole('heading', { name: /정확한 분석을 위해.*이렇게 촬영해주세요/ })).toBeInTheDocument();
    const galleryInput = container.querySelectorAll('input[type="file"]')[1];
    const file = new File(['image'], 'face.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('이 사진으로 분석할까요?')).toBeInTheDocument());
    expect(screen.getByText('얼굴이 정면을 보고 있나요')).toBeInTheDocument();
    expect(screen.getByText('얼굴 전체 윤곽이 보이나요')).toBeInTheDocument();
    expect(screen.getByText('강한 필터·역광이 없나요')).toBeInTheDocument();
    expect(screen.queryByText('얼굴이 확인됐어요')).toBeNull();
    expect(screen.queryByText('분석 가능한 사진이에요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '이 사진으로 분석하기' }));
    expect(screen.getByRole('alert')).toHaveTextContent('사진 분석 동의에 체크해 주세요.');
    expect(onUpload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '이 사진으로 분석하기' }));
    expect(onUpload).toHaveBeenCalledWith(file, expect.stringMatching(/^data:image\/jpeg;base64,/));
  });
});
