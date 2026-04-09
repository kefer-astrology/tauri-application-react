import React, { useMemo, useState } from 'react';
import {
	ChevronDown,
	ChevronRight,
	Pencil,
	Calendar,
	Clock,
	MapPin,
	ChevronLeft,
	X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import { getAppFormFieldTheme } from './form-field-theme';
import { HoroscopeContextTabs } from './horoscope-context-tabs';
import { Theme } from './astrology-sidebar';
import { useWorkspaceCharts } from '../workspace-charts-context';
import { HoroscopeWheel_COPIED_FROM_HOROSKOP } from './horoscope-wheel';

interface HoroscopeDashboardProps {
	theme: Theme;
}

interface PlanetPosition {
	name: string;
	icon: string;
	degree: number;
	sign: string;
	signIcon: string;
	minutes: number;
}

const mockPositions: PlanetPosition[] = [
	{ name: 'Sun', icon: '☉', degree: 9, sign: 'Sagittarius', signIcon: '♐', minutes: 47 },
	{ name: 'Moon', icon: '☽', degree: 18, sign: 'Taurus', signIcon: '♉', minutes: 23 },
	{ name: 'Mercury', icon: '☿', degree: 2, sign: 'Sagittarius', signIcon: '♐', minutes: 15 },
	{ name: 'Venus', icon: '♀', degree: 26, sign: 'Scorpio', signIcon: '♏', minutes: 8 },
	{ name: 'Mars', icon: '♂', degree: 14, sign: 'Aries', signIcon: '♈', minutes: 42 },
	{ name: 'Jupiter', icon: '♃', degree: 21, sign: 'Pisces', signIcon: '♓', minutes: 56 },
	{ name: 'Saturn', icon: '♄', degree: 28, sign: 'Capricorn', signIcon: '♑', minutes: 31 },
	{ name: 'Uranus', icon: '♅', degree: 11, sign: 'Gemini', signIcon: '♊', minutes: 19 },
	{ name: 'Neptune', icon: '♆', degree: 7, sign: 'Capricorn', signIcon: '♑', minutes: 4 },
	{ name: 'Pluto', icon: '♇', degree: 8, sign: 'Scorpio', signIcon: '♏', minutes: 51 },
	{ name: 'Asc', icon: '', degree: 14, sign: 'Scorpio', signIcon: '♏', minutes: 28 },
	{ name: 'MC', icon: '', degree: 29, sign: 'Leo', signIcon: '♌', minutes: 13 },
	{ name: 'Vx', icon: '', degree: 3, sign: 'Cancer', signIcon: '♋', minutes: 37 },
	{ name: 'North Node', icon: '☊', degree: 19, sign: 'Taurus', signIcon: '♉', minutes: 45 },
	{ name: 'Part of Spirit', icon: '⊕', degree: 12, sign: 'Virgo', signIcon: '♍', minutes: 22 },
	{ name: 'Part of Fortune', icon: '⊗', degree: 24, sign: 'Capricorn', signIcon: '♑', minutes: 59 }
];

const mockHouses = [
	{ house: 1, degree: 14, sign: 'Scorpio', signIcon: '♏', minutes: 28 },
	{ house: 2, degree: 8, sign: 'Sagittarius', signIcon: '♐', minutes: 17 },
	{ house: 3, degree: 2, sign: 'Capricorn', signIcon: '♑', minutes: 51 },
	{ house: 4, degree: 29, sign: 'Capricorn', signIcon: '♑', minutes: 13 },
	{ house: 5, degree: 28, sign: 'Aquarius', signIcon: '♒', minutes: 34 },
	{ house: 6, degree: 1, sign: 'Aries', signIcon: '♈', minutes: 8 },
	{ house: 7, degree: 14, sign: 'Taurus', signIcon: '♉', minutes: 28 },
	{ house: 8, degree: 8, sign: 'Gemini', signIcon: '♊', minutes: 17 },
	{ house: 9, degree: 2, sign: 'Cancer', signIcon: '♋', minutes: 51 },
	{ house: 10, degree: 29, sign: 'Cancer', signIcon: '♋', minutes: 13 },
	{ house: 11, degree: 28, sign: 'Leo', signIcon: '♌', minutes: 34 },
	{ house: 12, degree: 1, sign: 'Libra', signIcon: '♎', minutes: 8 }
];

export function HoroscopeDashboard({ theme }: HoroscopeDashboardProps) {
	const { t } = useTranslation();
	const { selectedChart } = useWorkspaceCharts();
	const ft = useMemo(() => getAppFormFieldTheme(theme), [theme]);
	const [profileCollapsed, setProfileCollapsed] = useState(false);
	const [astrolabeCollapsed, setAstrolabeCollapsed] = useState(false);
	const [positionsCollapsed, setPositionsCollapsed] = useState(false);
	const [timeUnit, setTimeUnit] = useState<'sec' | 'min' | 'hr' | 'day' | 'month' | 'yr'>('day');
	const [timeAmount, setTimeAmount] = useState(1);
	const [showPositionModal, setShowPositionModal] = useState(false);

	const isDark = theme === 'midnight' || theme === 'twilight';

	const panelClass = cn('overflow-hidden', ft.settingsCard);
	const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
	const textColor = ft.title;
	const mutedColor = ft.muted;
	const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
	const controlRow = cn(
		'flex items-center gap-2 rounded-xl border px-3 py-2',
		borderColor,
		isDark ? 'bg-white/5' : 'bg-gray-50'
	);
	const nativeSelect = cn(
		ft.inputCompact,
		'h-9 w-full min-w-0 flex-1 text-sm rounded-xl [color-scheme:inherit]'
	);

	const getMaxAmount = () => {
		if (timeUnit === 'sec' || timeUnit === 'min' || timeUnit === 'yr') return 10;
		if (timeUnit === 'hr') return 12;
		if (timeUnit === 'month') return 12;
		return 30; // day
	};

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			{/* Main Content - 3 Column Layout */}
			<div className="flex flex-1 gap-4 overflow-hidden p-4">
				{/* Spacer - pushes left column to center */}
				<div className="min-w-0 flex-1"></div>

				{/* Left Column - Fixed 288px (10% reduction from 320px) */}
				<div className="flex w-[288px] flex-shrink-0 flex-col gap-4">
					{/* Profile Panel */}
					<div className={cn(panelClass, 'transition-all duration-300')}>
						<div
							className={`flex items-center justify-between px-4 py-3 ${hoverBg} cursor-pointer`}
							onClick={() => setProfileCollapsed(!profileCollapsed)}
						>
							<div className="flex items-center gap-2">
								{profileCollapsed ? (
									<ChevronRight className={`h-4 w-4 ${mutedColor}`} />
								) : (
									<ChevronDown className={`h-4 w-4 ${mutedColor}`} />
								)}
								<h3 className={cn('font-medium', textColor)}>
									{selectedChart?.name ?? t('demo_chart_name')}
								</h3>
							</div>
							<button
								className={`rounded-lg p-1.5 ${hoverBg}`}
								onClick={(e) => e.stopPropagation()}
							>
								<Pencil className={`h-4 w-4 ${mutedColor}`} />
							</button>
						</div>

						{!profileCollapsed && (
							<div className="space-y-3 px-4 pb-4">
								<div className={cn('space-y-1 text-sm', mutedColor)}>
									<div>{t('new_type_radix')}</div>
									<div>{t('demo_chart_date_line')}</div>
									<div>{t('demo_chart_time_line')}</div>
									<div>{t('demo_chart_location')}</div>
									<div>{t('demo_chart_coords')}</div>
									<div>{t('demo_chart_house_system')}</div>
								</div>

								<div className="flex flex-wrap gap-2 pt-2">
									<span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
										{t('demo_tag_family')}
									</span>
									<span
										className={
											isDark
												? 'rounded-lg bg-purple-950/50 px-2 py-1 text-xs font-medium text-purple-200'
												: 'rounded-lg bg-neutral-900 px-2 py-1 text-xs font-medium text-white'
										}
									>
										{t('demo_tag_astrologer')}
									</span>
									<span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-200">
										{t('demo_tag_writer')}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Astrolabe Panel */}
					<div className={cn(panelClass, 'transition-all duration-300')}>
						<div
							className={`flex items-center justify-between px-4 py-3 ${hoverBg} cursor-pointer`}
							onClick={() => setAstrolabeCollapsed(!astrolabeCollapsed)}
						>
							<div className="flex items-center gap-2">
								{astrolabeCollapsed ? (
									<ChevronRight className={`h-4 w-4 ${mutedColor}`} />
								) : (
									<ChevronDown className={`h-4 w-4 ${mutedColor}`} />
								)}
								<h3 className={`font-medium ${textColor}`}>{t('astrolabe')}</h3>
							</div>
						</div>

						{!astrolabeCollapsed && (
							<div className="space-y-3 px-4 pb-4">
								{/* Time Stepper */}
								<div className="flex items-center gap-2">
									<button
										className={`rounded-full border p-2 ${borderColor} ${hoverBg} ${textColor}`}
									>
										<ChevronLeft className="h-4 w-4" />
									</button>

									<select
										value={timeAmount}
										onChange={(e) => setTimeAmount(Number(e.target.value))}
										className={nativeSelect}
									>
										{Array.from({ length: getMaxAmount() }, (_, i) => i + 1).map((n) => (
											<option key={n} value={n}>
												{n}
											</option>
										))}
									</select>

									<select
										value={timeUnit}
										onChange={(e) =>
											setTimeUnit(e.target.value as 'sec' | 'min' | 'hr' | 'day' | 'month' | 'yr')
										}
										className={nativeSelect}
									>
										<option value="sec">{t('astrolabe_unit_sec')}</option>
										<option value="min">{t('astrolabe_unit_min')}</option>
										<option value="hr">{t('astrolabe_unit_hr')}</option>
										<option value="day">{t('astrolabe_unit_day')}</option>
										<option value="month">{t('astrolabe_unit_month')}</option>
										<option value="yr">{t('astrolabe_unit_yr')}</option>
									</select>

									<button
										className={`rounded-full border p-2 ${borderColor} ${hoverBg} ${textColor}`}
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>

								{/* Date Input */}
								<div className={controlRow}>
									<Input
										readOnly
										value={t('demo_astrolabe_date_value')}
										className={cn(
											ft.input,
											'flex-1 cursor-default border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0'
										)}
									/>
									<Calendar className={cn('h-4 w-4 shrink-0', mutedColor)} />
								</div>

								<div className={controlRow}>
									<Input
										readOnly
										value={t('demo_astrolabe_time_value')}
										className={cn(
											ft.input,
											'flex-1 cursor-default border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0'
										)}
									/>
									<Clock className={cn('h-4 w-4 shrink-0', mutedColor)} />
								</div>

								<div className={controlRow}>
									<Input
										readOnly
										value={t('demo_astrolabe_location_value')}
										className={cn(
											ft.input,
											'flex-1 cursor-default border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0'
										)}
									/>
									<MapPin className={cn('h-4 w-4 shrink-0', mutedColor)} />
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Spacer - centers left column between sidebar and horoscope */}
				<div className="min-w-0 flex-1"></div>

				{/* Center Column - Flexible */}
				<div className="flex items-center justify-center">
					<HoroscopeWheel_COPIED_FROM_HOROSKOP theme={theme} />
				</div>

				{/* Spacer - centers right column */}
				<div className="min-w-0 flex-1"></div>

				{/* Right Column - Fixed 224px (30% reduction from 320px) */}
				<div className="w-[224px] flex-shrink-0">
					<div
						className={cn(
							panelClass,
							'transition-all duration-300',
							positionsCollapsed ? '' : 'flex h-full flex-col'
						)}
					>
						<div
							className={`flex items-center justify-between px-4 py-3 ${hoverBg} flex-shrink-0 cursor-pointer`}
							onClick={() => setPositionsCollapsed(!positionsCollapsed)}
						>
							<div className="flex items-center gap-2">
								{positionsCollapsed ? (
									<ChevronRight className={`h-4 w-4 ${mutedColor}`} />
								) : (
									<ChevronDown className={`h-4 w-4 ${mutedColor}`} />
								)}
								<h3 className={`font-medium ${textColor}`}>{t('right_panel')}</h3>
							</div>
							<button
								className={`rounded-lg p-1.5 ${hoverBg}`}
								onClick={(e) => {
									e.stopPropagation();
									setShowPositionModal(true);
								}}
							>
								<Pencil className={`h-4 w-4 ${mutedColor}`} />
							</button>
						</div>

						{!positionsCollapsed && (
							<div className="flex-1 overflow-y-auto px-4 pb-4">
								<div className="space-y-1.5">
									{/* Planets - only icons */}
									{mockPositions.slice(0, 10).map((pos, idx) => (
										<div key={idx} className={`flex items-center ${textColor} font-mono text-sm`}>
											<span className="w-8 text-center text-base">{pos.icon}</span>
											<span className="w-12 text-right">{pos.degree}°</span>
											<span className="w-8 text-center text-base">{pos.signIcon}</span>
											<span className="text-right">{pos.minutes}'</span>
										</div>
									))}

									{/* Points - Asc, MC, Vx */}
									{mockPositions.slice(10, 13).map((pos, idx) => (
										<div key={idx} className={`flex items-center ${textColor} font-mono text-sm`}>
											<span className="w-8 text-center text-xs">{pos.name}</span>
											<span className="w-12 text-right">{pos.degree}°</span>
											<span className="w-8 text-center text-base">{pos.signIcon}</span>
											<span className="text-right">{pos.minutes}'</span>
										</div>
									))}

									{/* North Node and Parts */}
									{mockPositions.slice(13).map((pos, idx) => (
										<div key={idx} className={`flex items-center ${textColor} font-mono text-sm`}>
											<span className="w-8 text-center text-base">{pos.icon}</span>
											<span className="w-12 text-right">{pos.degree}°</span>
											<span className="w-8 text-center text-base">{pos.signIcon}</span>
											<span className="text-right">{pos.minutes}'</span>
										</div>
									))}

									{/* Houses */}
									<div className={`border-t ${borderColor} mt-3 pt-2`}></div>
									{mockHouses.map((house, idx) => (
										<div key={idx} className={`flex items-center ${textColor} font-mono text-sm`}>
											<span className="w-8 text-center">{house.house}.</span>
											<span className="w-12 text-right">{house.degree}°</span>
											<span className="w-8 text-center text-base">{house.signIcon}</span>
											<span className="text-right">{house.minutes}'</span>
										</div>
									))}
								</div>

								{/* Scroll indicator at bottom */}
								<div className={`text-center text-xs ${mutedColor} mt-3 italic`}>
									{t('dashboard_positions_scroll_hint')}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Spacer - balances layout */}
				<div className="min-w-0 flex-1"></div>
			</div>

			<HoroscopeContextTabs theme={theme} />

			{/* Position Selection Modal */}
			{showPositionModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className={cn(panelClass, 'max-h-[80vh] w-[min(100vw-2rem,500px)]')}>
						<div className={`flex items-center justify-between border-b px-6 py-4 ${borderColor}`}>
							<h3 className={`text-lg font-medium ${textColor}`}>
								{t('dashboard_positions_picker_title')}
							</h3>
							<button
								onClick={() => setShowPositionModal(false)}
								className={`rounded-lg p-2 ${hoverBg}`}
							>
								<X className={`h-5 w-5 ${mutedColor}`} />
							</button>
						</div>
						<div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
							<p className={`text-sm ${mutedColor}`}>{t('dashboard_positions_picker_hint')}</p>
							{/* Add checkboxes similar to Transit settings */}
						</div>
						<div className={cn('flex justify-end gap-3 border-t px-6 py-4', ft.footerBorder)}>
							<button
								type="button"
								onClick={() => setShowPositionModal(false)}
								className={cn(ft.footerCancel, '!flex-none')}
							>
								{t('cancel')}
							</button>
							<button
								type="button"
								onClick={() => setShowPositionModal(false)}
								className={cn(ft.footerPrimary, '!flex-none')}
							>
								{t('sidebar_save')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
