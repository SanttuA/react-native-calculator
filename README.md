# Laskin

Laskin is a small Expo calculator app with an Android-calculator-inspired interface and a unit-testable decimal arithmetic engine. The UI lives in React Native, while calculator state transitions are kept in a pure TypeScript module so behavior can be tested without rendering the app.

## Features

- Basic calculator operations: addition, subtraction, multiplication, and division.
- Decimal input powered by `decimal.js` to avoid common floating-point surprises.
- Sign toggle, percent, backspace, clear, repeated equals, and chained operations.
- Divide-by-zero handling with a visible error state.
- Light and dark themes based on the system color scheme.
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

Then open the app in an Android emulator, Android development build, or Expo Go from the Expo CLI prompt.

The project Expo scripts run through `scripts/expo-no-telemetry.js`, which sets `EXPO_NO_TELEMETRY=1` before invoking the local Expo CLI.

You can also launch Android directly:

```bash
npm run android
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
    calculator-screen.tsx    Calculator UI, theme colors, labels, test IDs
    __tests__/               Render and interaction tests
.maestro/
  calculator.yml             Android smoke test flow
```

## Scripts

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm start`            | Start the Expo dev server.                       |
| `npm run android`      | Start Expo and open Android.                     |
| `npm run typecheck`    | Run TypeScript with `--noEmit`.                  |
| `npm run lint`         | Run Expo ESLint.                                 |
| `npm run format:check` | Check Prettier formatting.                       |
| `npm run format:write` | Format the repo with Prettier.                   |
| `npm test`             | Run Jest tests.                                  |
| `npm run test:ci`      | Run Jest in CI mode with coverage.               |
| `npm run check`        | Run typecheck, lint, format check, and CI tests. |
| `npm run audit:prod`   | Audit production dependencies at moderate+.      |
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
- Android package: `com.santtu.laskin`
- URL scheme: `com.santtu.laskin`, required by Expo Router/Linking for production builds
- Portrait orientation
- Android network, storage, overlay, and vibration permissions blocked for offline operation

EAS profiles are defined in `eas.json`:

- `development`: internal development client build.
- `preview`: internal distribution build.
- `production`: production build with auto-incrementing versions.
- `e2e-test`: Android APK build without credentials for Maestro runs.

All EAS build profiles set `EXPO_NO_TELEMETRY=1`. Android builds block network, storage, overlay, and vibration permissions, and the repo policy tests fail if web/iOS surface, OTA update config, browser/network packages, app-source network APIs, or a non-package-name URL scheme are added back.

Example:

```bash
npx eas build --profile preview --platform android
```

## Implementation Notes

- Keep calculator behavior in `src/calculator/calculator-engine.ts` so state transitions stay deterministic and easy to unit test.
- Keep presentation, accessibility labels, test IDs, and theme colors in `src/screens/calculator-screen.tsx`.
- Preserve existing `testID` values such as `key-1`, `key-add`, `key-equals`, `display-expression`, and `display-result`; component tests and Maestro flows depend on them.
- Use Expo-managed installs for native modules so package versions stay aligned with the Expo SDK.
- The UI can be Android-calculator-inspired, but it should stay original and avoid exact Google branding or copied assets.
