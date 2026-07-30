# AGENTS.md

Working notes for this repository: constraints and pitfalls that are not obvious from the code.

## Expo HAS CHANGED

Read the exact versioned docs at <https://docs.expo.dev/versions/v57.0.0/> before writing any code.

## Commands

`npm run lint` · `npm run typecheck` · `npm test` — all three must exit 0 before any commit. CI
runs the same three and suppresses nothing.

## Version pins that cannot move casually

- **ESLint 9.x.** `eslint-config-expo` bundles a plugin calling `context.getFilename()`, removed in
  ESLint 10. Upgrading crashes the linter on load.
- **Jest 29.x.** `jest-expo` 57 is built against Jest 29 internals.
- **`@testing-library/react-native` 14** made `render`, `fireEvent` and `renderHook` **async**.
  Await all of them; a missing `await` surfaces as `result` being undefined.
- `tsconfig` sets `"types": ["jest"]`. Without it `tsc` fails on every test file. Setting `types`
  opts out of automatic inclusion, but React is not needed there — its types resolve through the
  imports and the JSX runtime.

## The expand animation measures before it animates

`height: 'auto'` cannot be animated, so the details region is measured via `onLayout` and its
height animated to and from that value. Four things about this are easy to break:

- **The measuring layer re-applies the card's padding.** An absolutely positioned child is laid out
  against its parent's *padding* box, so `left: 0` would measure the text `2 * CARD_PADDING` wider
  than it renders in flow — and the region clips whatever does not fit.
- **Only the first positive `onLayout` per content is kept.** Once the region is clipped to an
  animated height, `onLayout` fires again describing the *clipped box*. Accepting that report pins
  the height near zero and the card never opens.
- **`contentKey` watches the description only.** Nothing that changes more often than the height
  belongs in it: React Native de-duplicates layout events by frame, so a churning key makes
  measurements go missing rather than refresh. The time-remaining label is clamped to one line so
  it cannot affect the height.
- **Staleness is derived, never reset in an effect.** `react-hooks/set-state-in-effect` forbids the
  effect version, and deriving avoids an extra render pass.

Animations use the JS driver deliberately — they animate `width`/`height`, which the native driver
cannot. `Animated.Value`s live in `useState` with a lazy initialiser rather than `useRef`, because
they are read during render and `react-hooks/refs` forbids that for refs.

## Layout is not testable under Jest

Yoga does not run in the test renderer, so a measured height is whatever the test supplies. Tests
prove the measurement is stored, invalidated and animated correctly — never that the number is
right. **Anything touching layout must be checked on a simulator.**

`onLayout` can be synthesised: `fireEvent(node, 'layout', { nativeEvent: { layout } })`. Dispatch
at the description, not at the region — RNTL walks *up* to find the handler.

`getByTestId` defaults to `includeHiddenElements: false`, and the collapsed details region is
deliberately hidden from assistive tech, so asserting on it needs the opt-in.

## Accessibility

The collapsed details and the zero-width logo stay mounted so they can be measured, so both carry
`accessibilityElementsHidden` (iOS) *and* `importantForAccessibility` (Android). Visual hiding
alone leaves them reachable by a screen reader.
