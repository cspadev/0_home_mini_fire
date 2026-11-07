// Fire-safety revive quiz. Plain TS, no React.

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

const POOL: QuizQuestion[] = [
  { q: "A frying pan of oil catches fire. What do you do?", options: ["Throw water on it", "Cover it with a fire blanket", "Blow on it"], answer: 1, why: "Water on burning oil explodes into a fireball. Smother it." },
  { q: "Which is safe on a burning computer or plug?", options: ["Water bucket", "CO₂ extinguisher", "Wet towel"], answer: 1, why: "CO₂ doesn't conduct electricity. Water does." },
  { q: "What should you do FIRST when you discover a fire?", options: ["Raise the alarm", "Film it", "Finish your work"], answer: 0, why: "Raising the alarm warns everyone and calls the firefighters." },
  { q: "Which fire is water good for?", options: ["Cooking oil", "Electrical", "Paper and wood"], answer: 2, why: "Water cools and soaks paper, wood and cloth fires." },
  { q: "The corridor is full of smoke. How do you move?", options: ["Stay low, under the smoke", "Stand tall and run", "Hold your breath and walk upright"], answer: 0, why: "Cleaner air is near the floor." },
  { q: "The fire is spreading fast and blocking the way. What now?", options: ["Keep fighting it", "Get out and close the door", "Hide under a desk"], answer: 1, why: "Your life matters more than the room. Leave early." },
  { q: "Your clothes catch fire. What do you do?", options: ["Run for help", "Stop, drop and roll", "Wave your arms"], answer: 1, why: "Running fans the flames. Rolling smothers them." },
  { q: "During an evacuation, should you use the lift?", options: ["Yes, it's faster", "Only if it's close", "No, always use the stairs"], answer: 2, why: "Lifts can stop or open onto a fire floor." },
  { q: "Before opening a door in a fire, you should…", options: ["Feel it with the back of your hand", "Kick it open", "Open it wide fast"], answer: 0, why: "A hot door means fire behind it — use another way." },
  { q: "Where do you go after leaving the building?", options: ["Back in for your bag", "The assembly point", "Home"], answer: 1, why: "Teachers count everyone at the assembly point." },
  { q: "What is the emergency number in Europe?", options: ["112", "911", "000"], answer: 0, why: "112 works across the whole EU." },
  { q: "Why does a fire blanket work?", options: ["It cools the fire with water", "It cuts off the oxygen", "It's made of metal"], answer: 1, why: "Fire needs oxygen, heat and fuel — remove one and it dies." },
];

export const QUIZ_LENGTH = 3;
export const QUIZ_PASS = 2;

/** Random questions with shuffled options; `rand` returns 0..1. */
export function makeQuiz(rand: () => number = Math.random, n = QUIZ_LENGTH): QuizQuestion[] {
  const pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, n).map((q) => {
    const idx = q.options.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    return { ...q, options: idx.map((i) => q.options[i]!), answer: idx.indexOf(q.answer) };
  });
}

export function quizPassed(correct: number): boolean {
  return correct >= QUIZ_PASS;
}
