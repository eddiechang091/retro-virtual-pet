// Tamagotchi Core Pet State Management and Logic
import type { PetState, PetSpecies } from './types';
import { sound } from './sound';

const STORAGE_KEY = 'tamagotchi_save_v1';
const LAST_SAVE_KEY = 'tamagotchi_last_save_v1';

export function createInitialPet(name = 'Bobo'): PetState {
  return {
    name,
    stage: 'egg',
    species: 'egg',
    birthTimestamp: Date.now(),
    ageDays: 0,
    weightGrams: 5,
    hunger: 80,
    happiness: 80,
    cleanliness: 100,
    energy: 90,
    mood: 75,
    isSleeping: false,
    isSick: false,
    poopCount: 0,
    lightsOn: true,
    careMistakes: 0,
    discipline: 50,
    isDead: false,
    totalMeals: 0,
    totalGamesPlayed: 0,
    totalGamesWon: 0,
    totalDialogues: 0,
    unlockedSpecies: ['egg']
  };
}

export function loadSavedPet(): PetState {
  if (typeof window === 'undefined') return createInitialPet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialPet();
    const parsed: PetState = JSON.parse(raw);
    
    // Calculate elapsed time since last save (not since birth)
    const now = Date.now();
    const lastSave = parseInt(localStorage.getItem(LAST_SAVE_KEY) ?? '0', 10);
    const elapsedMs = lastSave > 0 ? now - lastSave : 0;
    const elapsedMinutes = Math.min(720, Math.floor(elapsedMs / 60000));
    
    // Apply gentle offline decay if not dead
    if (!parsed.isDead && parsed.stage !== 'egg' && elapsedMinutes > 5) {
      const decayCycles = Math.min(30, Math.floor(elapsedMinutes / 20));
      parsed.hunger = Math.max(0, parsed.hunger - decayCycles * 4);
      parsed.cleanliness = Math.max(0, parsed.cleanliness - decayCycles * 3);
      if (parsed.hunger < 20 || parsed.cleanliness < 20) {
        parsed.happiness = Math.max(0, parsed.happiness - decayCycles * 5);
        if (Math.random() < 0.3) parsed.isSick = true;
      }
      if (decayCycles >= 2 && parsed.poopCount < 4) {
        parsed.poopCount = Math.min(4, parsed.poopCount + Math.floor(decayCycles / 3));
      }
    }
    
    return parsed;
  } catch {
    return createInitialPet();
  }
}

export function savePet(pet: PetState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
  } catch {
    // quota exceeded or incognito
  }
}

// Check and trigger evolution
export function checkEvolution(pet: PetState): { evolved: boolean; newSpecies?: PetSpecies; newPet: PetState } {
  if (pet.isDead) return { evolved: false, newPet: pet };

  // 1. Egg -> Baby (After hatching or reaching age/interactions)
  if (pet.stage === 'egg') {
    const unlocked = Array.from(new Set([...pet.unlockedSpecies, 'baby' as PetSpecies]));
    sound.evolve();
    return {
      evolved: true,
      newSpecies: 'baby',
      newPet: {
        ...pet,
        stage: 'baby',
        species: 'baby',
        hunger: 80,
        happiness: 80,
        unlockedSpecies: unlocked
      }
    };
  }

  // 2. Baby -> Child (Chick)
  if (pet.stage === 'baby' && (pet.ageDays >= 1 || pet.totalMeals >= 4 || pet.totalGamesPlayed >= 3)) {
    const unlocked = Array.from(new Set([...pet.unlockedSpecies, 'chick' as PetSpecies]));
    sound.evolve();
    return {
      evolved: true,
      newSpecies: 'chick',
      newPet: {
        ...pet,
        stage: 'child',
        species: 'chick',
        weightGrams: pet.weightGrams + 5,
        unlockedSpecies: unlocked
      }
    };
  }

  // 3. Child (Chick) -> Teen (Bunny)
  if (pet.stage === 'child' && (pet.ageDays >= 3 || (pet.totalMeals >= 8 && pet.totalGamesPlayed >= 6))) {
    const unlocked = Array.from(new Set([...pet.unlockedSpecies, 'bunny' as PetSpecies]));
    sound.evolve();
    return {
      evolved: true,
      newSpecies: 'bunny',
      newPet: {
        ...pet,
        stage: 'teen',
        species: 'bunny',
        weightGrams: pet.weightGrams + 8,
        unlockedSpecies: unlocked
      }
    };
  }

  // 4. Teen (Bunny) -> Adult Branching (Angel vs Dragon)
  if (pet.stage === 'teen' && (pet.ageDays >= 5 || (pet.totalMeals >= 12 && pet.totalGamesPlayed >= 10))) {
    // Branching rule:
    // If high care (careMistakes <= 1 and mood >= 75) => Angel
    // Else (high games / battle spirit / tough care) => Dragon
    const targetSpecies: PetSpecies = (pet.careMistakes <= 1 && pet.mood >= 75) ? 'angel' : 'dragon';
    const unlocked = Array.from(new Set([...pet.unlockedSpecies, targetSpecies]));
    sound.evolve();
    return {
      evolved: true,
      newSpecies: targetSpecies,
      newPet: {
        ...pet,
        stage: 'adult',
        species: targetSpecies,
        weightGrams: pet.weightGrams + 12,
        unlockedSpecies: unlocked
      }
    };
  }

  return { evolved: false, newPet: pet };
}

// Routine natural decay tick (every 10s)
export function processPetTick(pet: PetState): PetState {
  if (pet.isDead || pet.stage === 'egg') return pet;

  let hunger = pet.hunger;
  let cleanliness = pet.cleanliness;
  let happiness = pet.happiness;
  let energy = pet.energy;
  let mood = pet.mood;
  let isSick = pet.isSick;
  let poopCount = pet.poopCount;
  let careMistakes = pet.careMistakes;
  let isDead: boolean = pet.isDead;

  if (pet.isSleeping) {
    // Regenerate energy during sleep
    energy = Math.min(100, energy + 4);
    mood = Math.min(100, mood + 1);
    hunger = Math.max(0, hunger - 0.5);
  } else {
    // Active decay
    hunger = Math.max(0, hunger - 1.5);
    energy = Math.max(0, energy - 1.0);
    cleanliness = Math.max(0, cleanliness - 1.0);
    
    // Boredom if happiness neglected
    if (hunger < 30 || cleanliness < 30) {
      happiness = Math.max(0, happiness - 2);
      mood = Math.max(0, mood - 1.5);
    } else {
      happiness = Math.max(0, happiness - 0.5);
    }

    // Poop chance when well-fed and clean
    if (Math.random() < 0.08 && poopCount < 4 && pet.hunger > 30) {
      poopCount = Math.min(4, poopCount + 1);
      cleanliness = Math.max(0, cleanliness - 20);
      sound.btnC();
    }
  }

  // Sickness check: poops left dirty for long, hunger 0, or cold
  if (!isSick) {
    if (poopCount >= 3 || cleanliness <= 10 || hunger <= 5) {
      if (Math.random() < 0.25) {
        isSick = true;
        careMistakes += 1;
        sound.sick();
      }
    }
  }

  // Severe neglect: both hunger and energy 0 for too long
  if (hunger <= 0 && energy <= 0 && isSick) {
    careMistakes += 1;
    if (careMistakes > 8) {
      isDead = true;
      sound.sad();
    }
  }

  return {
    ...pet,
    hunger,
    cleanliness,
    happiness,
    energy,
    mood,
    isSick,
    poopCount,
    careMistakes,
    isDead
  };
}
