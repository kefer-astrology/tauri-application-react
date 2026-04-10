export type AppShellIconSetId = 'default' | 'modern';

export interface AppShellIconSetOption {
  id: AppShellIconSetId;
  label: string;
  description: string;
}

export const APP_SHELL_ICON_SET_STORAGE_KEY = 'app_shell_icon_set';
const ASSET_BASE_URL = import.meta.env.BASE_URL;

export const appShellIconSetOptions: AppShellIconSetOption[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Current shared app-shell SVG family.',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Heritage React app-shell icon family.',
  },
];

export const appShellIconSettings = $state<{ activeSet: AppShellIconSetId }>({
  activeSet: loadStoredAppShellIconSet(),
});

function isAppShellIconSetId(value: string): value is AppShellIconSetId {
  return value === 'default' || value === 'modern';
}

export function loadStoredAppShellIconSet(): AppShellIconSetId {
  try {
    const value = localStorage.getItem(APP_SHELL_ICON_SET_STORAGE_KEY);
    if (value && isAppShellIconSetId(value)) {
      return value;
    }
  } catch {
    /* ignore */
  }
  return 'default';
}

export function setAppShellIconSet(next: AppShellIconSetId) {
  if (!isAppShellIconSetId(next)) return;
  if (appShellIconSettings.activeSet === next) return;
  appShellIconSettings.activeSet = next;
  try {
    localStorage.setItem(APP_SHELL_ICON_SET_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

type AppShellAssetId =
  | 'menu'
  | 'new'
  | 'open'
  | 'save'
  | 'export'
  | 'horoscope'
  | 'aspects'
  | 'information'
  | 'transits'
  | 'dynamics'
  | 'revolution'
  | 'synastry'
  | 'settings'
  | 'favorite'
  | 'theme-sunrise'
  | 'theme-noon'
  | 'theme-twilight'
  | 'theme-midnight';

const assetFileNames: Record<AppShellAssetId, string> = {
  menu: 'menu.svg',
  new: 'new.svg',
  open: 'open.svg',
  save: 'save.svg',
  export: 'export.svg',
  horoscope: 'horoscope.svg',
  aspects: 'aspects.svg',
  information: 'information.svg',
  transits: 'transits.svg',
  dynamics: 'dynamics.svg',
  revolution: 'revolution.svg',
  synastry: 'synastry.svg',
  settings: 'settings.svg',
  favorite: 'favorite.svg',
  'theme-sunrise': 'theme-sunrise.svg',
  'theme-noon': 'theme-noon.svg',
  'theme-twilight': 'theme-twilight.svg',
  'theme-midnight': 'theme-midnight.svg',
};

function assetUrl(relativePath: string): string {
  const normalizedBase = ASSET_BASE_URL.endsWith('/') ? ASSET_BASE_URL : `${ASSET_BASE_URL}/`;
  const normalizedPath = relativePath.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

export function resolveAppShellIconPath(assetId: AppShellAssetId, setId = appShellIconSettings.activeSet): string {
  return assetUrl(`app-shell/icons/${setId}/${assetFileNames[assetId]}`);
}

export function resolveAppShellLogoFullPath(setId = appShellIconSettings.activeSet): string {
  return assetUrl(`app-shell/logo-full-${setId}.svg`);
}

export function resolveAppShellLogoMarkPath(setId = appShellIconSettings.activeSet): string {
  return assetUrl(`app-shell/logo-mark-${setId}.svg`);
}
