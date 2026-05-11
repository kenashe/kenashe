const WPM = 220;

export function readingTime(text: string): { minutes: number; words: number } {
  const words = text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return { words, minutes: Math.max(1, Math.ceil(words / WPM)) };
}
