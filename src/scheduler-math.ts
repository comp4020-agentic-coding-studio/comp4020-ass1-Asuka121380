import type { EighthIndex } from "./rhythm-model";

export function secondsPerEighthNote(tempoBpm: number): number {
  const secondsPerQuarterNote = 60 / tempoBpm;
  return secondsPerQuarterNote / 2;
}

export function nextSlotIndex(index: EighthIndex): EighthIndex {
  return (((index + 1) % 8) as EighthIndex);
}

export function isBarStart(index: number): boolean {
  return index === 0;
}
