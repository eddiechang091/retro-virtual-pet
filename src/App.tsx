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
import { getLlmService, LlmUnavailableError } from './services/anna/llm';
import {
  generatePetReply,
  getDefaultSuggestions,
  loadChatHistory,
  saveChatHistory,
  appendChatExchange,
  MAX_CHAT_INPUT_CHARS
} from './services/anna/chat';
import type { ChatExchange } from './services/anna/chat';
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

  // AI chat (Anna LLM) — free-text conversation with the pet.
  // History persists in localStorage (tamagotchi_chat_v1), last 6 exchanges.
  const [chatHistory, setChatHistory] = useState<ChatExchange[]>(() => loadChatHistory());
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const chatHistoryRef = useRef(chatHistory);
  chatHistoryRef.current = chatHistory;

  // Handheld shell color theme (persisted between visits)
  const [shellThemeId, setShellThemeId] = useState<ShellThemeId>(() => loadShellTheme());

  // Ref to hold latest state for timers/listeners
  const petRef = useRef(pet);
  petRef.current = pet;

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

  // Trigger Dialogue (canned fallback — used outside the Anna host)
  const triggerDialogue = useCallback(() => {
    const randomItem = PET_DIALOGUES[Math.floor(Math.random() * PET_DIALOGUES.length)];
    setActiveDialogue(randomItem);
    setDialogueChoice(0);
    setScreenMode('dialogue');
    sound.blip();
    setTickerText(`Chatting with ${pet.name}...`);
  }, [pet.name]);

  // CHAT menu: free-text AI chat when Anna LLM is available, otherwise
  // the canned dialogue flow exactly as before. The LLM check is cached
  // by the Anna runtime service, so this stays cheap after the first call.
  const handleChatAction = useCallback(async () => {
    let llmAvailable = false;
    try {
      const llm = await getLlmService();
      llmAvailable = llm.available;
    } catch {
      llmAvailable = false;
    }
    if (llmAvailable) {
      setChatError(null);
      // Before the first AI reply, chips show static state-based
      // suggestions so the user can tap one to start the conversation.
      setChatSuggestions(
        getDefaultSuggestions(petRef.current, chatHistoryRef.current.map(e => e.user))
      );
      setScreenMode('ai_chat');
      sound.blip();
      setTickerText(`Chatting with ${pet.name} — type a message!`);
    } else {
      triggerDialogue();
    }
  }, [pet.name, triggerDialogue]);

  // Send one free-text message to the pet via Anna LLM. Called with the
  // typed input, or with a tapped suggestion chip — same path either way.
  const sendAiChat = useCallback(async (messageText?: string) => {
    const text = (messageText ?? chatInput).trim();
    if (!text || chatLoading) return;
    const userText = text.slice(0, MAX_CHAT_INPUT_CHARS);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);
    try {
      const { reply, suggestions } = await generatePetReply({
        pet: petRef.current,
        history: chatHistoryRef.current,
        userText
      });
      const nextHistory = appendChatExchange(chatHistoryRef.current, {
        user: userText,
        pet: reply,
        at: Date.now()
      });
      setChatHistory(nextHistory);
      saveChatHistory(nextHistory);
      setChatSuggestions(suggestions);
      setPet(p => ({
        ...p,
        mood: Math.min(100, p.mood + 8),
        happiness: Math.min(100, p.happiness + 6),
        totalDialogues: p.totalDialogues + 1
      }));
      setTickerText(`${petRef.current.name}: "${reply}"`);
      sound.happy();
    } catch (error) {
      setChatError(
        error instanceof LlmUnavailableError
          ? 'AI chat is taking a break. Your chat history is safe — try again later!'
          : 'Hmm, my thoughts got scrambled! Try again?'
      );
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading]);

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
    } else if (screenMode === 'ai_chat') {
      // A is a no-op while chatting — the input takes the keystrokes.
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
    } else if (screenMode === 'ai_chat') {
      // B sends the typed message when there is one; A is a no-op here.
      if (chatInput.trim()) {
        void sendAiChat();
      }
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
    chatInput,
    sendAiChat
  ]);

  // Button C: Cancel / Back / Right
  const handleButtonC = useCallback(() => {
    sound.btnC();
    if (screenMode !== 'main') {
      setScreenMode('main');
      setSelectedMenuIndex(null);
      setTickerText('Returned to main screen.');
    } else {
      setSelectedMenuIndex(null);
      setTickerText('Selection cancelled.');
    }
  }, [screenMode]);

  // Keyboard controls listener.
  // CRITICAL: when the user is typing in the chat input, the a/b/c/Enter
  // keys are keystrokes, not handheld buttons — only Enter (send) and
  // Escape (exit chat) keep a meaning there.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) {
        if (e.key === 'Enter' && screenMode === 'ai_chat') {
          e.preventDefault();
          void sendAiChat();
        } else if (e.key === 'Escape') {
          handleButtonC();
        }
        return;
      }
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
  }, [handleButtonA, handleButtonB, handleButtonC, screenMode, sendAiChat]);

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
          chatHistory={chatHistory}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSendChat={() => void sendAiChat()}
          chatSuggestions={chatSuggestions}
          onSuggestionClick={suggestion => void sendAiChat(suggestion)}
          chatLoading={chatLoading}
          chatError={chatError}
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
