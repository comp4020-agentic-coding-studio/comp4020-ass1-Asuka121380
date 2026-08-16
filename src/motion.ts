// Injectable `matchMedia`, same pattern as title-screen.ts's injectable
// `createAudioContext`, since jsdom's `window.matchMedia` isn't implemented.
// `matches` is mutable here (unlike the real, readonly `MediaQueryList`) so
// tests can flip it to simulate a live OS-preference change; a real
// `MediaQueryList` is still structurally assignable to this type.
export interface MediaQueryListLike {
  matches: boolean;
  addEventListener: MediaQueryList["addEventListener"];
  removeEventListener: MediaQueryList["removeEventListener"];
}

export type MatchMedia = (query: string) => MediaQueryListLike;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const defaultMatchMedia: MatchMedia = (query) => window.matchMedia(query);

export function prefersReducedMotion(matchMedia: MatchMedia = defaultMatchMedia): boolean {
  return matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Returns an unsubscribe function. The annotation layer uses this so a
// mid-session OS-level preference change is honoured immediately, not just
// at the next page load.
export function watchReducedMotion(
  onChange: (reduced: boolean) => void,
  matchMedia: MatchMedia = defaultMatchMedia,
): () => void {
  const mediaQueryList = matchMedia(REDUCED_MOTION_QUERY);
  const listener = () => onChange(mediaQueryList.matches);
  mediaQueryList.addEventListener("change", listener);
  return () => mediaQueryList.removeEventListener("change", listener);
}
