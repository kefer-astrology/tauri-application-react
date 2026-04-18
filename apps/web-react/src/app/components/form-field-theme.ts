import { useMemo } from 'react';
import { cn } from './ui/utils';
import type { Theme } from './astrology-sidebar';

/**
 * Shared field styling aligned with **New Horoscope** (`new-horoscope.tsx`) so settings and
 * other forms match the same glass / border / focus treatment across `sunrise` | `noon` | `twilight` | `midnight`.
 * `sunrise` uses sky/cyan surfaces and `bg-sky-500` primary actions to match the sidebar + main shell.
 */
export function getAppFormFieldTheme(theme: Theme) {
	const isMidnight = theme === 'midnight';
	const isTwilight = theme === 'twilight';
	const isSunrise = theme === 'sunrise';
	/** Legacy: true only for midnight (charts / icons that distinguish blue night). */
	const isDark = isMidnight;

	const title =
		isMidnight || isTwilight
			? 'text-white'
			: isSunrise
				? 'text-sky-950'
				: 'text-gray-900';
	const label = isMidnight
		? 'text-blue-100'
		: isTwilight
			? 'text-white'
			: isSunrise
				? 'text-sky-900'
				: 'text-gray-700';
	const muted = isMidnight
		? 'text-blue-200/80'
		: isTwilight
			? 'text-white/80'
			: isSunrise
				? 'text-sky-800/85'
				: 'text-muted-foreground';

	const input = cn(
		'w-full rounded-xl border px-4 py-2.5 text-base transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none md:text-sm',
		isDark
			? 'border-blue-900/40 bg-blue-950/40 text-slate-100 placeholder:text-slate-600 backdrop-blur-sm shadow-inner'
			: isTwilight
				? 'border-blue-700/40 bg-blue-900/30 text-white placeholder:text-white/50 backdrop-blur-sm shadow-inner'
				: isSunrise
					? 'border-sky-200 bg-white/95 text-sky-950 placeholder:text-sky-400/80 shadow-inner focus:ring-sky-500'
					: 'border-gray-200 bg-white text-gray-900'
	);

	const inputCompact = cn(
		'h-9 rounded-xl border px-3 py-1 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none',
		isDark
			? 'border-blue-900/40 bg-blue-950/40 text-slate-100 backdrop-blur-sm'
			: isTwilight
				? 'border-blue-700/40 bg-blue-900/30 text-white backdrop-blur-sm'
				: isSunrise
					? 'border-sky-200 bg-white/95 text-sky-950 focus:ring-sky-500'
					: 'border-gray-200 bg-white text-gray-900'
	);

	const selectTrigger = cn(
		'flex h-auto min-h-10 w-full items-center justify-between rounded-xl border px-4 py-2.5 text-base transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none md:text-sm [&>svg]:opacity-70',
		isDark
			? 'border-blue-900/40 bg-blue-950/40 text-slate-100 backdrop-blur-sm shadow-inner'
			: isTwilight
				? 'border-blue-700/40 bg-blue-900/30 text-white backdrop-blur-sm shadow-inner'
				: isSunrise
					? 'border-sky-200 bg-white/95 text-sky-950 shadow-inner focus:ring-sky-500'
					: 'border-gray-200 bg-white text-gray-900'
	);

	const selectContent = cn(
		'rounded-xl border shadow-lg',
		isDark
			? 'border-blue-900/40 bg-blue-950/95 text-slate-100 backdrop-blur-lg'
			: isTwilight
				? 'border-blue-700/40 bg-blue-900/95 text-white backdrop-blur-lg'
				: isSunrise
					? 'border-sky-200 bg-white text-sky-950 shadow-lg'
					: 'border-gray-200 bg-white text-popover-foreground'
	);

	const selectItem =
		isDark || isTwilight
			? 'focus:bg-blue-900/70 focus:text-white data-[highlighted]:bg-blue-900/70 data-[highlighted]:text-white'
			: isSunrise
				? 'focus:bg-sky-100 focus:text-sky-950 data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-950'
				: '';

	const footerBorder = isDark
		? 'border-blue-900/40'
		: isTwilight
			? 'border-blue-800/40'
			: isSunrise
				? 'border-sky-200/80'
				: 'border-gray-200';

	const footerCancel = cn(
		'flex-1 rounded-xl border px-6 py-2.5 font-medium transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none',
		isDark
			? 'border-blue-900/40 bg-blue-950/40 text-slate-200 hover:bg-blue-900/60 focus:ring-slate-500 backdrop-blur-sm shadow-inner'
			: isTwilight
				? 'border-blue-700/40 bg-blue-900/30 text-white hover:bg-blue-800/50 focus:ring-blue-400 backdrop-blur-sm shadow-inner'
				: isSunrise
					? 'border-sky-300 bg-white/95 text-sky-900 shadow-sm hover:bg-sky-50 focus:ring-sky-400'
					: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
	);

	const footerPrimary = cn(
		'flex-1 rounded-xl px-6 py-2.5 font-medium text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-50',
		isDark || isTwilight
			? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-400 shadow-lg shadow-indigo-900/50'
			: isSunrise
				? 'bg-sky-500 hover:bg-sky-600 focus:ring-sky-400 shadow-lg shadow-sky-700/25'
				: 'bg-neutral-900 hover:bg-neutral-800 focus:ring-neutral-600 shadow-lg shadow-black/20'
	);

	/** Noon: neutral/black; twilight & midnight: indigo; sunrise: sky — matches sidebar accents. */
	const langBubbleActive = isSunrise
		? 'border-sky-600 bg-sky-500 text-white ring-2 ring-sky-400/45 shadow-sm'
		: isMidnight || isTwilight
			? 'border-indigo-500 bg-indigo-600 text-white ring-2 ring-indigo-400/50 shadow-sm'
			: 'border-neutral-800 bg-neutral-900 text-white ring-2 ring-neutral-600/50 shadow-sm';
	const langBubbleIdle = isDark
		? 'border-blue-800/50 bg-blue-950/50 text-slate-200 hover:bg-blue-900/50'
		: isTwilight
			? 'border-blue-700/50 bg-blue-900/40 text-white hover:bg-blue-800/50'
			: isSunrise
				? 'border-sky-300 bg-white/95 text-sky-900 hover:border-sky-400 hover:bg-sky-50'
				: 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-neutral-50';

	const inputDisabled = cn(
		'cursor-not-allowed border text-base md:text-sm',
		isDark
			? 'border-blue-950/40 bg-blue-950/60 text-slate-700 backdrop-blur-sm'
			: isTwilight
				? 'border-blue-900/40 bg-blue-950/40 text-white/45 backdrop-blur-sm'
				: isSunrise
					? 'border-sky-200 bg-sky-50/80 text-sky-400'
					: 'border-gray-200 bg-white text-gray-400'
	);

	const dropdown = selectContent;

	const dropdownHover = isDark
		? 'hover:bg-blue-900/60'
		: isTwilight
			? 'hover:bg-blue-800/60'
			: isSunrise
				? 'hover:bg-sky-100'
				: 'hover:bg-gray-50';

	const dropdownActive =
		isDark || isTwilight
			? 'bg-indigo-600/90 text-white'
			: isSunrise
				? 'bg-sky-100 text-sky-800'
				: 'bg-neutral-100 text-neutral-900';

	const advancedPanel = cn(
		'rounded-xl border-0 p-4',
		isDark
			? 'bg-blue-950/30 backdrop-blur-sm'
			: isTwilight
				? 'bg-blue-900/25 backdrop-blur-sm'
				: isSunrise
					? 'bg-sky-50/90'
					: 'bg-blue-50'
	);

	const iconColor = isDark
		? 'text-blue-400'
		: isTwilight
			? 'text-white'
			: isSunrise
				? 'text-sky-600'
				: 'text-gray-400';

	const datePicker = cn(
		'w-80 rounded-xl border-0 p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/10',
		isDark
			? 'bg-blue-950/95 backdrop-blur-lg'
			: isTwilight
				? 'bg-blue-900/95 backdrop-blur-lg'
				: isSunrise
					? 'bg-white shadow-xl'
					: 'bg-white'
	);

	const datePickerHeader = isDark
		? 'text-blue-400'
		: isTwilight
			? 'text-white'
			: isSunrise
				? 'text-sky-700'
				: 'text-gray-500';

	const datePickerButton = isDark
		? 'hover:bg-blue-900/60'
		: isTwilight
			? 'hover:bg-blue-800/60'
			: isSunrise
				? 'hover:bg-sky-100'
				: 'hover:bg-gray-100';

	const datePickerDay = isDark
		? 'hover:bg-blue-900/60 text-slate-300'
		: isTwilight
			? 'hover:bg-blue-800/60 text-white'
			: isSunrise
				? 'hover:bg-sky-100 text-sky-900'
				: 'hover:bg-blue-50';

	const datePickerDayActive =
		isDark || isTwilight
			? 'bg-indigo-600/90 text-white hover:bg-indigo-600'
			: isSunrise
				? 'bg-sky-500 text-white hover:bg-sky-600'
				: 'bg-neutral-900 text-white hover:bg-neutral-800';

	/** Native checkbox accent color (Tailwind `text-*` tints the checkmark). */
	const checkboxAccent = isMidnight || isTwilight
		? 'text-indigo-400 focus:ring-indigo-400'
		: isSunrise
			? 'text-sky-600 focus:ring-sky-500'
			: 'text-neutral-900 focus:ring-neutral-600';

	/** Light themes: subtle page tint behind the form. Dark themes use `App` / inline bg instead. */
	const formPageBg =
		isDark || isTwilight
			? ''
			: isSunrise
				? 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-100'
				: 'bg-gradient-to-b from-gray-50 to-white';

	const switchUnchecked = isDark
		? 'data-[state=unchecked]:bg-slate-700'
		: isTwilight
			? 'data-[state=unchecked]:bg-slate-600'
			: isSunrise
				? 'data-[state=unchecked]:bg-sky-300'
				: 'data-[state=unchecked]:bg-gray-300';

	const textDisabled = isDark
		? 'text-slate-500'
		: isTwilight
			? 'text-white/45'
			: isSunrise
				? 'text-sky-500/90'
				: 'text-gray-400';

	const bodyText = isDark
		? 'text-slate-200'
		: isTwilight
			? 'text-white'
			: isSunrise
				? 'text-sky-900/90'
				: 'text-gray-600';

	/** Bottom horoscope strip: workspace chart “tabs” — shadcn surfaces + app glass (matches settings cards). */
	const contextRail = cn(
		'flex min-h-11 w-full items-center justify-center gap-2 overflow-x-auto overflow-y-hidden border-t px-3 py-1.5',
		isDark
			? 'border-blue-900/40 bg-blue-950/45 text-slate-100 backdrop-blur-md'
			: isTwilight
				? 'border-blue-800/40 bg-blue-950/30 text-white backdrop-blur-md'
				: isSunrise
					? 'border-sky-200/80 bg-white/70 text-sky-950 backdrop-blur-md supports-[backdrop-filter]:bg-white/60'
					: 'border-border bg-muted/50 text-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-background/70'
	);

	const contextTabGhost = cn(
		'h-8 min-h-8 max-w-[min(12rem,40vw)] justify-start truncate px-2 font-normal shadow-none',
		isDark
			? 'text-slate-300 hover:bg-white/10 hover:text-white'
			: isTwilight
				? 'text-white hover:bg-white/10 hover:text-white'
				: isSunrise
					? 'text-sky-800/90 hover:bg-sky-100 hover:text-sky-950'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'
	);

	const contextTabActive = cn(
		'block truncate font-semibold underline underline-offset-4 decoration-primary/60',
		title
	);

	const contextSeparator = isDark
		? '[&>svg]:text-slate-500'
		: isTwilight
			? '[&>svg]:text-white/55'
			: isSunrise
				? '[&>svg]:text-sky-500/70'
				: '[&>svg]:text-muted-foreground/60';

	return {
		isDark,
		isTwilight,
		isSunrise,
		title,
		sectionTitle: cn('text-lg font-semibold tracking-tight', title),
		label: cn('text-sm font-medium', label),
		muted,
		input,
		inputCompact,
		inputDisabled,
		selectTrigger,
		selectContent,
		selectItem,
		footerBorder,
		footerCancel,
		footerPrimary,
		/** Popover / menu surface (same palette as `selectContent`). */
		dropdown,
		dropdownHover,
		dropdownActive,
		advancedPanel,
		iconColor,
		datePicker,
		datePickerHeader,
		datePickerButton,
		datePickerDay,
		datePickerDayActive,
		formPageBg,
		switchUnchecked,
		textDisabled,
		bodyText,
		checkboxAccent,
		langBubble: (active: boolean) =>
			cn(
				'min-h-12 min-w-[3.25rem] rounded-full border-2 px-5 py-2.5 text-base font-semibold transition-colors',
				active ? langBubbleActive : langBubbleIdle
			),
		contextRail,
		contextTabGhost,
		contextTabActive,
		contextSeparator
	};
}

export type AppFormFieldTheme = ReturnType<typeof getAppFormFieldTheme>;

export function useAppFormFieldTheme(theme: Theme): AppFormFieldTheme {
	return useMemo(() => getAppFormFieldTheme(theme), [theme]);
}
