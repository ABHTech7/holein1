// Personalized greeting utility for player journey
// Rotates through fun, encouraging messages using the player's first name

const GREETINGS = [
  "{first_name}, are you ready to become a legend?",
  "One shot, one chance — make it count, {first_name}!",
  "Legends start here, {first_name}.⛳",
  "Game face on, {first_name}? Time to make history.",
  "This is your £10k swing, {first_name} 💸",
  "Step up to the tee, {first_name} — greatness awaits.",
  "{first_name}, today could be the day your name goes on the board.",
  "Eyes on the prize, {first_name} — let's see the magic.",
  "One swing away from glory, {first_name}.",
  "{first_name}, your moment is here. Don't blink."
];

/**
 * Get a random personalized greeting for the user
 * @param firstName - The user's first name
 * @returns A personalized greeting message
 */
export const getRandomGreeting = (firstName?: string): string => {
  if (!firstName) {
    return "Ready to make history? Your moment awaits.";
  }

  const randomIndex = Math.floor(Math.random() * GREETINGS.length);
  const greeting = GREETINGS[randomIndex];
  
  return greeting.replace(/\{first_name\}/g, firstName);
};

/**
 * Get a different greeting from the last one shown (for variation)
 * @param firstName - The user's first name
 * @param lastGreetingIndex - The index of the last greeting shown
 * @returns A different personalized greeting message
 */
export const getVariedGreeting = (firstName?: string, lastGreetingIndex?: number): string => {
  if (!firstName) {
    return "Ready to make history? Your moment awaits.";
  }

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * GREETINGS.length);
  } while (randomIndex === lastGreetingIndex && GREETINGS.length > 1);

  const greeting = GREETINGS[randomIndex];
  return greeting.replace(/\{first_name\}/g, firstName);
};

/**
 * Get all available greetings (for testing/preview purposes)
 * @param firstName - The user's first name
 * @returns Array of all personalized greetings
 */
export const getAllGreetings = (firstName?: string): string[] => {
  if (!firstName) {
    return ["Ready to make history? Your moment awaits."];
  }

  return GREETINGS.map(greeting => greeting.replace(/\{first_name\}/g, firstName));
};