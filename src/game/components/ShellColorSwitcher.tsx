import type { FC } from 'react';
import { Check } from 'lucide-react';
import { SHELL_THEMES, getShellTheme } from '../shellThemes';
import type { ShellThemeId } from '../shellThemes';

interface ShellColorSwitcherProps {
  value: ShellThemeId;
  onChange: (id: ShellThemeId) => void;
}

export const ShellColorSwitcher: FC<ShellColorSwitcherProps> = ({ value, onChange }) => {
  const active = getShellTheme(value);

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-2 py-2 backdrop-blur-sm">
      <span className="text-[9px] font-mono tracking-[0.18em] text-gray-400">SHELL</span>

      <div className="flex flex-row sm:flex-col gap-2">
        {SHELL_THEMES.map(theme => {
          const isActive = theme.id === value;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              aria-pressed={isActive}
              aria-label={`Shell color ${theme.label}`}
              title={`Shell: ${theme.label}`}
              className={`relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-150 ${
                isActive ? 'scale-105 ring-2 ring-white/80' : 'ring-1 ring-white/25 hover:scale-105'
              }`}
              style={{
                background: theme.swatch,
                boxShadow: isActive
                  ? '0 0 0 1px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.45), inset 0 2px 3px rgba(255,255,255,0.55)'
                  : '0 3px 8px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.35)'
              }}
            >
              {isActive && <Check className="w-4 h-4" style={{ color: theme.checkColor }} strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      <span className="hidden sm:block max-w-[72px] text-center text-[9px] leading-tight font-mono text-gray-300">
        {active.label}
      </span>
    </div>
  );
};