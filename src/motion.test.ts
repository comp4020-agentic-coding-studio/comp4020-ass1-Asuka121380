import { describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, watchReducedMotion, type MediaQueryListLike } from "./motion";

function fakeMediaQueryList(matches: boolean): MediaQueryListLike {
  return {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe("prefersReducedMotion", () => {
  it("returns the injected media query's matches value", () => {
    expect(prefersReducedMotion(() => fakeMediaQueryList(true))).toBe(true);
    expect(prefersReducedMotion(() => fakeMediaQueryList(false))).toBe(false);
  });
});

describe("watchReducedMotion", () => {
  it("registers a change listener and reports the current matches value on change", () => {
    const mql = fakeMediaQueryList(false);
    const onChange = vi.fn();

    watchReducedMotion(onChange, () => mql);

    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    const listener = vi.mocked(mql.addEventListener).mock.calls[0][1] as () => void;

    mql.matches = true;
    listener();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("returns an unsubscribe function that removes the listener", () => {
    const mql = fakeMediaQueryList(false);
    const unsubscribe = watchReducedMotion(vi.fn(), () => mql);

    unsubscribe();

    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
