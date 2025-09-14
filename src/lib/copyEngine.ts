export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface CopyEngineOptions {
  firstName?: string;
  gender?: Gender;
  competitionName?: string;
  clubName?: string;
  prizeAmount?: number;
}

// Gamified messages for different scenarios
export const getEntrySuccessMessage = (options: CopyEngineOptions): string => {
  const { firstName, gender, competitionName } = options;
  const name = firstName || 'Player';
  
  const messages = {
    male: [
      `🎯 ${name}, you're locked and loaded! Time to make history at ${competitionName}!`,
      `⚡ Game on, ${name}! Show them what you're made of at ${competitionName}!`,
      `🔥 ${name}, the stage is yours! Go claim your victory at ${competitionName}!`,
      `🎪 ${name}, you're officially in the game! Make ${competitionName} legendary!`,
    ],
    female: [
      `✨ ${name}, you're all set to shine at ${competitionName}! Go show them your magic!`,
      `🌟 Game time, ${name}! Time to dazzle everyone at ${competitionName}!`,
      `💎 ${name}, you're ready to sparkle! Make ${competitionName} unforgettable!`,
      `🎯 ${name}, you're locked in! Go create your moment at ${competitionName}!`,
    ],
    other: [
      `🚀 ${name}, you're all set for takeoff at ${competitionName}! Go make it epic!`,
      `⭐ ${name}, you're in the game! Time to shine at ${competitionName}!`,
      `🎯 Ready, ${name}! Go make your mark at ${competitionName}!`,
      `🌈 ${name}, you're locked in! Show everyone your brilliance at ${competitionName}!`,
    ],
    prefer_not_to_say: [
      `🎯 ${name}, you're all set! Time to make magic happen at ${competitionName}!`,
      `⚡ Game on, ${name}! Go show your skills at ${competitionName}!`,
      `🌟 ${name}, you're in! Time to shine at ${competitionName}!`,
      `🚀 ${name}, you're ready for action! Make ${competitionName} legendary!`,
    ],
  };
  
  const genderMessages = messages[gender || 'prefer_not_to_say'];
  return genderMessages[Math.floor(Math.random() * genderMessages.length)];
};

export const getWinClaimMessage = (options: CopyEngineOptions): string => {
  const { firstName, gender, prizeAmount } = options;
  const name = firstName || 'Champion';
  const prize = prizeAmount ? `£${prizeAmount}` : 'the prize';
  
  const messages = {
    male: [
      `🏆 ${name}, that was LEGENDARY! Time to claim your ${prize}!`,
      `⚡ BOOM! ${name}, you absolutely nailed it! Let's get you that ${prize}!`,
      `🎯 ${name}, you're a MACHINE! That ${prize} is calling your name!`,
      `🔥 ${name}, that was pure FIRE! Ready to collect your ${prize}?`,
    ],
    female: [
      `✨ ${name}, that was absolutely MAGICAL! Time to claim your ${prize}!`,
      `🌟 WOW! ${name}, you totally CRUSHED it! That ${prize} is yours!`,
      `💎 ${name}, that was BRILLIANT! Let's get you that well-deserved ${prize}!`,
      `🎪 ${name}, you were SPECTACULAR! Time to celebrate with your ${prize}!`,
    ],
    other: [
      `🚀 ${name}, that was OUT OF THIS WORLD! Time to claim your ${prize}!`,
      `⭐ AMAZING! ${name}, you absolutely ROCKED it! That ${prize} awaits!`,
      `🌈 ${name}, that was INCREDIBLE! Let's get you that ${prize}!`,
      `🎯 ${name}, you were PHENOMENAL! Ready to claim your ${prize}?`,
    ],
    prefer_not_to_say: [
      `🏆 ${name}, that was OUTSTANDING! Time to claim your ${prize}!`,
      `🎯 INCREDIBLE! ${name}, you totally ACED it! That ${prize} is yours!`,
      `⚡ ${name}, that was AMAZING! Let's get you that ${prize}!`,
      `🌟 ${name}, you were FANTASTIC! Ready to collect your ${prize}?`,
    ],
  };
  
  const genderMessages = messages[gender || 'prefer_not_to_say'];
  return genderMessages[Math.floor(Math.random() * genderMessages.length)];
};

export const getMissMessage = (options: CopyEngineOptions): string => {
  const { firstName, gender, competitionName } = options;
  const name = firstName || 'Player';
  
  const messages = {
    male: [
      `💪 ${name}, not this time, but you've got this! Every shot makes you stronger!`,
      `🎯 ${name}, that's golf! The next hole-in-one is waiting for you!`,
      `⚡ ${name}, champions are made of comebacks! Your moment is coming!`,
      `🔥 ${name}, close one! That precision will pay off big time!`,
    ],
    female: [
      `✨ ${name}, every great golfer has been there! Your moment will shine!`,
      `🌟 ${name}, that's all part of the journey! Keep that amazing spirit!`,
      `💎 ${name}, so close! Your talent will create magic soon!`,
      `🎪 ${name}, the best stories have plot twists! Yours is still being written!`,
    ],
    other: [
      `🚀 ${name}, that's how legends are forged! Keep reaching for the stars!`,
      `⭐ ${name}, every attempt brings you closer to greatness!`,
      `🌈 ${name}, that's golf! Your breakthrough moment is coming!`,
      `🎯 ${name}, champions practice, champions persist, champions win!`,
    ],
    prefer_not_to_say: [
      `🎯 ${name}, that's the beauty of golf! Every shot is a new opportunity!`,
      `💪 ${name}, close one! Your persistence will pay off!`,
      `⚡ ${name}, that's how you learn and grow! Keep going!`,
      `🌟 ${name}, every great golfer has been there! Your time will come!`,
    ],
  };
  
  const genderMessages = messages[gender || 'prefer_not_to_say'];
  return genderMessages[Math.floor(Math.random() * genderMessages.length)];
};

export const getFormGreeting = (options: CopyEngineOptions): string => {
  const { firstName, gender, competitionName } = options;
  
  if (!firstName) {
    return `Ready to make history at ${competitionName}? Let's get you signed up!`;
  }
  
  const messages = {
    male: [
      `Welcome back, ${firstName}! Ready to dominate ${competitionName}?`,
      `${firstName}, let's make this legendary at ${competitionName}!`,
      `Hey ${firstName}! Time to show your skills at ${competitionName}!`,
    ],
    female: [
      `Welcome back, ${firstName}! Ready to shine at ${competitionName}?`,
      `${firstName}, let's make magic happen at ${competitionName}!`,
      `Hey ${firstName}! Time to sparkle at ${competitionName}!`,
    ],
    other: [
      `Welcome back, ${firstName}! Ready to rock ${competitionName}?`,
      `${firstName}, let's make this epic at ${competitionName}!`,
      `Hey ${firstName}! Time to shine at ${competitionName}!`,
    ],
    prefer_not_to_say: [
      `Welcome back, ${firstName}! Ready to excel at ${competitionName}?`,
      `${firstName}, let's make this amazing at ${competitionName}!`,
      `Hey ${firstName}! Time to show your talent at ${competitionName}!`,
    ],
  };
  
  const genderMessages = messages[gender || 'prefer_not_to_say'];
  return genderMessages[Math.floor(Math.random() * genderMessages.length)];
};

export const getVerificationPrompt = (options: CopyEngineOptions): string => {
  const { firstName, gender } = options;
  const name = firstName || 'Champion';
  
  const messages = {
    male: [
      `${name}, time to make it official! We need to verify that incredible shot!`,
      `${name}, let's lock in that victory! Just need some quick verification!`,
      `${name}, almost there! Let's get you verified and celebrate!`,
    ],
    female: [
      `${name}, time to make it official! Let's verify that amazing achievement!`,
      `${name}, almost there! Just need to confirm that brilliant shot!`,
      `${name}, let's celebrate properly! Quick verification coming up!`,
    ],
    other: [
      `${name}, time to make it count! Let's verify that fantastic shot!`,
      `${name}, almost at the finish line! Quick verification needed!`,
      `${name}, let's make it official! Time to verify that success!`,
    ],
    prefer_not_to_say: [
      `${name}, time to make it official! Let's verify that great shot!`,
      `${name}, almost done! Just need to confirm your achievement!`,
      `${name}, let's celebrate! Quick verification process ahead!`,
    ],
  };
  
  const genderMessages = messages[gender || 'prefer_not_to_say'];
  return genderMessages[Math.floor(Math.random() * genderMessages.length)];
};