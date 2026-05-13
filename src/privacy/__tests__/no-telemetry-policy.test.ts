import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
  scripts?: Record<string, string>;
};

type AppJson = {
  expo?: {
    ios?: unknown;
    runtimeVersion?: unknown;
    scheme?: unknown;
    updates?: unknown;
    web?: unknown;
    android?: {
      package?: string;
      permissions?: string[];
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

type PackageLock = {
  packages?: Record<
    string,
    {
      hasInstallScript?: boolean;
      integrity?: string;
      link?: boolean;
      resolved?: string;
      version?: string;
    }
  >;
};

const projectRoot = path.resolve(__dirname, '..', '..', '..');

const forbiddenDependencyNames = new Set([
  'expo-device',
  'expo-haptics',
  'expo-status-bar',
  'expo-system-ui',
  'expo-updates',
  'expo-web-browser',
  'react-dom',
  'react-native-reanimated',
  'react-native-web',
  'react-native-worklets',
]);

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

const expoScripts = ['start', 'android', 'lint'];
const forbiddenScripts = ['ios', 'web', 'reset-project'];
const allowedInstallScriptPackages = ['node_modules/fsevents', 'node_modules/unrs-resolver'];
const blockedAndroidPermissions = [
  'android.permission.INTERNET',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];
const networkApiPattern =
  /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|Linking\.openURL|openBrowserAsync)\b|expo-web-browser/;

describe('no telemetry policy', () => {
  const packageJson = readJson<PackageJson>('package.json');
  const appJson = readJson<AppJson>('app.json');
  const easJson = readJson<EasJson>('eas.json');
  const packageLock = readJson<PackageLock>('package-lock.json');

  it('does not declare analytics, crash reporting, update, web, or browser packages', () => {
    const dependencies = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    const forbiddenDependencies = dependencies.filter(
      (dependency) =>
        forbiddenDependencyNames.has(dependency) ||
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

    for (const scriptName of forbiddenScripts) {
      expect(packageJson.scripts?.[scriptName]).toBeUndefined();
    }

    const directExpoScripts = Object.entries(packageJson.scripts ?? {}).filter(
      ([, command]) => /\bexpo\b/.test(command) && !command.includes('expo-no-telemetry'),
    );

    expect(directExpoScripts).toEqual([]);
  });

  it('exposes a production dependency audit script', () => {
    expect(packageJson.scripts?.['audit:prod']).toBe('npm audit --omit=dev --audit-level=moderate');
  });

  it('passes the Expo telemetry opt-out into every EAS build profile', () => {
    const buildProfiles = Object.entries(easJson.build ?? {});

    expect(buildProfiles.length).toBeGreaterThan(0);

    for (const [, profile] of buildProfiles) {
      expect(profile.env?.EXPO_NO_TELEMETRY).toBe('1');
    }
  });

  it('keeps the native app Android-only and offline', () => {
    expect(appJson.expo?.ios).toBeUndefined();
    expect(appJson.expo?.scheme).toBe('com.santtu.laskin');
    expect(appJson.expo?.updates).toBeUndefined();
    expect(appJson.expo?.runtimeVersion).toBeUndefined();
    expect(appJson.expo?.web).toBeUndefined();
    expect(appJson.expo?.android?.package).toBe('com.santtu.laskin');
    expect(appJson.expo?.android?.permissions ?? []).not.toContain('android.permission.INTERNET');
    expect([...(appJson.expo?.android?.blockedPermissions ?? [])].sort()).toEqual(
      [...blockedAndroidPermissions].sort(),
    );
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

  it('keeps package lock entries pinned to the npm registry with integrity hashes', () => {
    const unpinnedPackages = Object.entries(packageLock.packages ?? {})
      .filter(([packagePath, packageEntry]) => {
        if (!packagePath.startsWith('node_modules/') || packageEntry.link) {
          return false;
        }

        return (
          !packageEntry.integrity ||
          (!!packageEntry.resolved &&
            !packageEntry.resolved.startsWith('https://registry.npmjs.org/'))
        );
      })
      .map(([packagePath]) => packagePath);

    expect(unpinnedPackages).toEqual([]);
  });

  it('allows install scripts only for audited package paths', () => {
    const packagesWithInstallScripts = Object.entries(packageLock.packages ?? {})
      .filter(([, packageEntry]) => packageEntry.hasInstallScript)
      .map(([packagePath]) => packagePath)
      .sort();

    expect(packagesWithInstallScripts).toEqual([...allowedInstallScriptPackages].sort());
  });

  it('overrides PostCSS past the audited vulnerable range', () => {
    expect(packageJson.overrides?.postcss).toBe('^8.5.10');
    expect(semverAtLeast(packageLock.packages?.['node_modules/postcss']?.version, '8.5.10')).toBe(
      true,
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

function semverAtLeast(version: string | undefined, minimum: string): boolean {
  if (!version) {
    return false;
  }

  const versionParts = version.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);

  for (let index = 0; index < minimumParts.length; index += 1) {
    const versionPart = versionParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (versionPart > minimumPart) {
      return true;
    }

    if (versionPart < minimumPart) {
      return false;
    }
  }

  return true;
}
