import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

type AppJson = {
  expo?: {
    android?: {
      blockedPermissions?: string[];
    };
  };
};

type EasJson = {
  build?: Record<
    string,
    {
      env?: Record<string, string>;
    }
  >;
};

const projectRoot = path.resolve(__dirname, '..', '..', '..');

const forbiddenDependencyPatterns = [
  /^@react-native-firebase\//i,
  /^@sentry\//i,
  /analytics/i,
  /amplitude/i,
  /bugsnag/i,
  /datadog/i,
  /firebase/i,
  /mixpanel/i,
  /posthog/i,
  /segment/i,
  /sentry/i,
];

const expoScripts = ['start', 'android', 'ios', 'web', 'lint'];
const networkApiPattern = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\b/;

describe('no telemetry policy', () => {
  const packageJson = readJson<PackageJson>('package.json');
  const appJson = readJson<AppJson>('app.json');
  const easJson = readJson<EasJson>('eas.json');

  it('does not declare analytics, crash reporting, or telemetry packages', () => {
    const dependencies = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    const forbiddenDependencies = dependencies.filter((dependency) =>
      forbiddenDependencyPatterns.some((pattern) => pattern.test(dependency)),
    );

    expect(forbiddenDependencies).toEqual([]);
  });

  it('runs project Expo CLI scripts with telemetry disabled', () => {
    for (const scriptName of expoScripts) {
      expect(packageJson.scripts?.[scriptName]).toMatch(
        /^node \.\/scripts\/expo-no-telemetry\.js\b/,
      );
    }

    const directExpoScripts = Object.entries(packageJson.scripts ?? {}).filter(
      ([, command]) => /\bexpo\b/.test(command) && !command.includes('expo-no-telemetry'),
    );

    expect(directExpoScripts).toEqual([]);
  });

  it('passes the Expo telemetry opt-out into every EAS build profile', () => {
    const buildProfiles = Object.entries(easJson.build ?? {});

    expect(buildProfiles.length).toBeGreaterThan(0);

    for (const [, profile] of buildProfiles) {
      expect(profile.env?.EXPO_NO_TELEMETRY).toBe('1');
    }
  });

  it('removes Android internet permission from generated builds', () => {
    expect(appJson.expo?.android?.blockedPermissions).toContain('android.permission.INTERNET');
  });

  it('does not use network APIs in app source', () => {
    const sourceFiles = listSourceFiles(path.join(projectRoot, 'src'));
    const filesWithNetworkApis = sourceFiles.filter((filePath) =>
      networkApiPattern.test(fs.readFileSync(filePath, 'utf8')),
    );

    expect(filesWithNetworkApis.map((filePath) => path.relative(projectRoot, filePath))).toEqual(
      [],
    );
  });
});

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, fileName), 'utf8')) as T;
}

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '__tests__') {
        return [];
      }

      return listSourceFiles(entryPath);
    }

    return /\.[tj]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}
