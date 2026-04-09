import type { CSSProperties } from 'react';
import { cn } from './ui/utils';
import type { Theme } from './astrology-sidebar';
import { sidebarNavMenuRowClassName, sidebarThemeStyles } from './astrology-sidebar';

export type SecondaryNavItem = {
	id: string;
	label: string;
};

type SecondaryNavPanelProps = {
	theme: Theme;
	title?: string;
	items: SecondaryNavItem[];
	activeId: string;
	onSelect: (id: string) => void;
	ariaLabel: string;
	/** Merged onto the aside (e.g. min-height when paired with a tall content card). */
	className?: string;
};

export function SecondaryNavPanel({
	theme,
	title,
	items,
	activeId,
	onSelect,
	ariaLabel,
	className
}: SecondaryNavPanelProps) {
	const st = sidebarThemeStyles[theme];

	const asideStyle: CSSProperties | undefined =
		theme === 'twilight' || theme === 'midnight' ? { ...st.customStyle } : undefined;

	return (
		<aside
			className={cn(
				'flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r pt-2 transition-all duration-300 ease-in-out',
				st.bg,
				st.border,
				className
			)}
			style={asideStyle}
		>
			{title ? (
				<div className={cn('shrink-0 border-b px-3 py-4', st.border)}>
					<h2 className={cn('text-sm font-semibold tracking-wide uppercase', st.text)}>{title}</h2>
				</div>
			) : null}

			<nav
				className="scrollbar-hide flex min-h-0 flex-1 flex-col space-y-0.5 overflow-y-auto px-3 py-3"
				aria-label={ariaLabel}
			>
				{items.map((item) => {
					const isActive = activeId === item.id;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onSelect(item.id)}
							className={cn(
								'w-full text-left',
								sidebarNavMenuRowClassName,
								isActive ? st.active : cn(st.text, st.hover)
							)}
							aria-current={isActive ? 'page' : undefined}
						>
							{item.label}
						</button>
					);
				})}
			</nav>
		</aside>
	);
}
