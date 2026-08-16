// Regression test for a shared-foundation bug found during Milestone 7's
// full-exhibition browser walkthrough: .laboratory-flow (inactive) sets
// pointer-events: none on itself, but CSS checks each element's own computed
// value rather than blocking descendants from opting back in -- so
// .lab-note-target's own unconditional `pointer-events: auto` kept its
// buttons hit-testable even while the laboratory was off-screen (opacity: 0).
// Once a visitor opened the laboratory once, restarted, and played back
// through Acts III-V a second time, those stale lab hit-targets sat on top
// of the score-stage's own same-position beat-targets and silently
// swallowed clicks meant for them (confirmed live via
// `document.elementFromPoint` returning the lab button instead of the
// active act's beat-target). This can only be demonstrated in a real
// browser (see CLAUDE.md's "static tests cannot validate runtime
// interaction" note), so this test guards the CSS source directly: the
// pointer-events override for .lab-note-target must be scoped to
// .laboratory-flow-active, never applied unconditionally.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("laboratory hit-targets don't leak pointer events onto other scenes", () => {
  const css = readFileSync(resolve("styles.css"), "utf8");

  it("the base .lab-note-target rule does not unconditionally re-enable pointer-events", () => {
    const baseRuleMatch = css.match(/\.lab-note-target\s*\{[^}]*\}/);
    expect(baseRuleMatch, ".lab-note-target base rule not found").toBeTruthy();
    expect(baseRuleMatch![0]).not.toMatch(/pointer-events:\s*auto/);
  });

  it("pointer-events: auto for .lab-note-target is scoped to .laboratory-flow-active", () => {
    expect(css).toMatch(
      /\.laboratory-flow-active\s+\.lab-note-target\s*\{[^}]*pointer-events:\s*auto/,
    );
  });
});
