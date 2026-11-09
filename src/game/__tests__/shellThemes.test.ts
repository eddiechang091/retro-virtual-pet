import { describe, it, expect, beforeEach } from 'vitest';
import {
  SHELL_THEMES,
  getShellTheme,
  loadShellTheme,
  saveShellTheme,
  DEFAULT_SHELL_THEME,
} from '../shellThemes';
import type { ShellThemeId } from '../shellThemes';

describe('SHELL_THEMES', () => {
  it('defines at least one theme', () => {
    expect(SHELL_THEMES.length).toBeGreaterThan(0);
  });

  it('every theme has required fields', () => {
    for (const theme of SHELL_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.label).toBeTruthy();
      expect(theme.swatch).toBeTruthy();
      expect(theme.shellBackground).toBeTruthy();
    }
  });
});

describe('getShellTheme', () => {
  it('returns the classic-white theme by id', () => {
    const theme = getShellTheme('classic-white');
    expect(theme.id).toBe('classic-white');
  });

  it('returns the retro-yellow theme by id', () => {
    const theme = getShellTheme('retro-yellow');
    expect(theme.id).toBe('retro-yellow');
  });

  it('returns the translucent-purple theme and marks it translucent', () => {
    const theme = getShellTheme('translucent-purple');
    expect(theme.id).toBe('translucent-purple');
    expect(theme.translucent).toBe(true);
  });

  it('falls back to the first theme for an unknown id', () => {
    const theme = getShellTheme('unknown-id' as ShellThemeId);
    expect(theme.id).toBe(SHELL_THEMES[0].id);
  });
});

describe('loadShellTheme / saveShellTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default theme when nothing is saved', () => {
    expect(loadShellTheme()).toBe(DEFAULT_SHELL_THEME);
  });

  it('round-trips retro-yellow through localStorage', () => {
    saveShellTheme('retro-yellow');
    expect(loadShellTheme()).toBe('retro-yellow');
  });

  it('round-trips translucent-purple through localStorage', () => {
    saveShellTheme('translucent-purple');
    expect(loadShellTheme()).toBe('translucent-purple');
  });

  it('falls back to default for an unrecognised saved value', () => {
    localStorage.setItem('tamagotchi_shell_theme_v1', 'garbage-theme');
    expect(loadShellTheme()).toBe(DEFAULT_SHELL_THEME);
  });
});
