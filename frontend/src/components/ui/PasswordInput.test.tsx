import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../locales';
import ar from '../../locales/ar.json';
import { PasswordInput } from './PasswordInput';

const auth = ar.auth as Record<string, string>;

describe('PasswordInput', () => {
  beforeAll(() => i18n.changeLanguage('ar'));

  it('renders hidden by default with a show-password toggle', () => {
    render(<PasswordInput defaultValue="secret" />);

    const input = screen.getByDisplayValue('secret');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: auth.showPassword });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals the password on click and hides it again', () => {
    render(<PasswordInput defaultValue="secret" />);

    const input = screen.getByDisplayValue('secret');
    const toggle = screen.getByRole('button', { name: auth.showPassword });

    fireEvent.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('secret');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAccessibleName(auth.hidePassword);

    fireEvent.click(toggle);

    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAccessibleName(auth.showPassword);
  });

  it('forwards standard input props and keeps the eye on the logical end', () => {
    const { container } = render(
      <PasswordInput
        id="pwd"
        name="pass"
        required
        autoComplete="current-password"
      />,
    );

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('id', 'pwd');
    expect(input).toHaveAttribute('name', 'pass');
    expect(input).toHaveAttribute('required', '');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(container.querySelector('.pe-11')).toBeTruthy();
  });
});