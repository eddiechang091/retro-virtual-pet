import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialPet,
  processPetTick,
  checkEvolution,
  savePet,
  loadSavedPet,
} from '../gameState';
import type { PetState } from '../types';

// sound.ts is imported by gameState.ts but gracefully no-ops in jsdom:
// AudioContext is undefined → initContext() skips creation → playTone returns early.

// ---------------------------------------------------------------------------
// createInitialPet
// ---------------------------------------------------------------------------
describe('createInitialPet', () => {
  it('creates an egg with the provided name', () => {
    const pet = createInitialPet('Buddy');
    expect(pet.name).toBe('Buddy');
  });

  it('defaults name to Bobo', () => {
    const pet = createInitialPet();
    expect(pet.name).toBe('Bobo');
  });

  it('starts in egg stage', () => {
    const pet = createInitialPet();
    expect(pet.stage).toBe('egg');
    expect(pet.species).toBe('egg');
  });

  it('starts alive with correct vital defaults', () => {
    const pet = createInitialPet();
    expect(pet.isDead).toBe(false);
    expect(pet.isSick).toBe(false);
    expect(pet.hunger).toBe(80);
    expect(pet.happiness).toBe(80);
    expect(pet.cleanliness).toBe(100);
    expect(pet.energy).toBe(90);
    expect(pet.mood).toBe(75);
    expect(pet.poopCount).toBe(0);
  });

  it('unlocks only egg species initially', () => {
    const pet = createInitialPet();
    expect(pet.unlockedSpecies).toEqual(['egg']);
  });
});

// ---------------------------------------------------------------------------
// processPetTick
// ---------------------------------------------------------------------------

const makeBasePet = (): PetState => ({
  name: 'Bobo',
  stage: 'child',
  species: 'chick',
  birthTimestamp: Date.now(),
  ageDays: 1,
  weightGrams: 10,
  hunger: 80,
  happiness: 80,
  cleanliness: 80,
  energy: 80,
  mood: 80,
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
  unlockedSpecies: ['egg', 'baby', 'chick'],
});

describe('processPetTick', () => {
  it('returns the exact same object when pet is dead', () => {
    const dead = { ...makeBasePet(), isDead: true };
    expect(processPetTick(dead)).toBe(dead);
  });

  it('returns the exact same object when pet is an egg', () => {
    const egg = { ...makeBasePet(), stage: 'egg' as const, species: 'egg' as const };
    expect(processPetTick(egg)).toBe(egg);
  });

  it('decreases hunger, energy and cleanliness when awake', () => {
    const pet = makeBasePet();
    const next = processPetTick(pet);
    expect(next.hunger).toBeLessThan(pet.hunger);
    expect(next.energy).toBeLessThan(pet.energy);
    expect(next.cleanliness).toBeLessThan(pet.cleanliness);
  });

  it('restores energy during sleep', () => {
    const sleeping = { ...makeBasePet(), isSleeping: true };
    const next = processPetTick(sleeping);
    expect(next.energy).toBeGreaterThan(sleeping.energy);
  });

  it('slowly drains hunger during sleep', () => {
    const sleeping = { ...makeBasePet(), isSleeping: true, hunger: 50 };
    const next = processPetTick(sleeping);
    expect(next.hunger).toBeLessThan(50);
  });

  it('never lets hunger or energy drop below 0', () => {
    const exhausted = { ...makeBasePet(), hunger: 0, energy: 0, cleanliness: 0 };
    const next = processPetTick(exhausted);
    expect(next.hunger).toBeGreaterThanOrEqual(0);
    expect(next.energy).toBeGreaterThanOrEqual(0);
  });

  it('kills pet on extreme neglect (hunger=0, energy=0, sick, careMistakes=8)', () => {
    const neglected: PetState = {
      ...makeBasePet(),
      hunger: 0,
      energy: 0,
      cleanliness: 0,
      isSick: true,
      careMistakes: 8,
    };
    const next = processPetTick(neglected);
    expect(next.isDead).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkEvolution
// ---------------------------------------------------------------------------

const makeEggPet = (): PetState => ({
  ...makeBasePet(),
  name: 'Bobo',
  stage: 'egg',
  species: 'egg',
  ageDays: 0,
  weightGrams: 5,
  hunger: 80,
  happiness: 80,
  cleanliness: 100,
  energy: 90,
  mood: 75,
  totalMeals: 3,
  totalGamesPlayed: 0,
  unlockedSpecies: ['egg'],
});

describe('checkEvolution', () => {
  it('does not evolve a dead pet', () => {
    const result = checkEvolution({ ...makeEggPet(), isDead: true });
    expect(result.evolved).toBe(false);
  });

  it('egg evolves to baby and adds baby to unlockedSpecies', () => {
    const result = checkEvolution(makeEggPet());
    expect(result.evolved).toBe(true);
    expect(result.newSpecies).toBe('baby');
    expect(result.newPet.stage).toBe('baby');
    expect(result.newPet.unlockedSpecies).toContain('baby');
  });

  it('baby with enough meals evolves to chick (child stage)', () => {
    const baby: PetState = {
      ...makeEggPet(),
      stage: 'baby',
      species: 'baby',
      totalMeals: 4,
      unlockedSpecies: ['egg', 'baby'],
    };
    const result = checkEvolution(baby);
    expect(result.evolved).toBe(true);
    expect(result.newSpecies).toBe('chick');
    expect(result.newPet.stage).toBe('child');
  });

  it('chick with enough age and games evolves to bunny', () => {
    const chick: PetState = {
      ...makeEggPet(),
      stage: 'child',
      species: 'chick',
      ageDays: 3,
      totalMeals: 8,
      totalGamesPlayed: 6,
      unlockedSpecies: ['egg', 'baby', 'chick'],
    };
    const result = checkEvolution(chick);
    expect(result.evolved).toBe(true);
    expect(result.newSpecies).toBe('bunny');
    expect(result.newPet.stage).toBe('teen');
  });

  it('bunny with good care (low mistakes, high mood) evolves to angel', () => {
    const bunny: PetState = {
      ...makeEggPet(),
      stage: 'teen',
      species: 'bunny',
      ageDays: 5,
      totalMeals: 12,
      totalGamesPlayed: 10,
      careMistakes: 0,
      mood: 80,
      unlockedSpecies: ['egg', 'baby', 'chick', 'bunny'],
    };
    const result = checkEvolution(bunny);
    expect(result.evolved).toBe(true);
    expect(result.newSpecies).toBe('angel');
    expect(result.newPet.stage).toBe('adult');
  });

  it('bunny with poor care evolves to dragon', () => {
    const bunny: PetState = {
      ...makeEggPet(),
      stage: 'teen',
      species: 'bunny',
      ageDays: 5,
      totalMeals: 12,
      totalGamesPlayed: 10,
      careMistakes: 5,
      mood: 40,
      unlockedSpecies: ['egg', 'baby', 'chick', 'bunny'],
    };
    const result = checkEvolution(bunny);
    expect(result.evolved).toBe(true);
    expect(result.newSpecies).toBe('dragon');
  });

  it('adult pets do not evolve further', () => {
    const angel: PetState = {
      ...makeEggPet(),
      stage: 'adult',
      species: 'angel',
      ageDays: 10,
      unlockedSpecies: ['egg', 'baby', 'chick', 'bunny', 'angel'],
    };
    expect(checkEvolution(angel).evolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// savePet / loadSavedPet
// ---------------------------------------------------------------------------

describe('savePet / loadSavedPet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a fresh egg pet when nothing is saved', () => {
    const pet = loadSavedPet();
    expect(pet.stage).toBe('egg');
    expect(pet.name).toBe('Bobo');
  });

  it('round-trips pet state through localStorage', () => {
    const original = createInitialPet('SaveTest');
    original.hunger = 42;
    original.happiness = 67;
    original.stage = 'child';
    original.species = 'chick';
    savePet(original);

    const loaded = loadSavedPet();
    expect(loaded.name).toBe('SaveTest');
    expect(loaded.hunger).toBe(42);
    expect(loaded.happiness).toBe(67);
    expect(loaded.stage).toBe('child');
  });

  it('applies no offline decay when last save was just now', () => {
    const pet = { ...makeBasePet(), hunger: 90, cleanliness: 90 };
    savePet(pet);
    const loaded = loadSavedPet();
    // Elapsed time ≈ 0 ms → no decay cycles
    expect(loaded.hunger).toBe(90);
    expect(loaded.cleanliness).toBe(90);
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('tamagotchi_save_v1', 'not-valid-json');
    const pet = loadSavedPet();
    expect(pet.stage).toBe('egg');
  });
});
