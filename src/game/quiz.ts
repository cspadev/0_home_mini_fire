// Fire-safety revive quiz. Plain TS, no React. Question texts live in src/i18n.
import { QUIZ } from "./config";
import { t } from "@/i18n";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

/** Index of the correct option for each question in t.quiz.questions (same order in every language). */
export const QUIZ_ANSWERS = [1, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 1] as const;

const pool = (): QuizQuestion[] =>
  t.quiz.questions.map((q, i) => ({ ...q, answer: QUIZ_ANSWERS[i] ?? 0 }));

export const QUIZ_LENGTH = QUIZ.length;
export const QUIZ_PASS = QUIZ.pass;

/** Random questions with shuffled options; `rand` returns 0..1. */
export function makeQuiz(rand: () => number = Math.random, n = QUIZ_LENGTH): QuizQuestion[] {
  const shuffled = pool();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, n).map((q) => {
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
