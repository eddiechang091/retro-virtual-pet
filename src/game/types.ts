// Game Types and Interfaces for Tamagotchi Pocket Pet

export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';

export type PetSpecies = 'egg' | 'baby' | 'chick' | 'bunny' | 'angel' | 'dragon';

export interface PetSpeciesInfo {
  id: PetSpecies;
  name: string;
  stage: PetStage;
  desc: string;
  favFood: string;
  hobby: string;
}

export const SPECIES_CATALOG: Record<PetSpecies, PetSpeciesInfo> = {
  egg: {
    id: 'egg',
    name: 'Digi-Egg',
    stage: 'egg',
    desc: 'A speckled digital egg gently rocking back and forth, holding a new life inside.',
    favFood: 'None',
    hobby: 'Incubating'
  },
  baby: {
    id: 'baby',
    name: 'Baby Bobo',
    stage: 'baby',
    desc: 'A newly-hatched blob creature blinking its big curious eyes with an endless appetite.',
    favFood: 'Warm Milk / Banana',
    hobby: 'Bouncing'
  },
  chick: {
    id: 'chick',
    name: 'Pip Chick',
    stage: 'child',
    desc: 'An energetic little chick with tufts of feathers, always pecking around curiously.',
    favFood: 'Corn Kernels',
    hobby: 'Hide and Seek'
  },
  bunny: {
    id: 'bunny',
    name: 'Flap Bunny',
    stage: 'teen',
    desc: 'A playful creature with long floppy ears that can flutter to glide briefly in the air.',
    favFood: 'Crunchy Carrot',
    hobby: 'Somersaults'
  },
  angel: {
    id: 'angel',
    name: 'Angel Bloop',
    stage: 'adult',
    desc: 'A gentle divine form blessed with a sparkling halo and wings, bringing good fortune.',
    favFood: 'Angel Cookie',
    hobby: 'Starlight Blessing'
  },
  dragon: {
    id: 'dragon',
    name: 'Cyber Dragon',
    stage: 'adult',
    desc: 'A brave and fierce form boasting majestic dragon horns and a sleek mech tail.',
    favFood: 'Prime Steak',
    hobby: 'Fireball Tricks'
  }
};

export interface PetState {
  name: string;
  stage: PetStage;
  species: PetSpecies;
  birthTimestamp: number;
  ageDays: number;
  weightGrams: number;
  
  // Vital Stats (0 - 100)
  hunger: number;         // Hunger level
  happiness: number;      // Happiness level
  cleanliness: number;    // Cleanliness level
  energy: number;         // Energy level
  mood: number;           // Friendship / Mood level

  // Conditions
  isSleeping: boolean;
  isSick: boolean;
  poopCount: number;      // 0 - 4 poops
  lightsOn: boolean;      // Lamp state
  careMistakes: number;   // Care mistakes (for branch evolution)
  discipline: number;     // Discipline stat 0-100
  isDead: boolean;

  // History & stats
  totalMeals: number;
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalDialogues: number;
  unlockedSpecies: PetSpecies[];
}

export type MenuAction = 'food' | 'play' | 'clean' | 'sleep' | 'heal' | 'chat' | 'status' | 'event';

export interface DialogueOption {
  text: string;
  response: string;
  moodDelta: number;
  happinessDelta: number;
  reactionAnimation?: 'happy' | 'eat' | 'sick';
}

export interface DialogueItem {
  id: string;
  situation: string; // Context description
  petSays: string;   // Question or speech bubble from pet
  options: DialogueOption[];
}

export interface RandomEvent {
  id: string;
  title: string;
  desc: string;
  petSays: string;
  choiceA: {
    label: string;
    resultText: string;
    effect: (pet: PetState) => Partial<PetState>;
  };
  choiceB: {
    label: string;
    resultText: string;
    effect: (pet: PetState) => Partial<PetState>;
  };
}
