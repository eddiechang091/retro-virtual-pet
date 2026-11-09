import { useState, useEffect } from 'react';
import type { FC } from 'react';
import type { PetState, DialogueItem, RandomEvent } from '../types';
import { SPECIES_CATALOG } from '../types';
import { MAX_CHAT_INPUT_CHARS } from '../../services/anna/chat';
import type { ChatExchange } from '../../services/anna/chat';
import { ICONS, SPRITE_ITEMS, EGG_SPRITES, PET_SPECIES_MAP } from '../sprites';
import { PixelRenderer } from './PixelRenderer';

export type ScreenMode =
  | 'main'
  | 'food_select'
  | 'play_anim'
  | 'dialogue'
  | 'ai_chat'
  | 'event'
  | 'status'
  | 'evolution'
  | 'clean_anim'
  | 'heal_anim'
  | 'dead';

interface LcdScreenProps {
  pet: PetState;
  screenMode: ScreenMode;
  selectedMenuIndex: number | null;
  statusPage: number;
  activeDialogue: DialogueItem | null;
  dialogueChoice: number;
  activeEvent: RandomEvent | null;
  eventChoice: number;
  foodChoice: number;
  onSelectAction: (index: number) => void;
  tickerText: string;
  chatHistory?: ChatExchange[];
  chatInput?: string;
  onChatInputChange?: (value: string) => void;
  onSendChat?: () => void;
  chatLoading?: boolean;
  chatError?: string | null;
}

export const LcdScreen: FC<LcdScreenProps> = ({
  pet,
  screenMode,
  selectedMenuIndex,
  statusPage,
  activeDialogue,
  dialogueChoice,
  activeEvent,
  eventChoice,
  foodChoice,
  onSelectAction,
  tickerText,
  chatHistory = [],
  chatInput = '',
  onChatInputChange,
  onSendChat,
  chatLoading = false,
  chatError = null
}) => {
  // 500ms hard frame step for retro 2fps animation
  const [frameTick, setFrameTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameTick(t => (t + 1) % 2);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Determine current pet sprite
  const getPetSprite = () => {
    if (pet.isDead) {
      return PET_SPECIES_MAP.baby.dead || SPRITE_ITEMS.SKULL;
    }

    if (pet.stage === 'egg') {
      return EGG_SPRITES[frameTick];
    }

    const speciesKey = pet.species in PET_SPECIES_MAP ? pet.species : 'baby';
    const set = PET_SPECIES_MAP[speciesKey] || PET_SPECIES_MAP.baby;

    if (pet.isSleeping || !pet.lightsOn) {
      return set.sleep[frameTick];
    }
    if (screenMode === 'heal_anim') {
      return set.sick[frameTick];
    }
    if (pet.isSick) {
      return set.sick[frameTick];
    }
    if (screenMode === 'clean_anim' || screenMode === 'play_anim') {
      return set.happy[frameTick];
    }
    if (screenMode === 'food_select' || tickerText.includes('Eating') || tickerText.includes('Fed')) {
      return set.eat[frameTick];
    }
    if (pet.happiness > 70 && pet.mood > 70) {
      return set.happy[frameTick];
    }

    return set.idle[frameTick];
  };

  const topIcons = [
    { id: 0, key: 'FOOD', label: 'FEED' },
    { id: 1, key: 'PLAY', label: 'PLAY' },
    { id: 2, key: 'CLEAN', label: 'CLEAN' },
    { id: 3, key: 'SLEEP', label: 'SLEEP' },
  ];

  const bottomIcons = [
    { id: 4, key: 'HEAL', label: 'HEAL' },
    { id: 5, key: 'CHAT', label: 'CHAT' },
    { id: 6, key: 'STATUS', label: 'STATUS' },
    { id: 7, key: 'ALERT', label: 'EVENT' },
  ];

  return (
    <div className="relative w-full h-full bg-[#8B956D] text-[#242926] font-mono flex flex-col justify-between p-1.5 lcd-grid-pattern overflow-hidden select-none">
      {/* 1. Top Icons Bar (4 Icons) */}
      <div className="w-full flex justify-between items-center px-1 border-b border-[#242926]/30 pb-0.5">
        {topIcons.map(icon => {
          const isSelected = selectedMenuIndex === icon.id;
          const flashInvert = isSelected && frameTick === 1;

          return (
            <button
              key={icon.id}
              type="button"
              onClick={() => onSelectAction(icon.id)}
              className={`p-0.5 rounded transition-none cursor-pointer flex flex-col items-center ${
                isSelected
                  ? flashInvert
                    ? 'bg-[#242926] text-[#8B956D]'
                    : 'bg-[#242926]/20'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title={icon.label}
            >
              <PixelRenderer
                matrix={ICONS[icon.key]}
                pixelSize={2}
                darkColor={isSelected && flashInvert ? '#8B956D' : '#242926'}
              />
            </button>
          );
        })}
      </div>

      {/* 2. Center Screen Body depending on Screen Mode */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-0 py-1">
        {/* Sub-view: Food Choice Mode */}
        {screenMode === 'food_select' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-1">
            <div className="text-[11px] font-bold mb-1">=== SELECT FOOD ===</div>
            <div className="flex gap-4 my-2">
              <div
                className={`p-1.5 border-2 ${
                  foodChoice === 0 ? 'border-[#242926] bg-[#242926]/15 font-bold' : 'border-transparent'
                } rounded flex flex-col items-center`}
              >
                <PixelRenderer matrix={SPRITE_ITEMS.MEAL} pixelSize={3} />
                <span className="text-[10px] mt-1">🍙 Rice Ball</span>
                <span className="text-[9px] opacity-75">Hunger +30  Wt +1</span>
              </div>
              <div
                className={`p-1.5 border-2 ${
                  foodChoice === 1 ? 'border-[#242926] bg-[#242926]/15 font-bold' : 'border-transparent'
                } rounded flex flex-col items-center`}
              >
                <PixelRenderer matrix={SPRITE_ITEMS.SNACK} pixelSize={3} />
                <span className="text-[10px] mt-1">🍰 Sweet Cake</span>
                <span className="text-[9px] opacity-75">Happy +25  Wt +2</span>
              </div>
            </div>
            <div className="text-[10px] opacity-80">[A] Select | [B] Feed | [C] Cancel</div>
          </div>
        )}

        {/* Sub-view: Play animation */}
        {screenMode === 'play_anim' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-xs font-bold mb-2">🎉 Having so much fun!</div>
            <div className="flex items-center gap-3">
              <span className="text-xl animate-bounce">⭐</span>
              <PixelRenderer matrix={getPetSprite()} pixelSize={4} />
              <span className="text-xl animate-bounce">⭐</span>
            </div>
          </div>
        )}

        {/* Sub-view: Dialogue Mode */}
        {screenMode === 'dialogue' && activeDialogue && (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="border border-[#242926] bg-[#838d66] p-1.5 rounded text-[11px] leading-tight">
              <div className="text-[9px] font-bold text-[#242926]/70 mb-0.5">
                💬 {pet.name} [{activeDialogue.situation}]:
              </div>
              <div>&ldquo;{activeDialogue.petSays}&rdquo;</div>
            </div>

            <div className="space-y-1 my-1">
              {activeDialogue.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 text-[10px] rounded border ${
                    dialogueChoice === idx
                      ? 'border-[#242926] bg-[#242926] text-[#8B956D] font-bold'
                      : 'border-[#242926]/40 bg-transparent'
                  }`}
                >
                  {dialogueChoice === idx ? '▶ ' : '  '}
                  {idx === 0 ? '[A] ' : '[B] '}
                  {opt.text}
                </div>
              ))}
            </div>

            <div className="text-[9px] opacity-75 text-center">[A/B] Choose | [B] Send | [C] Exit</div>
          </div>
        )}

        {/* Sub-view: AI Chat Mode (Anna LLM) */}
        {screenMode === 'ai_chat' && (
          <div className="w-full h-full flex flex-col justify-between p-1 min-h-0">
            <div className="text-[11px] font-bold text-center border-b border-[#242926]/40 pb-0.5">
              💬 CHAT WITH {pet.name.toUpperCase()}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto my-1 space-y-1 px-0.5">
              {chatHistory.length === 0 && !chatLoading && (
                <div className="text-[10px] opacity-75 text-center py-2">
                  Say hi to {pet.name}! Ask about its day, its favourite food, or anything at all.
                </div>
              )}
              {chatHistory.map((exchange, idx) => (
                <div key={`${exchange.at}-${idx}`} className="space-y-0.5">
                  <div className="text-[10px] text-right">
                    <span className="font-bold">YOU: </span>
                    {exchange.user}
                  </div>
                  <div className="border border-[#242926] bg-[#838d66] p-1 rounded text-[11px] leading-tight">
                    <span className="font-bold">{pet.name}: </span>
                    &ldquo;{exchange.pet}&rdquo;
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="text-[10px] opacity-75 animate-pulse">{pet.name} is thinking…</div>
              )}
              {chatError && (
                <div className="text-[10px] font-bold text-red-900 border border-red-900/50 rounded p-1">
                  {chatError}
                </div>
              )}
            </div>

            <div className="flex gap-1 items-center">
              <input
                type="text"
                value={chatInput}
                autoFocus
                maxLength={MAX_CHAT_INPUT_CHARS}
                placeholder={`Say hi to ${pet.name}...`}
                onChange={e => onChatInputChange?.(e.target.value)}
                className="flex-1 min-w-0 bg-[#838d66] border border-[#242926] rounded px-1.5 py-1 text-[11px] font-mono text-[#242926] placeholder-[#242926]/50 outline-none select-text"
              />
              <button
                type="button"
                onClick={onSendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="shrink-0 bg-[#242926] text-[#8B956D] text-[11px] font-bold px-2 py-1 rounded disabled:opacity-40 cursor-pointer"
              >
                SEND
              </button>
            </div>

            <div className="text-[9px] opacity-75 text-center mt-0.5">
              [B/Enter] Send | [C/Esc] Exit · {chatInput.length}/{MAX_CHAT_INPUT_CHARS}
            </div>
          </div>
        )}

        {/* Sub-view: Random Event Mode */}
        {screenMode === 'event' && activeEvent && (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="border-2 border-[#242926] bg-[#838d66] p-1.5 rounded text-[10px] leading-tight">
              <div className="font-bold flex items-center justify-between border-b border-[#242926]/40 pb-0.5 mb-1">
                <span>⚡ Event: {activeEvent.title}</span>
              </div>
              <div className="text-[9px] opacity-85">{activeEvent.desc}</div>
              <div className="mt-1 font-semibold">&ldquo;{activeEvent.petSays}&rdquo;</div>
            </div>

            <div className="space-y-1 my-1">
              <div
                className={`px-2 py-1 text-[10px] rounded border ${
                  eventChoice === 0
                    ? 'border-[#242926] bg-[#242926] text-[#8B956D] font-bold'
                    : 'border-[#242926]/40'
                }`}
              >
                {eventChoice === 0 ? '▶ ' : '  '}1. {activeEvent.choiceA.label}
              </div>
              <div
                className={`px-2 py-1 text-[10px] rounded border ${
                  eventChoice === 1
                    ? 'border-[#242926] bg-[#242926] text-[#8B956D] font-bold'
                    : 'border-[#242926]/40'
                }`}
              >
                {eventChoice === 1 ? '▶ ' : '  '}2. {activeEvent.choiceB.label}
              </div>
            </div>

            <div className="text-[9px] opacity-75 text-center">[A] Select | [B] Confirm</div>
          </div>
        )}

        {/* Sub-view: Status Mode */}
        {screenMode === 'status' && (
          <div className="w-full h-full flex flex-col justify-between p-1 text-[11px]">
            <div className="flex justify-between items-center border-b border-[#242926] pb-0.5 font-bold">
              <span>★ STATS ({statusPage + 1}/3)</span>
              <span className="text-[9px] bg-[#242926] text-[#8B956D] px-1 rounded">
                {SPECIES_CATALOG[pet.species]?.name || pet.name}
              </span>
            </div>

            {statusPage === 0 && (
              <div className="space-y-1 my-1 px-1 text-[10px]">
                <div className="flex justify-between items-center">
                  <span>Hunger:</span>
                  <span className="font-bold">{pet.hunger}/100</span>
                  <div className="flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i}>{i * 25 < pet.hunger ? '🖤' : '🤍'}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Happy:</span>
                  <span className="font-bold">{pet.happiness}/100</span>
                  <div className="flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i}>{i * 25 < pet.happiness ? '🖤' : '🤍'}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Clean:</span>
                  <span className="font-bold">{pet.cleanliness}/100</span>
                  <div className="flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i}>{i * 25 < pet.cleanliness ? '🖤' : '🤍'}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Energy:</span>
                  <span className="font-bold">{pet.energy}/100</span>
                  <div className="flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i}>{i * 25 < pet.energy ? '🖤' : '🤍'}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {statusPage === 1 && (
              <div className="space-y-1 my-1 px-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span className="font-bold">{pet.ageDays} d (Growing)</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight:</span>
                  <span className="font-bold">{pet.weightGrams} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Friendship:</span>
                  <span className="font-bold">{pet.mood} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Discipline:</span>
                  <span className="font-bold">{pet.discipline} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Stage:</span>
                  <span className="font-bold uppercase">{pet.stage}</span>
                </div>
              </div>
            )}

            {statusPage === 2 && (
              <div className="space-y-1 my-1 px-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Meals Fed:</span>
                  <span className="font-bold">{pet.totalMeals}</span>
                </div>
                <div className="flex justify-between">
                  <span>Game Win Rate:</span>
                  <span className="font-bold">
                    {pet.totalGamesWon}/{pet.totalGamesPlayed} (
                    {pet.totalGamesPlayed > 0
                      ? Math.round((pet.totalGamesWon / pet.totalGamesPlayed) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dialogues:</span>
                  <span className="font-bold">{pet.totalDialogues}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mistakes:</span>
                  <span className="font-bold">{pet.careMistakes}</span>
                </div>
              </div>
            )}

            <div className="text-[9px] opacity-80 text-center">[A/B] Page | [C] Back</div>
          </div>
        )}

        {/* Sub-view: Evolution celebration */}
        {screenMode === 'evolution' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold animate-pulse mb-1">✨✨ CONGRATS EVOLUTION! ✨✨</div>
            <div className="my-2 p-2 border-2 border-dashed border-[#242926] rounded">
              <PixelRenderer matrix={getPetSprite()} pixelSize={4} />
            </div>
            <div className="text-[11px] font-bold">New Form: {SPECIES_CATALOG[pet.species]?.name}</div>
            <div className="text-[9px] opacity-75 mt-0.5">{SPECIES_CATALOG[pet.species]?.desc}</div>
            <div className="text-[9px] mt-2 opacity-80">Press [B] to keep caring!</div>
          </div>
        )}

        {/* Sub-view: Clean animation */}
        {screenMode === 'clean_anim' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-xs font-bold mb-2">🚿 Cleaning... Whoosh~</div>
            <div className="flex items-center gap-3">
              <span className="text-xl animate-spin">🫧</span>
              <PixelRenderer matrix={getPetSprite()} pixelSize={4} />
              <span className="text-xl animate-bounce">💧</span>
            </div>
          </div>
        )}

        {/* Sub-view: Heal animation */}
        {screenMode === 'heal_anim' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-xs font-bold mb-2">💊 Giving Medicine... Recovering!</div>
            <div className="flex items-center gap-3">
              <PixelRenderer matrix={SPRITE_ITEMS.PILL} pixelSize={3} />
              <PixelRenderer matrix={getPetSprite()} pixelSize={4} />
              <span className="text-xl">✨</span>
            </div>
          </div>
        )}

        {/* Normal Main Pet Wandering Mode */}
        {screenMode === 'main' && (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Lights off / Sleeping overlay */}
            {!pet.lightsOn && (
              <div className="absolute inset-0 bg-[#242926]/75 flex flex-col items-center justify-center text-[#8B956D] z-10">
                <span className="text-xl">🌙</span>
                <span className="text-[11px] font-bold mt-1">Lights Off, Sleeping Soundly...</span>
                <span className="text-[9px] opacity-70">Zzz...</span>
              </div>
            )}

            {/* Poops on ground (0 - 4) */}
            {pet.poopCount > 0 && (
              <div className="absolute right-2 bottom-1 flex gap-1 z-0">
                {Array.from({ length: pet.poopCount }).map((_, idx) => (
                  <PixelRenderer
                    key={idx}
                    matrix={SPRITE_ITEMS.POOP}
                    pixelSize={2}
                    className="animate-bounce"
                  />
                ))}
              </div>
            )}

            {/* Sick Skull icon */}
            {pet.isSick && (
              <div className="absolute left-2 top-1 animate-pulse z-0 flex items-center gap-1">
                <PixelRenderer matrix={SPRITE_ITEMS.SKULL} pixelSize={2} />
                <span className="text-[9px] font-bold text-red-950">Sick!</span>
              </div>
            )}

            {/* Sleeping Zzz Floating */}
            {pet.isSleeping && pet.lightsOn && (
              <div className="absolute right-4 top-1 animate-bounce z-0">
                <PixelRenderer matrix={SPRITE_ITEMS.ZZZ} pixelSize={2} />
              </div>
            )}

            {/* Happy Heart Floating */}
            {pet.happiness >= 80 && !pet.isSick && !pet.isSleeping && (
              <div className="absolute right-3 top-1 animate-pulse z-0">
                <PixelRenderer matrix={SPRITE_ITEMS.HEART} pixelSize={2} />
              </div>
            )}

            {/* Central Animated Pet */}
            <div
              className={`transform transition-transform cursor-pointer ${
                frameTick === 0 ? 'translate-y-0' : '-translate-y-1'
              }`}
              title="Click or tap to pet"
            >
              <PixelRenderer matrix={getPetSprite()} pixelSize={4} />
            </div>

            {/* Pet Name Tag below */}
            <div className="text-[9px] font-bold mt-1 opacity-75">
              {pet.stage === 'egg' ? 'Incubating (Press B to pet)' : `${pet.name} · ${SPECIES_CATALOG[pet.species]?.name}`}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Icons Bar (4 Icons) */}
      <div className="w-full flex justify-between items-center px-1 border-t border-[#242926]/30 pt-0.5">
        {bottomIcons.map(icon => {
          const isSelected = selectedMenuIndex === icon.id;
          const flashInvert = isSelected && frameTick === 1;

          return (
            <button
              key={icon.id}
              type="button"
              onClick={() => onSelectAction(icon.id)}
              className={`p-0.5 rounded transition-none cursor-pointer flex flex-col items-center ${
                isSelected
                  ? flashInvert
                    ? 'bg-[#242926] text-[#8B956D]'
                    : 'bg-[#242926]/20'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title={icon.label}
            >
              <PixelRenderer
                matrix={ICONS[icon.key]}
                pixelSize={2}
                darkColor={isSelected && flashInvert ? '#8B956D' : '#242926'}
              />
            </button>
          );
        })}
      </div>

      {/* 4. Bottom 2-Line Text Ticker / Information Banner */}
      <div className="w-full bg-[#838d66] border border-[#242926]/40 rounded px-1.5 py-0.5 mt-1 min-h-[1.75rem] flex items-center justify-between text-[10px] leading-tight">
        <span className="truncate flex-1 font-bold">{tickerText}</span>
        {pet.isSick && <span className="text-[10px] font-bold text-red-900 ml-1 shrink-0 animate-pulse">⚠️Heal Pet</span>}
      </div>
    </div>
  );
};
