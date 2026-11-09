import type { CSSProperties, FC, ReactNode } from 'react';
import { Volume2, VolumeX, BookOpen, FastForward, RotateCcw } from 'lucide-react';
import { getShellTheme } from '../shellThemes';
import type { ShellThemeId } from '../shellThemes';
import { ShellColorSwitcher } from './ShellColorSwitcher';

interface HandheldCaseProps {
  children: ReactNode;
  onButtonA: () => void;
  onButtonB: () => void;
  onButtonC: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenEncyclopedia: () => void;
  onFastForward: () => void;
  onReset: () => void;
  petName: string;
  shellThemeId: ShellThemeId;
  onShellThemeChange: (id: ShellThemeId) => void;
}

export const HandheldCase: FC<HandheldCaseProps> = ({
  children,
  onButtonA,
  onButtonB,
  onButtonC,
  isMuted,
  onToggleMute,
  onOpenEncyclopedia,
  onFastForward,
  onReset,
  petName,
  shellThemeId,
  onShellThemeChange
}) => {
  const theme = getShellTheme(shellThemeId);

  const shellStyle = {
    background: theme.shellBackground,
    borderColor: theme.shellBorder,
    boxShadow: theme.shellShadow,
    backdropFilter: theme.translucent ? 'blur(7px) saturate(150%)' : undefined,
    WebkitBackdropFilter: theme.translucent ? 'blur(7px) saturate(150%)' : undefined,
    '--btn-shadow': theme.actionBtnShadow,
    '--sub-btn-shadow': theme.subBtnShadow
  } as unknown as CSSProperties;

  return (
    <div className="w-full max-w-[390px] sm:max-w-[500px] mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-center gap-3 select-none py-2 px-3">
      {/* Handheld Shell Outer Container */}
      <div
        className="relative w-full max-w-[390px] border-4 rounded-[52px] pt-4 pb-6 px-4 flex flex-col items-center overflow-hidden transition-colors duration-300"
        style={shellStyle}
      >
        {/* Translucent shell: inner circuit / backlight pattern */}
        {theme.translucent && (
          <div className="shell-inner-pattern" style={{ backgroundImage: theme.innerPattern }} />
        )}

        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Top Keychain Hole & Brand Label */}
          <div className="w-full flex items-center justify-between px-2 mb-2">
            {/* Keyring Loop Simulation */}
            <div
              className="w-5 h-5 rounded-full border-3 flex items-center justify-center shadow-inner"
              style={{ background: theme.keyringBackground, borderColor: theme.keyringBorder }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: theme.speakerDot }} />
            </div>

            <div
              className="text-[11px] tracking-widest font-black font-mono flex items-center gap-1"
              style={{ color: theme.primaryText }}
            >
              <span>●</span>
              <span>TAMAGOTCHI 1996</span>
              <span>●</span>
            </div>

            {/* Speaker grill dots */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: theme.speakerDot }}
                />
              ))}
            </div>
          </div>

          {/* Top Quick Utility Buttons (Auxiliary) */}
          <div className="w-full flex items-center justify-between px-2 mb-2.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full tamagotchi-sub-btn font-bold cursor-pointer"
              style={{ background: theme.subBtnBackground, color: theme.subBtnText }}
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-700" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Mute' : 'Sound'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenEncyclopedia}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full tamagotchi-sub-btn font-bold cursor-pointer"
              style={{ background: theme.subBtnBackground, color: theme.subBtnText }}
              title="Evolution Dex"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Dex</span>
            </button>

            <button
              type="button"
              onClick={onFastForward}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full tamagotchi-sub-btn font-bold cursor-pointer"
              style={{ background: theme.subBtnBackground, color: theme.subBtnText }}
              title="Fast Forward / Interact"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Speed</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full tamagotchi-sub-btn font-bold cursor-pointer"
              style={{ background: theme.subBtnBackground, color: theme.subBtnText }}
              title="Adopt New Pet"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-800" />
              <span>Reset</span>
            </button>
          </div>

          {/* Acrylic Screen Bezel (Recessed Frame) */}
          <div
            className="w-full border-3 rounded-3xl p-3 shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] flex flex-col items-center transition-colors duration-300"
            style={{ background: theme.bezelBackground, borderColor: theme.bezelBorder }}
          >
            {/* Bezel Top Label */}
            <div
              className="w-full flex justify-between items-center text-[9px] font-mono tracking-wider px-1 mb-1 font-bold"
              style={{ color: theme.bezelLabel }}
            >
              <span>GEN-1 PET</span>
              <span style={{ color: theme.bezelAccent }}>★ {petName} ★</span>
              <span>DOT MATRIX</span>
            </div>

            {/* LCD Screen Insert with Inner Shadow */}
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden lcd-bezel-shadow border-2 border-[#242926]/60">
              {children}
            </div>
          </div>

          {/* Bottom Three Physical Buttons (A, B, C) */}
          <div className="w-full mt-5 mb-2 flex items-center justify-around px-2">
            {/* Button A: Select / Left */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onButtonA}
                className="w-16 h-16 rounded-full border-3 tamagotchi-btn flex flex-col items-center justify-center cursor-pointer active:outline-none"
                style={{
                  background: theme.actionBtnBackground,
                  borderColor: theme.actionBtnBorder,
                  color: theme.actionBtnText
                }}
                title="Button A: Select / Switch [Key: A or Left Arrow]"
              >
                <span className="text-base font-black font-mono">A</span>
              </button>
              <span className="text-[11px] font-bold mt-2 font-mono" style={{ color: theme.primaryText }}>
                [SELECT]
              </span>
            </div>

            {/* Button B: Confirm / Middle */}
            <div className="flex flex-col items-center -translate-y-1">
              <button
                type="button"
                onClick={onButtonB}
                className="w-16 h-16 rounded-full border-3 tamagotchi-btn flex flex-col items-center justify-center cursor-pointer active:outline-none"
                style={{
                  background: theme.actionBtnBackground,
                  borderColor: theme.actionBtnBorder,
                  color: theme.actionBtnText
                }}
                title="Button B: Execute / Confirm [Key: B or Enter]"
              >
                <span className="text-base font-black font-mono">B</span>
              </button>
              <span className="text-[11px] font-bold mt-2 font-mono" style={{ color: theme.primaryText }}>
                [EXECUTE]
              </span>
            </div>

            {/* Button C: Cancel / Right */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onButtonC}
                className="w-16 h-16 rounded-full border-3 tamagotchi-btn flex flex-col items-center justify-center cursor-pointer active:outline-none"
                style={{
                  background: theme.actionBtnBackground,
                  borderColor: theme.actionBtnBorder,
                  color: theme.actionBtnText
                }}
                title="Button C: Cancel / Back [Key: C or Esc]"
              >
                <span className="text-base font-black font-mono">C</span>
              </button>
              <span className="text-[11px] font-bold mt-2 font-mono" style={{ color: theme.primaryText }}>
                [CANCEL]
              </span>
            </div>
          </div>

          {/* Operating Guide Instructions */}
          <div
            className="w-full text-center text-[10px] font-mono mt-1 opacity-80"
            style={{ color: theme.secondaryText }}
          >
            Keyboard controls: [A] Select | [B] Execute | [C] Cancel
          </div>
        </div>
      </div>

      {/* Shell Color Switcher (beside the case on desktop, below on mobile) */}
      <ShellColorSwitcher value={shellThemeId} onChange={onShellThemeChange} />
    </div>
  );
};
