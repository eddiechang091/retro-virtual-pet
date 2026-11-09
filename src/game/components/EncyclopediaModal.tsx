import type { FC } from 'react';
import type { PetSpecies } from '../types';
import { SPECIES_CATALOG } from '../types';
import { PET_SPECIES_MAP, EGG_SPRITES } from '../sprites';
import { PixelRenderer } from './PixelRenderer';

interface EncyclopediaModalProps {
  unlockedSpecies: PetSpecies[];
  onClose: () => void;
}

export const EncyclopediaModal: FC<EncyclopediaModalProps> = ({ unlockedSpecies, onClose }) => {
  const allSpecies: PetSpecies[] = ['egg', 'baby', 'chick', 'bunny', 'angel', 'dragon'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm bg-[#F2E3C6] border-4 border-[#404040] rounded-2xl p-4 shadow-2xl flex flex-col max-h-[85vh] text-[#242926]">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-[#242926]/30 pb-2 mb-3">
          <div className="flex items-center gap-1.5 font-bold text-base font-pixel">
            <span>📖</span>
            <span>Digital Pet Evolution Dex</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-[#B33939] text-white font-bold rounded-full active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* Species List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" data-scroll>
          {allSpecies.map(sp => {
            const isUnlocked = unlockedSpecies.includes(sp);
            const info = SPECIES_CATALOG[sp];
            const sprite =
              sp === 'egg'
                ? EGG_SPRITES[0]
                : PET_SPECIES_MAP[sp]?.idle[0] || EGG_SPRITES[0];

            return (
              <div
                key={sp}
                className={`p-2.5 border-2 rounded-xl flex items-center gap-3 ${
                  isUnlocked
                    ? 'border-[#242926] bg-[#8B956D]/20'
                    : 'border-dashed border-gray-400 bg-gray-200/50 opacity-60'
                }`}
              >
                {/* Pixel Avatar Box */}
                <div className="w-14 h-14 bg-[#8B956D] border-2 border-[#242926] rounded-lg flex items-center justify-center shrink-0">
                  {isUnlocked ? (
                    <PixelRenderer matrix={sprite} pixelSize={2.5} />
                  ) : (
                    <span className="text-xl font-bold font-mono">?</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">
                      {isUnlocked ? info.name : '??? (Undiscovered)'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#242926]/10 uppercase font-mono">
                      {info.stage}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-700 mt-1 leading-snug">
                    {isUnlocked ? info.desc : 'Unlock this form through dedicated daily care and attention.'}
                  </div>
                  {isUnlocked && (
                    <div className="text-[10px] text-gray-600 mt-1 flex gap-2">
                      <span>Favorite: {info.favFood}</span>
                      <span>Hobby: {info.hobby}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-3 pt-2 border-t border-[#242926]/20 text-[11px] text-center text-gray-600">
          Collected: {unlockedSpecies.length}/{allSpecies.length} Species Unlocked
        </div>
      </div>
    </div>
  );
};
