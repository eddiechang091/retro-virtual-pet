import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import type { PetState, DialogueItem, RandomEvent } from './game/types';
import { SPECIES_CATALOG } from './game/types';
import {
  loadSavedPet,
  savePet,
  createInitialPet,
  processPetTick,
  checkEvolution
} from './game/gameState';
import { sound } from './game/sound';
import { PET_DIALOGUES } from './game/dialogues';
import { RANDOM_EVENTS } from './game/events';
import { HandheldCase } from './game/components/HandheldCase';
import { LcdScreen } from './game/components/LcdScreen';
import type { ScreenMode } from './game/components/LcdScreen';
import { EncyclopediaModal } from './game/components/EncyclopediaModal';
import { generatePetDialogue } from './services/platform/chat';
import { loadShellTheme, saveShellTheme } from './game/shellThemes';
import type { ShellThemeId } from './game/shellThemes';

const App: FC = () => {
  const [pet, setPet] = useState<PetState>(() => loadSavedPet());
  const [screenMode, setScreenMode] = useState<ScreenMode>('main');
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);
  const [statusPage, setStatusPage] = useState(0);
  const [tickerText, setTickerText] = useState('Virtual pet online! Take good care of it~');

  // Sub-screen choices
  const [foodChoice, setFoodChoice] = useState(0); // 0: Meal, 1: Snack
  const [activeDialogue, setActiveDialogue] = useState<DialogueItem | null>(null);
  const [dialogueChoice, setDialogueChoice] = useState(0);
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  const [eventChoice, setEventChoice] = useState(0);

  // Sound and Encyclopedia modal
  const [isMuted, setIsMuted] = useState(false);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);

  // LLM-generated dialogue (server-side proxy) — one-shot question + 2 options,
  // generated fresh on every CHAT open. No free text, no history.
  const [dialogueLoading, setDialogueLoading] = useState(false);
  // Guards late generatePetDialogue results: bumped whenever the user
  // leaves the dialogue screen (C/Esc) or resets, so a stale result
  // never pops a dialogue over another screen.
  const dialogueRequestRef = useRef(0);

  // Handheld shell color theme (persisted between visits)
  const [shellThemeId, setShellThemeId] = useState<ShellThemeId>(() => loadShellTheme());

  // Ref to hold latest state for timers/listeners
  const petRef = useRef(pet);
  petRef.current = pet;
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;

  // Auto-save pet on change
  useEffect(() => {
    savePet(pet);
  }, [pet]);

  // Persist shell color choice
  useEffect(() => {
    saveShellTheme(shellThemeId);
  }, [shellThemeId]);

  // Trigger Random Event
  const triggerRandomEvent = useCallback(() => {
    const randEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    setActiveEvent(randEvent);
    setEventChoice(0);
    setScreenMode('event');
    sound.blip();
    setTickerText(`⚡ Event: ${randEvent.title}`);
  }, []);

  // Execute Evolution check
  const verifyEvolution = useCallback((candidatePet: PetState) => {
    const result = checkEvolution(candidatePet);
    if (result.evolved) {
      setPet(result.newPet);
      setScreenMode('evolution');
      setTickerText(`✨ Evolution! Pet evolved into ${SPECIES_CATALOG[result.newSpecies || 'baby']?.name}!`);
      return true;
    }
    return false;
  }, []);

  // Trigger Dialogue (canned fallback — used when the LLM proxy is
  // unavailable or unconfigured)
  const triggerDialogue = useCallback(() => {
    const randomItem = PET_DIALOGUES[Math.floor(Math.random() * PET_DIALOGUES.length)];
    setActiveDialogue(randomItem);
    setDialogueChoice(0);
    setScreenMode('dialogue');
    sound.blip();
    setTickerText(`Chatting with ${pet.name}...`);
  }, [pet.name]);

  // CHAT menu: generate a fresh one-shot dialogue (one question, two
  // options) through the server-side LLM proxy and feed it into the
  // existing canned dialogue flow verbatim. No availability pre-check —
  // the proxy call itself fails fast (unconfigured proxy, no deployment,
  // offline) and any failure falls back to a canned dialogue exactly
  // as before.
  const handleChatAction = useCallback(async () => {
    const requestId = ++dialogueRequestRef.current;
    setActiveDialogue(null);
    setDialogueChoice(0);
    setDialogueLoading(true);
    setScreenMode('dialogue');
    sound.blip();
    setTickerText(`Chatting with ${petRef.current.name}...`);
    try {
      const generated = await generatePetDialogue({
        pet: petRef.current,
        activeEventTitle: activeEventRef.current?.title
      });
      // The user left (C/Esc) or reset while generating — ignore the
      // late result instead of popping a dialogue over another screen.
      if (requestId !== dialogueRequestRef.current) return;
      setDialogueLoading(false);
      setActiveDialogue({
        id: `llm-${Date.now()}`,
        situation: generated.situation,
        petSays: generated.question,
        options: generated.options.map(option => ({
          text: option.text,
          response: option.response,
          moodDelta: 10,
          happinessDelta: 8
        }))
      });
      setDialogueChoice(0);
    } catch {
      if (requestId !== dialogueRequestRef.current) return;
      setDialogueLoading(false);
      triggerDialogue();
    }
  }, [triggerDialogue]);

  // Natural game tick decay (every 10 seconds)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setPet(current => {
        const next = processPetTick(current);
        return next;
      });
    }, 10000);

    return () => clearInterval(tickInterval);
  }, []);

  // Periodic random event check (every ~90 seconds)
  useEffect(() => {
    const eventInterval = setInterval(() => {
      if (
        screenMode === 'main' &&
        !petRef.current.isDead &&
        !petRef.current.isSleeping &&
        petRef.current.stage !== 'egg'
      ) {
        if (Math.random() < 0.45) {
          triggerRandomEvent();
        }
      }
    }, 90000);

    return () => clearInterval(eventInterval);
  }, [screenMode, triggerRandomEvent]);

  // Handlers for menu actions
  const executeMenuAction = useCallback((index: number) => {
    sound.btnB();

    if (pet.isDead) {
      setTickerText('Pet has become a digital angel. Click Reset to adopt again.');
      return;
    }

    if (pet.stage === 'egg' && index !== 6) {
      setTickerText('The egg is incubating! Gently pet it to hatch!');
      return;
    }

    switch (index) {
      case 0: // FOOD
        if (pet.isSleeping) {
          setTickerText('Pet is sleeping peacefully, do not disturb its rest~');
          return;
        }
        setScreenMode('food_select');
        setFoodChoice(0);
        setTickerText('Select food to feed (Press A to toggle, B to confirm)');
        break;

      case 1: // PLAY
        if (pet.isSleeping) {
          setTickerText('Pet is fast asleep, wait until it wakes up to play~');
          return;
        }
        if (pet.isSick) {
          setTickerText('Pet is feeling sick and weak. Give medicine first!');
          return;
        }
        if (pet.energy < 15) {
          setTickerText('Pet is exhausted! Let it sleep to restore energy!');
          return;
        }
        sound.happy();
        setScreenMode('play_anim');
        setPet(p => ({
          ...p,
          happiness: Math.min(100, p.happiness + 20),
          mood: Math.min(100, p.mood + 15),
          energy: Math.max(0, p.energy - 15),
          totalGamesPlayed: p.totalGamesPlayed + 1,
          totalGamesWon: p.totalGamesWon + 1,
        }));
        setTickerText(`${pet.name} had a blast playing! Happiness up!`);
        setTimeout(() => setScreenMode('main'), 1500);
        break;

      case 2: // CLEAN
        if (pet.poopCount === 0 && pet.cleanliness >= 95) {
          setTickerText('The room is squeaky clean! No mess to clean up.');
          sound.happy();
        } else {
          sound.clean();
          setScreenMode('clean_anim');
          setPet(p => ({
            ...p,
            poopCount: 0,
            cleanliness: 100,
            happiness: Math.min(100, p.happiness + 10)
          }));
          setTickerText('Whoosh~ Clean and fresh! Feeling wonderful!');
          setTimeout(() => setScreenMode('main'), 1500);
        }
        break;

      case 3: // SLEEP
        sound.sleep();
        setPet(p => {
          const newLights = !p.lightsOn;
          const newSleeping = !newLights;
          return {
            ...p,
            lightsOn: newLights,
            isSleeping: newSleeping
          };
        });
        setTickerText(pet.lightsOn ? 'Lights out! Pet entered sleep mode~' : 'Lights on! A bright new day begins!');
        break;

      case 4: // HEAL
        if (!pet.isSick) {
          setTickerText('Pet is healthy and strong! No medicine needed.');
          sound.happy();
        } else {
          sound.heal();
          setScreenMode('heal_anim');
          setPet(p => ({
            ...p,
            isSick: false,
            happiness: Math.min(100, p.happiness + 20),
            mood: Math.min(100, p.mood + 15)
          }));
          setTickerText('Medicine taken! Sickness vanished, full of vitality!');
          setTimeout(() => setScreenMode('main'), 1600);
        }
        break;

      case 5: // CHAT
        void handleChatAction();
        break;

      case 6: // STATUS
        setScreenMode('status');
        setStatusPage(0);
        setTickerText('Check stats & growth data (Press A to page, C to return)');
        break;

      case 7: // ALERT / EVENT
        triggerRandomEvent();
        break;

      default:
        break;
    }
  }, [pet, handleChatAction, triggerRandomEvent]);

  // Button A: Select / Switch / Left
  const handleButtonA = useCallback(() => {
    sound.btnA();

    if (screenMode === 'main') {
      setSelectedMenuIndex(prev => {
        if (prev === null) return 0;
        return (prev + 1) % 8;
      });
    } else if (screenMode === 'food_select') {
      setFoodChoice(c => (c === 0 ? 1 : 0));
    } else if (screenMode === 'dialogue') {
      setDialogueChoice(c => (c === 0 ? 1 : 0));
    } else if (screenMode === 'event') {
      setEventChoice(c => (c === 0 ? 1 : 0));
    } else if (screenMode === 'status') {
      setStatusPage(p => (p + 1) % 3);
    }
  }, [screenMode]);

  // Button B: Confirm / Execute / Middle
  const handleButtonB = useCallback(() => {
    if (screenMode === 'main') {
      if (selectedMenuIndex !== null) {
        executeMenuAction(selectedMenuIndex);
      } else {
        // Direct tap on pet / Egg interaction
        sound.btnB();
        if (pet.stage === 'egg') {
          sound.blip();
          setTickerText('Gently petted the egg, warm movements detected inside!');
          const nextMeals = pet.totalMeals + 1;
          const updatedEgg: PetState = { ...pet, totalMeals: nextMeals };
          setPet(updatedEgg);
          if (nextMeals >= 3) {
            sound.evolve();
            setTimeout(() => verifyEvolution(updatedEgg), 400);
          }
        } else if (!pet.isSleeping && !pet.isSick) {
          sound.happy();
          setPet(p => ({
            ...p,
            happiness: Math.min(100, p.happiness + 3),
            mood: Math.min(100, p.mood + 4)
          }));
          setTickerText(`${pet.name} felt your warm love and bounced happily!`);
        }
      }
    } else if (screenMode === 'food_select') {
      sound.eat();
      const isMeal = foodChoice === 0;
      const goSick = !isMeal && Math.random() < 0.25;
      const newPet: PetState = {
        ...pet,
        hunger: Math.min(100, pet.hunger + (isMeal ? 30 : 5)),
        happiness: Math.min(100, pet.happiness + (isMeal ? 5 : 25)),
        weightGrams: pet.weightGrams + (isMeal ? 1 : 2),
        totalMeals: pet.totalMeals + 1,
        isSick: goSick || pet.isSick,
      };
      if (goSick) {
        sound.sick();
        setTickerText('Ate too many sweets! Pet developed a tummy ache!');
      } else {
        setTickerText(`Fed a delicious ${isMeal ? 'Rice Ball' : 'Sweet Cake'}! Yum yum!`);
      }
      setPet(newPet);
      setTimeout(() => verifyEvolution(newPet), 500);
      setScreenMode('main');
      setSelectedMenuIndex(null);
    } else if (screenMode === 'dialogue' && activeDialogue) {
      sound.btnB();
      const choice = activeDialogue.options[dialogueChoice];
      setPet(p => ({
        ...p,
        mood: Math.min(100, p.mood + choice.moodDelta),
        happiness: Math.min(100, p.happiness + choice.happinessDelta),
        totalDialogues: p.totalDialogues + 1
      }));
      setTickerText(`${pet.name}: "${choice.response}"`);
      sound.happy();
      setTimeout(() => {
        setScreenMode('main');
        setSelectedMenuIndex(null);
      }, 2000);
    } else if (screenMode === 'event' && activeEvent) {
      sound.btnB();
      const choice = eventChoice === 0 ? activeEvent.choiceA : activeEvent.choiceB;
      const patch = choice.effect(pet);
      setPet(p => ({ ...p, ...patch }));
      setTickerText(`Event Result: ${choice.resultText}`);
      sound.happy();
      setTimeout(() => {
        setScreenMode('main');
        setSelectedMenuIndex(null);
      }, 2200);
    } else if (screenMode === 'status') {
      setStatusPage(p => (p + 1) % 3);
    } else if (screenMode === 'evolution') {
      sound.btnB();
      setScreenMode('main');
      setSelectedMenuIndex(null);
      setTickerText(`${pet.name} is energized and ready for new adventures!`);
    }
  }, [
    screenMode,
    selectedMenuIndex,
    executeMenuAction,
    pet,
    foodChoice,
    activeDialogue,
    dialogueChoice,
    activeEvent,
    eventChoice,
    verifyEvolution,
  ]);

  // Button C: Cancel / Back / Right
  const handleButtonC = useCallback(() => {
    sound.btnC();
    // Leaving the dialogue screen while a dialogue is generating
    // cancels it: the late result is ignored (see dialogueRequestRef).
    if (screenMode === 'dialogue') {
      dialogueRequestRef.current++;
      setDialogueLoading(false);
    }
    if (screenMode !== 'main') {
      setScreenMode('main');
      setSelectedMenuIndex(null);
      setTickerText('Returned to main screen.');
    } else {
      setSelectedMenuIndex(null);
      setTickerText('Selection cancelled.');
    }
  }, [screenMode]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === '1') {
        handleButtonA();
      } else if (e.key === 'b' || e.key === 'B' || e.key === '2' || e.key === 'Enter') {
        handleButtonB();
      } else if (e.key === 'c' || e.key === 'C' || e.key === '3' || e.key === 'Escape') {
        handleButtonC();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonA, handleButtonB, handleButtonC]);

  // Fast forward growth & interaction test
  const handleFastForward = useCallback(() => {
    sound.btnB();
    const currentPet = petRef.current;
    const next: PetState = {
      ...currentPet,
      ageDays: currentPet.ageDays + 1,
      totalMeals: currentPet.totalMeals + 2,
      totalGamesPlayed: currentPet.totalGamesPlayed + 2,
      totalGamesWon: currentPet.totalGamesWon + 2,
      mood: Math.min(100, currentPet.mood + 10)
    };
    setPet(next);
    setTickerText(`✨ Time warp! Growth days reached ${next.ageDays} days!`);
    setTimeout(() => verifyEvolution(next), 400);
  }, [verifyEvolution]);

  // Reset / Re-adopt
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to adopt a new digital egg?')) {
      const newPet = createInitialPet('Bobo');
      setPet(newPet);
      setScreenMode('main');
      setSelectedMenuIndex(null);
      // Cancel any dialogue still generating for the old pet.
      dialogueRequestRef.current++;
      setDialogueLoading(false);
      sound.evolve();
      setTickerText('A brand new digital egg has arrived! Start your adventure~');
    }
  }, []);

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-[#293133] text-white p-2 overflow-y-auto">
      {/* Handheld Device Body */}
      <HandheldCase
        onButtonA={handleButtonA}
        onButtonB={handleButtonB}
        onButtonC={handleButtonC}
        isMuted={isMuted}
        onToggleMute={() => {
          const muted = sound.toggleMute();
          setIsMuted(muted);
        }}
        onOpenEncyclopedia={() => setShowEncyclopedia(true)}
        onFastForward={handleFastForward}
        onReset={handleReset}
        petName={pet.name}
        shellThemeId={shellThemeId}
        onShellThemeChange={id => {
          sound.btnA();
          setShellThemeId(id);
        }}
      >
        <LcdScreen
          pet={pet}
          screenMode={screenMode}
          selectedMenuIndex={selectedMenuIndex}
          statusPage={statusPage}
          activeDialogue={activeDialogue}
          dialogueChoice={dialogueChoice}
          activeEvent={activeEvent}
          eventChoice={eventChoice}
          foodChoice={foodChoice}
          onSelectAction={executeMenuAction}
          tickerText={tickerText}
          dialogueLoading={dialogueLoading}
        />
      </HandheldCase>

      {/* Encyclopedia Modal */}
      {showEncyclopedia && (
        <EncyclopediaModal
          unlockedSpecies={pet.unlockedSpecies}
          onClose={() => setShowEncyclopedia(false)}
        />
      )}
    </div>
  );
};

export default App;
