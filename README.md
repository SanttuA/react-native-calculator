# Laskin

Laskin is a small Expo calculator app with an Android-calculator-inspired interface and a unit-testable decimal arithmetic engine. The UI lives in React Native, while calculator state transitions are kept in a pure TypeScript module so behavior can be tested without rendering the app.

## Features

- Basic calculator operations: addition, subtraction, multiplication, and division.
- Decimal input powered by `decimal.js` to avoid common floating-point surprises.
- Sign toggle, percent, backspace, clear, repeated equals, and chained operations.
- Divide-by-zero handling with a visible error state.
- Light and dark themes based on the system color scheme.
- Haptic feedback on native key presses.
- Stable test IDs and accessibility labels for component and Maestro tests.

## Tech Stack

- Expo SDK 55
- Expo Router
- React 19 and React Native 0.83
- TypeScript
- Jest with `jest-expo`
- React Native Testing Library
- Maestro for Android smoke coverage
- EAS Build profiles

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm start
```

Then open the app in an Android emulator, iOS simulator, development build, Expo Go, or web browser from the Expo CLI prompt.

You can also launch a platform directly:

```bash
npm run android
npm run ios
npm run web
```

## Project Structure

```text
src/
  app/
    _layout.tsx              Expo Router root layout
    index.tsx                Route entry that renders the calculator screen
  calculator/
    calculator-engine.ts     Pure calculator reducer, formatting, and arithmetic
    __tests__/               Engine unit tests
  screens/
    calculator-screen.tsx    Calculator UI, theme colors, haptics, labels, test IDs
    __tests__/               Render and interaction tests
  components/                Shared template components still available to the app
  constants/                 Theme constants
  hooks/                     Color scheme helpers
.maestro/
  calculator.yml             Android smoke test flow
```

## Scripts

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm start`            | Start the Expo dev server.                       |
| `npm run android`      | Start Expo and open Android.                     |
| `npm run ios`          | Start Expo and open iOS.                         |
| `npm run web`          | Start Expo for web.                              |
| `npm run typecheck`    | Run TypeScript with `--noEmit`.                  |
| `npm run lint`         | Run Expo ESLint.                                 |
| `npm run format:check` | Check Prettier formatting.                       |
| `npm run format:write` | Format the repo with Prettier.                   |
| `npm test`             | Run Jest tests.                                  |
| `npm run test:ci`      | Run Jest in CI mode with coverage.               |
| `npm run check`        | Run typecheck, lint, format check, and CI tests. |
| `npm run e2e:android`  | Run the Maestro Android smoke test.              |

## Quality Checks

Run the full local quality gate before handing off changes:

```bash
npm run check
```

For focused test loops while editing calculator behavior:

```bash
npm run test -- --watch
```

The calculator engine tests cover input composition, decimal precision, operator replacement, sign/backspace behavior, percentages, chained operations, repeated equals, divide-by-zero, and clearing state. The screen tests verify the display, key test IDs, basic interaction, clearing, and error rendering.

## Android Smoke Test

Maestro coverage is defined in `.maestro/calculator.yml` and targets the Android package:

```text
com.santtu.laskin
```

Build and install an Android app before running:

```bash
npm run e2e:android
```

The smoke flow launches the app, verifies `12 + 7 = 19`, clears the calculator, and checks the divide-by-zero error message.

## Builds

The app is configured in `app.json` with:

- App name and slug: `Laskin` / `laskin`
- URL scheme: `laskin`
- iOS bundle identifier: `com.santtu.laskin`
- Android package: `com.santtu.laskin`
- Portrait orientation
- Automatic light/dark user interface style

EAS profiles are defined in `eas.json`:

- `development`: internal development client build.
- `preview`: internal distribution build.
- `production`: production build with auto-incrementing versions.
- `e2e-test`: Android APK build without credentials for Maestro runs.

Example:

```bash
npx eas build --profile preview --platform android
```

## Implementation Notes

- Keep calculator behavior in `src/calculator/calculator-engine.ts` so state transitions stay deterministic and easy to unit test.
- Keep presentation, accessibility labels, test IDs, haptics, and theme colors in `src/screens/calculator-screen.tsx`.
- Preserve existing `testID` values such as `key-1`, `key-add`, `key-equals`, `display-expression`, and `display-result`; component tests and Maestro flows depend on them.
- Use Expo-managed installs for native modules so package versions stay aligned with the Expo SDK.
- The UI can be Android-calculator-inspired, but it should stay original and avoid exact Google branding or copied assets.
