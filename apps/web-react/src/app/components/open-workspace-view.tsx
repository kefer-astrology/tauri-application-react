import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Save } from 'lucide-react';
import { AppMainContentContainer, AppMainContentRoot } from './app-main-content';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { cn } from './ui/utils';
import { useAppFormFieldTheme } from './form-field-theme';
import type { Theme } from './astrology-sidebar';
import { useWorkspaceCharts } from '../providers/workspace-charts';
import type { AppChart } from '@/lib/tauri/chartPayload';

type OpenMode = 'my_radixes' | 'database';

export type OpenWorkspaceViewProps = {
	theme: Theme;
	workspacePath: string | null;
	onOpenWorkspace: () => void | Promise<void>;
	onSaveWorkspace: () => void | Promise<void>;
	/** Select chart and return to horoscope view. */
	onActivateChart: (chartId: string) => void;
};

function chartTypeLabel(chart: AppChart, t: (k: string) => string) {
	const m = chart.chartType?.toUpperCase();
	if (m === 'NATAL') return t('new_type_radix');
	if (m === 'EVENT') return t('new_type_event');
	if (m === 'HORARY') return t('new_type_horary');
	return chart.chartType;
}

/**
 * **Open** area: workspace folder actions + chart list.
 */
export function OpenWorkspaceView({
	theme,
	workspacePath,
	onOpenWorkspace,
	onSaveWorkspace,
	onActivateChart
}: OpenWorkspaceViewProps) {
	const { t } = useTranslation();
	const ft = useAppFormFieldTheme(theme);
	const { charts, selectedChartId } = useWorkspaceCharts();
	const [openMode, setOpenMode] = useState<OpenMode>('my_radixes');
	const [searchQuery, setSearchQuery] = useState('');

	const filtered = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return charts;
		return charts.filter((c) => {
			const tags = (c.tags ?? []).join(' ').toLowerCase();
			return (
				c.name.toLowerCase().includes(q) ||
				(c.location ?? '').toLowerCase().includes(q) ||
				(c.dateTime ?? '').toLowerCase().includes(q) ||
				tags.includes(q)
			);
		});
	}, [charts, searchQuery]);

	return (
		<AppMainContentRoot className={ft.formPageBg} layout="edge-to-edge">
			<AppMainContentContainer maxWidth="full" className="flex min-h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
				<div>
					<h1 className={cn('text-xl font-semibold', ft.title)}>{t('open_chart_title')}</h1>
					<p className={cn('mt-1 text-sm', ft.muted)}>{t('open_description')}</p>
					{workspacePath ? (
						<p className={cn('mt-2 font-mono text-xs', ft.muted)}>
							<span className="font-sans">{t('open_current_folder')}: </span>
							{workspacePath}
						</p>
					) : null}
				</div>

				<Card variant="ghost" className="rounded-xl p-4">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
						<div className="flex gap-2">
							<Button
								type="button"
								variant={openMode === 'my_radixes' ? 'default' : 'outline'}
								size="sm"
								className={openMode === 'my_radixes' ? '' : ft.footerCancel}
								onClick={() => setOpenMode('my_radixes')}
							>
								{t('open_mode_my_radixes')}
							</Button>
							<Button
								type="button"
								variant={openMode === 'database' ? 'default' : 'outline'}
								size="sm"
								className={openMode === 'database' ? '' : ft.footerCancel}
								onClick={() => setOpenMode('database')}
							>
								{t('open_mode_database')}
							</Button>
						</div>
						<div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:justify-end">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="gap-1.5"
								onClick={() => void onOpenWorkspace()}
							>
								<FolderOpen className="size-4" />
								{t('open_workspace')}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="gap-1.5"
								onClick={() => void onSaveWorkspace()}
							>
								<Save className="size-4" />
								{t('save_workspace')}
							</Button>
						</div>
					</div>

					{openMode === 'my_radixes' ? (
						<CardContent className="px-0 pb-0">
							<div className="mb-3">
								<Label htmlFor="open-search" className={cn('sr-only')}>
									{t('search_fulltext')}
								</Label>
								<Input
									id="open-search"
									type="search"
									placeholder={t('search_fulltext')}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className={cn(ft.input, 'max-w-md shadow-inner')}
								/>
							</div>

							<div className="border-border/80 overflow-x-auto rounded-lg border">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr className="bg-muted/40 border-b">
											<th className={cn('p-2 text-left font-medium', ft.label)}>
												{t('table_name')}
											</th>
											<th className={cn('p-2 text-left font-medium', ft.label)}>
												{t('table_chart_type')}
											</th>
											<th className={cn('p-2 text-left font-medium', ft.label)}>
												{t('table_date_time')}
											</th>
											<th className={cn('p-2 text-left font-medium', ft.label)}>
												{t('table_place')}
											</th>
											<th className={cn('p-2 text-left font-medium', ft.label)}>
												{t('table_tags')}
											</th>
										</tr>
									</thead>
									<tbody>
										{filtered.map((chart) => (
											<tr
												key={chart.id}
												className={cn(
													'cursor-pointer border-b transition-colors last:border-0',
													selectedChartId === chart.id ? 'bg-primary/10' : 'hover:bg-muted/50'
												)}
												onClick={() => onActivateChart(chart.id)}
											>
												<td className={cn('p-2', ft.bodyText)}>{chart.name}</td>
												<td className={cn('p-2 opacity-90', ft.muted)}>
													{chartTypeLabel(chart, t)}
												</td>
												<td className={cn('p-2 opacity-90', ft.muted)}>{chart.dateTime}</td>
												<td className={cn('p-2 opacity-90', ft.muted)}>{chart.location}</td>
												<td className={cn('p-2 opacity-90', ft.muted)}>
													{(chart.tags ?? []).join(', ')}
												</td>
											</tr>
										))}
										{filtered.length === 0 && (
											<tr>
												<td colSpan={5} className={cn('p-6 text-center text-sm', ft.muted)}>
													{charts.length === 0
														? t('open_table_empty')
														: t('open_search_no_results')}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</CardContent>
					) : (
						<div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
							<p className={cn('text-lg font-medium', ft.title)}>{t('open_mode_database')}</p>
							<p className={cn('max-w-md text-sm', ft.muted)}>{t('database_placeholder')}</p>
						</div>
					)}
				</Card>
			</AppMainContentContainer>
		</AppMainContentRoot>
	);
}
