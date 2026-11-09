// Shell color themes for the handheld case (persisted in local storage)

export type ShellThemeId = 'classic-white' | 'retro-yellow' | 'translucent-purple';

export interface ShellTheme {
  id: ShellThemeId;
  label: string;
  swatch: string;
  checkColor: string;

  shellBackground: string;
  shellBorder: string;
  shellShadow: string;

  primaryText: string;
  secondaryText: string;

  keyringBackground: string;
  keyringBorder: string;
  speakerDot: string;

  subBtnBackground: string;
  subBtnText: string;
  subBtnShadow: string;

  bezelBackground: string;
  bezelBorder: string;
  bezelLabel: string;
  bezelAccent: string;

  actionBtnBackground: string;
  actionBtnBorder: string;
  actionBtnShadow: string;
  actionBtnText: string;

  translucent: boolean;
  innerPattern?: string;
}

export const SHELL_THEMES: ShellTheme[] = [
  {
    id: 'classic-white',
    label: 'Classic White',
    swatch: 'linear-gradient(150deg, #FCFCF7 0%, #EFEFE6 55%, #DEDED2 100%)',
    checkColor: '#4A4A48',

    shellBackground: 'linear-gradient(160deg, #FAFAF5 0%, #EFEFE6 55%, #E2E2D6 100%)',
    shellBorder: '#4A4A48',
    shellShadow:
      '0 12px 32px rgba(0,0,0,0.38), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -5px 12px rgba(0,0,0,0.08)',

    primaryText: '#5B5B54',
    secondaryText: '#78786D',

    keyringBackground: '#EDEDE4',
    keyringBorder: '#4A4A48',
    speakerDot: 'rgba(74,74,72,0.45)',

    subBtnBackground: '#E6E6DC',
    subBtnText: '#40403C',
    subBtnShadow: '#B6B6A9',

    bezelBackground: '#525252',
    bezelBorder: '#333333',
    bezelLabel: '#D6D6D6',
    bezelAccent: '#F0C860',

    actionBtnBackground: '#B33939',
    actionBtnBorder: '#7A2424',
    actionBtnShadow: '#7A2424',
    actionBtnText: '#FFFFFF',

    translucent: false
  },
  {
    id: 'retro-yellow',
    label: 'Retro Yellow',
    swatch: 'linear-gradient(150deg, #FFE873 0%, #F5CE3E 55%, #DFB520 100%)',
    checkColor: '#5A4A12',

    shellBackground: 'linear-gradient(165deg, #FFE873 0%, #F5CE3E 55%, #E4B824 100%)',
    shellBorder: '#5A4A12',
    shellShadow:
      '0 12px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -5px 12px rgba(120,90,10,0.25)',

    primaryText: '#6B5310',
    secondaryText: '#816722',

    keyringBackground: '#EBD24B',
    keyringBorder: '#5A4A12',
    speakerDot: 'rgba(90,74,18,0.5)',

    subBtnBackground: '#E9C332',
    subBtnText: '#4A3B08',
    subBtnShadow: '#A88A18',

    bezelBackground: '#4E4A38',
    bezelBorder: '#2E2B1E',
    bezelLabel: '#DCD6BE',
    bezelAccent: '#FFD24A',

    actionBtnBackground: '#A82F2F',
    actionBtnBorder: '#721F1F',
    actionBtnShadow: '#721F1F',
    actionBtnText: '#FFF6F0',

    translucent: false
  },
  {
    id: 'translucent-purple',
    label: 'Translucent Purple',
    swatch: 'linear-gradient(150deg, rgba(206,166,255,0.95) 0%, rgba(150,96,220,0.85) 55%, rgba(96,52,168,0.95) 100%)',
    checkColor: '#FFFFFF',

    shellBackground:
      'linear-gradient(160deg, rgba(206,166,255,0.62) 0%, rgba(150,96,220,0.48) 45%, rgba(92,48,160,0.6) 100%)',
    shellBorder: 'rgba(58,30,92,0.9)',
    shellShadow:
      '0 14px 36px rgba(70,20,130,0.45), inset 0 2px 6px rgba(255,255,255,0.55), inset 0 -6px 14px rgba(28,10,52,0.35)',

    primaryText: '#F4EBFF',
    secondaryText: '#DCC9F7',

    keyringBackground: 'rgba(198,158,255,0.38)',
    keyringBorder: 'rgba(58,30,92,0.9)',
    speakerDot: 'rgba(255,255,255,0.42)',

    subBtnBackground: 'rgba(255,255,255,0.24)',
    subBtnText: '#F7F0FF',
    subBtnShadow: 'rgba(56,20,96,0.75)',

    bezelBackground: 'rgba(38,26,58,0.9)',
    bezelBorder: '#1C1230',
    bezelLabel: '#CDBAE8',
    bezelAccent: '#E7C7FF',

    actionBtnBackground: '#9A3FA8',
    actionBtnBorder: '#5E2268',
    actionBtnShadow: '#5E2268',
    actionBtnText: '#FFF5FF',

    translucent: true,
    innerPattern:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 11px), repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 11px), radial-gradient(circle at 28% 18%, rgba(255,255,255,0.5) 0%, transparent 55%), radial-gradient(circle at 78% 82%, rgba(120,60,200,0.55) 0%, transparent 60%)'
  }
];

export const DEFAULT_SHELL_THEME: ShellThemeId = 'classic-white';

const SHELL_STORAGE_KEY = 'tamagotchi_shell_theme_v1';

export function getShellTheme(id: ShellThemeId): ShellTheme {
  return SHELL_THEMES.find(theme => theme.id === id) ?? SHELL_THEMES[0];
}

export function loadShellTheme(): ShellThemeId {
  try {
    const raw = localStorage.getItem(SHELL_STORAGE_KEY);
    if (raw && SHELL_THEMES.some(theme => theme.id === raw)) {
      return raw as ShellThemeId;
    }
  } catch {
    // Storage unavailable: fall back to the default shell
  }
  return DEFAULT_SHELL_THEME;
}

export function saveShellTheme(id: ShellThemeId): void {
  try {
    localStorage.setItem(SHELL_STORAGE_KEY, id);
  } catch {
    // Storage unavailable: keep the in-memory selection only
  }
}