# Laskin Agent Guide

## Architecture

- Expo SDK 55 app using Expo Router and TypeScript.
- `src/app/index.tsx` renders the single calculator screen.
- `src/screens/calculator-screen.tsx` owns presentation, accessibility labels, and theme colors.
- `src/calculator/calculator-engine.ts` owns calculator state transitions and decimal arithmetic.

## Quality Gates

- Run `npm run check` before handoff.
- Use `npm run test -- --watch` for focused local test loops.
- Use `npm run format:write` only when intentionally formatting the repo.
- Maestro smoke coverage lives in `.maestro/calculator.yml` and expects Android package `com.santtu.laskin`.

## Implementation Notes

- Keep calculator behavior in the engine module so it stays unit-testable.
- Keep stable test IDs and accessibility labels for keys and displays; E2E and component tests depend on them.
- Prefer Expo-managed installs for native modules with SDK alignment requirements.
- Do not add exact Google branding or copy assets; the UI is Android calculator-inspired but original.
