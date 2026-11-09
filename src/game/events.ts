// Retro Tamagotchi Random Events
import type { RandomEvent } from './types';

export const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: 'e1',
    title: 'Shiny Mystery Coin',
    desc: 'Your pet uncovered a gleaming vintage pixel coin in the corner of the screen!',
    petSays: 'Look! I found a shiny ancient gold coin!',
    choiceA: {
      label: 'Save in Piggy Bank',
      resultText: 'Pet tucked the coin safely into its nest, beaming with pride and joy!',
      effect: (pet) => ({
        mood: Math.min(100, pet.mood + 15),
        discipline: Math.min(100, pet.discipline + 10)
      })
    },
    choiceB: {
      label: 'Trade for Snacks',
      resultText: 'Traded for a box of delicious biscuits! Your pet ate until full and happy!',
      effect: (pet) => ({
        hunger: Math.min(100, pet.hunger + 25),
        happiness: Math.min(100, pet.happiness + 20),
        weightGrams: pet.weightGrams + 2
      })
    }
  },
  {
    id: 'e2',
    title: 'Meteor Shower in Sky',
    desc: 'Brilliant pixel meteor trails streak across the dot-matrix LCD sky!',
    petSays: 'Close your eyes and make a wish upon the falling stars!',
    choiceA: {
      label: 'Wish for Health & Growth',
      resultText: 'Bathed in warm starlight, your pet restored energy and spirits completely!',
      effect: (pet) => ({
        energy: Math.min(100, pet.energy + 30),
        happiness: Math.min(100, pet.happiness + 25),
        mood: Math.min(100, pet.mood + 20)
      })
    },
    choiceB: {
      label: 'Wish for Endless Feasts',
      resultText: 'A wave of fullness washes over! Your pet does a joyful backflip!',
      effect: (pet) => ({
        hunger: Math.min(100, pet.hunger + 30),
        happiness: Math.min(100, pet.happiness + 15)
      })
    }
  },
  {
    id: 'e3',
    title: 'Wandering Merchant',
    desc: 'A travelling pixel peddler with a straw hat drops by with two magical wares.',
    petSays: 'The friendly merchant brought cool treasures! Which one should we pick?',
    choiceA: {
      label: 'Energy Vitality Elixir',
      resultText: 'After drinking the magic potion, all fatigue was washed away with vigor!',
      effect: (pet) => ({
        energy: 100,
        isSick: false,
        cleanliness: Math.min(100, pet.cleanliness + 20)
      })
    },
    choiceB: {
      label: 'Retro Game Cartridge',
      resultText: 'The fun new toy kept your pet fascinated! Happiness skyrocketed!',
      effect: (pet) => ({
        happiness: 100,
        mood: Math.min(100, pet.mood + 25)
      })
    }
  },
  {
    id: 'e4',
    title: 'Neighbor Pet Visit',
    desc: 'A cute digital pet from next door hops over and knocks politely on the screen.',
    petSays: 'Yay! A friend came by to play hopscotch with me!',
    choiceA: {
      label: 'Invite to Play Tag',
      resultText: 'Both pets chased each other across the screen, forming a strong bond!',
      effect: (pet) => ({
        happiness: Math.min(100, pet.happiness + 25),
        mood: Math.min(100, pet.mood + 20),
        energy: Math.max(0, pet.energy - 10)
      })
    },
    choiceB: {
      label: 'Share Yummy Treats',
      resultText: 'Sharing tasty snacks deepened their friendship into best buddies!',
      effect: (pet) => ({
        mood: Math.min(100, pet.mood + 30),
        happiness: Math.min(100, pet.happiness + 15)
      })
    }
  },
  {
    id: 'e5',
    title: 'Playful Ghost Prank',
    desc: 'A mischievous little pixel ghost suddenly floats into the room sticking its tongue out!',
    petSays: 'Eek! A tiny ghost is tickling me! What should I do?',
    choiceA: {
      label: 'Stand Firm & Brave',
      resultText: 'Encouraged by you, your pet stood up bravely! Discipline boosted!',
      effect: (pet) => ({
        discipline: Math.min(100, pet.discipline + 20),
        mood: Math.min(100, pet.mood + 15)
      })
    },
    choiceB: {
      label: 'High-Five the Ghost',
      resultText: 'The ghost left a trail of musical notes and drifted away happily!',
      effect: (pet) => ({
        happiness: Math.min(100, pet.happiness + 25),
        energy: Math.min(100, pet.energy + 10)
      })
    }
  }
];
