const ASSET_BASE_URL = import.meta.env.BASE_URL;

export type AppShellIconSetId = 'default' | 'modern';
export type AppShellIconId =
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

export const APP_SHELL_ICON_SET_KEY = 'app_shell_icon_set';

export const APP_SHELL_ICON_SET_OPTIONS = [
	{
		id: 'default' as const,
		label: 'Default',
		description: 'Heritage React app-shell icon family.'
	},
	{
		id: 'modern' as const,
		label: 'Modern',
		description: 'Current shared app-shell SVG family.'
	}
];

const APP_SHELL_FULL_LOGO_ASPECT_RATIO: Record<AppShellIconSetId, number> = {
	default: 247 / 77,
	modern: 220 / 60
};

export const APP_SHELL_MARK_MASK_SCALE = 0.88;

const APP_SHELL_ICON_MASK_SCALE: Record<AppShellIconSetId, Record<AppShellIconId, number>> = {
	default: {
		menu: 0.8,
		new: 1.1,
		open: 0.86,
		save: 0.94,
		export: 0.94,
		horoscope: 1.08,
		aspects: 1.12,
		information: 1.1,
		transits: 1.05,
		dynamics: 0.9,
		revolution: 1.05,
		synastry: 0.86,
		settings: 1.1,
		favorite: 1.12,
		'theme-sunrise': 0.9,
		'theme-noon': 0.78,
		'theme-twilight': 0.9,
		'theme-midnight': 0.98
	},
	modern: {
		menu: 0.94,
		new: 0.8,
		open: 0.8,
		save: 0.84,
		export: 0.84,
		horoscope: 0.84,
		aspects: 0.84,
		information: 0.8,
		transits: 0.8,
		dynamics: 0.84,
		revolution: 0.84,
		synastry: 0.8,
		settings: 0.82,
		favorite: 0.8,
		'theme-sunrise': 0.8,
		'theme-noon': 0.8,
		'theme-twilight': 0.8,
		'theme-midnight': 0.84
	}
};

const iconFileNames: Record<AppShellIconId, string> = {
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
	'theme-midnight': 'theme-midnight.svg'
};

function assetUrl(relativePath: string): string {
	const normalizedBase = ASSET_BASE_URL.endsWith('/') ? ASSET_BASE_URL : `${ASSET_BASE_URL}/`;
	const normalizedPath = relativePath.replace(/^\/+/, '');
	return `${normalizedBase}${normalizedPath}`;
}

function appShellAssetSet(iconSet: AppShellIconSetId): AppShellIconSetId {
	return iconSet === 'default' ? 'modern' : 'default';
}

export function getAppShellIconSrc(iconSet: AppShellIconSetId, iconId: AppShellIconId): string {
	return assetUrl(`app-shell/icons/${appShellAssetSet(iconSet)}/${iconFileNames[iconId]}`);
}

export function getAppShellLogoSrc(
	iconSet: AppShellIconSetId,
	variant: 'full' | 'mark'
): string {
	return assetUrl(`app-shell/logo-${variant}-${appShellAssetSet(iconSet)}.svg`);
}

export function getAppShellIconMaskScale(
	iconSet: AppShellIconSetId,
	iconId: AppShellIconId
): number {
	return APP_SHELL_ICON_MASK_SCALE[appShellAssetSet(iconSet)][iconId];
}

export function getAppShellLogoFullWidth(iconSet: AppShellIconSetId, height: number): number {
	return Math.round(height * APP_SHELL_FULL_LOGO_ASPECT_RATIO[appShellAssetSet(iconSet)]);
}

export function readStoredAppShellIconSet(): AppShellIconSetId {
	try {
		const value = localStorage.getItem(APP_SHELL_ICON_SET_KEY);
		if (value === 'default' || value === 'modern') {
			return value;
		}
	} catch {
		/* ignore */
	}
	return 'default';
}
