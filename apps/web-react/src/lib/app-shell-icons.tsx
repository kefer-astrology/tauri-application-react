import { SharedSvgIcon } from '@/app/components/shared-svg-icon';

export type AppShellTheme = 'sunrise' | 'noon' | 'twilight' | 'midnight';
export type AppShellIconSetId = 'default' | 'modern';
export type AppShellInkVariant = 'black' | 'white';
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
		description: 'Current shared app-shell SVG family.'
	},
	{
		id: 'modern' as const,
		label: 'Modern',
		description: 'Heritage React app-shell icon family.'
	}
];

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

function appShellIconPath(iconSet: AppShellIconSetId, iconId: AppShellIconId): string {
	return `/app-shell/icons/${iconSet}/${iconFileNames[iconId]}`;
}

function appShellLogoPath(iconSet: AppShellIconSetId, variant: 'full' | 'mark'): string {
	return `/app-shell/logo-${variant}-${iconSet}.svg`;
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

export function getAppShellInkVariant(theme: AppShellTheme): AppShellInkVariant {
	return theme === 'sunrise' || theme === 'noon' ? 'black' : 'white';
}

export function renderAppShellIcon({
	iconId,
	iconSet,
	className,
	size,
	title
}: {
	iconId: AppShellIconId;
	iconSet: AppShellIconSetId;
	className?: string;
	size: number;
	title?: string;
}) {
	return (
		<SharedSvgIcon
			src={appShellIconPath(iconSet, iconId)}
			title={title}
			className={className}
			size={size}
		/>
	);
}

export function renderAppShellLogoMark({
	iconSet,
	className,
	size,
	theme
}: {
	iconSet: AppShellIconSetId;
	className?: string;
	size: number;
	theme: AppShellTheme;
}) {
	return <SharedSvgIcon src={appShellLogoPath(iconSet, 'mark')} className={className} size={size} />;
}

export function renderAppShellLogoFull({
	iconSet,
	className,
	iconSize,
	theme
}: {
	iconSet: AppShellIconSetId;
	className?: string;
	iconSize: number;
	theme: AppShellTheme;
}) {
	return (
		<div className={className}>
			<SharedSvgIcon
				src={appShellLogoPath(iconSet, 'full')}
				className="h-6 w-[92px]"
				size={iconSet === 'modern' ? 112 : 92}
			/>
		</div>
	);
}
