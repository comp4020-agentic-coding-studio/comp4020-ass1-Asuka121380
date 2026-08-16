# Assignment 1 reflection

The breakthrough was realizing that a fully green `pnpm check` --- typecheck,
build, lint, 62 passing tests --- was not evidence the exhibition was correct,
only evidence it was consistent with itself. The scheduler's bar-boundary
logic had a real bug (it fired its callback one tick before any bar had
actually elapsed) and the annotation layer really did overlap the staff, and
neither showed up until I loaded the page in a browser and timed it. Both bugs
were invisible to every static check I'd written, because I'd written the
static checks against my own (wrong) mental model of the runtime behaviour.
Nothing forced me to check that model against the actual rendered, timed page
until a project rule I'd written into `CLAUDE.md` myself told me to.

That's the thing this assignment changed: I want to be a developer who treats
"the checks are green" and "the thing works" as two separate claims, and who
builds the harness so the gap between them gets checked rather than assumed
away. Writing `CLAUDE.md` rules before I needed them --- "never accept a
visually plausible score without checking it in a real browser," "test at
exactly these two viewports" --- meant that when the pressure of a same-day
deadline showed up, the rule was already there to catch me instead of relying
on remembering to be careful in the moment. The harness did the remembering.
I'd rather keep building software that way than trust my own diligence to
show up every time.
