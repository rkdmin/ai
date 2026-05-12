import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Login from '../src/components/Login';

describe('Login', () => {
  it('calls onBack from the header back button', () => {
    const onBack = vi.fn();
    render(<Login onBack={onBack} onNext={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('guest gate back button can leave the login prompt', () => {
    const onBack = vi.fn();
    render(<Login mode="guest_gate" onBack={onBack} onNext={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
