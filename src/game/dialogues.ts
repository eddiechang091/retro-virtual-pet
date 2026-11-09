// Retro Tamagotchi Situational Dialogues
import type { DialogueItem } from './types';

export const PET_DIALOGUES: DialogueItem[] = [
  {
    id: 'd1',
    situation: 'Curious Question',
    petSays: 'What is the big world outside this tiny LCD screen like?',
    options: [
      {
        text: 'It is vast and wonderful',
        response: 'Wow! Sounds super cool! Tell me more stories as I grow up!',
        moodDelta: 10,
        happinessDelta: 8,
        reactionAnimation: 'happy'
      },
      {
        text: 'It is big, but I love being right here',
        response: 'Hehe, I love being with you most of all too!',
        moodDelta: 15,
        happinessDelta: 12,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd2',
    situation: 'Nostalgic Thought',
    petSays: 'Did you also have a pocket pet like me when you were young?',
    options: [
      {
        text: 'Yes, it was my childhood treasure',
        response: 'No wonder your fingers feel so gentle and skilled! *wink*',
        moodDelta: 12,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      },
      {
        text: 'You are my very first digital cutie',
        response: 'What an honor! I promise to grow up healthy and strong!',
        moodDelta: 15,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd3',
    situation: 'Seeking Affection',
    petSays: 'I have been such a good pet today, do I get a reward hug?',
    options: [
      {
        text: 'Here comes a big gentle headpat!',
        response: 'Mm~ My head feels so warm and cozy, pure bliss!',
        moodDelta: 12,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      },
      {
        text: 'Let us go play a mini-game together!',
        response: 'Yay! I am definitely bringing home the highest score today!',
        moodDelta: 8,
        happinessDelta: 15,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd4',
    situation: 'Whimsical Dream',
    petSays: 'I had an awesome dream last night where I grew shiny dragon horns!',
    options: [
      {
        text: 'Maybe you will evolve into a dragon!',
        response: 'Really?! Then I will guard you from all bad monsters forever!',
        moodDelta: 15,
        happinessDelta: 12,
        reactionAnimation: 'happy'
      },
      {
        text: 'Whatever you become, I love you best',
        response: 'Hearing that makes flowers bloom in my little digital heart~',
        moodDelta: 20,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd5',
    situation: 'Sweet Tooth',
    petSays: 'Psst... can I please have an extra sweet strawberry candy tonight?',
    options: [
      {
        text: 'Too much sugar causes tummy aches',
        response: 'Aww, I crave it, but I will listen to you and stay healthy!',
        moodDelta: 5,
        happinessDelta: 2,
        reactionAnimation: 'eat'
      },
      {
        text: 'Just this once, a special treat!',
        response: 'Munch munch! So sweet! You are the best owner in the world!',
        moodDelta: 10,
        happinessDelta: 15,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd6',
    situation: 'Caring for You',
    petSays: 'Are you busy with work and study today? Did you drink enough water?',
    options: [
      {
        text: 'Seeing you makes all fatigue fly away',
        response: 'Bringing you happiness is my greatest mission in life!',
        moodDelta: 18,
        happinessDelta: 12,
        reactionAnimation: 'happy'
      },
      {
        text: 'A bit tired, nice chatting with you',
        response: 'Sit back and relax, let me do a silly wiggle dance for you!',
        moodDelta: 15,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd7',
    situation: 'Philosophical Query',
    petSays: 'What are the three physical buttons on this console meant for?',
    options: [
      {
        text: 'Select, Embrace, and Protect',
        response: 'What a romantic thought! I will cherish it forever!',
        moodDelta: 16,
        happinessDelta: 12,
        reactionAnimation: 'happy'
      },
      {
        text: 'Secret codes connecting our heartbeats',
        response: 'Beep beep! Heartbeat synchronized! Friendship at maximum!',
        moodDelta: 20,
        happinessDelta: 15,
        reactionAnimation: 'happy'
      }
    ]
  },
  {
    id: 'd8',
    situation: 'Secret Treasure',
    petSays: 'I saved my happiest moment inside the console memory! Guess what it is?',
    options: [
      {
        text: 'When I feed you tasty treats?',
        response: 'Half right! Also the moment you press the button to wake me up!',
        moodDelta: 14,
        happinessDelta: 10,
        reactionAnimation: 'happy'
      },
      {
        text: 'When we win a mini-game together?',
        response: 'Bingo! High-fiving with you is the best feeling ever!',
        moodDelta: 14,
        happinessDelta: 12,
        reactionAnimation: 'happy'
      }
    ]
  }
];
