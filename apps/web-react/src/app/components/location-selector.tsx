import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

type LocationSelectorProps = {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	options?: string[];
	placeholder: string;
	searchPlaceholder: string;
	emptyLabel: string;
	disabled?: boolean;
	className?: string;
	iconClassName?: string;
};

function normalize(value: string) {
	return value.trim().toLowerCase();
}

export function LocationSelector({
	id,
	value,
	onValueChange,
	options = [],
	placeholder,
	searchPlaceholder,
	emptyLabel,
	disabled = false,
	className,
	iconClassName
}: LocationSelectorProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState(value);

	useEffect(() => {
		if (!open) setQuery(value);
	}, [open, value]);

	const normalizedQuery = normalize(query);

	const uniqueOptions = useMemo(() => {
		const seen = new Set<string>();
		return options.filter((option) => {
			const key = normalize(option);
			if (!key || seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}, [options]);

	const filteredOptions = useMemo(() => {
		if (!normalizedQuery) return uniqueOptions;
		return uniqueOptions.filter((option) => normalize(option).includes(normalizedQuery));
	}, [normalizedQuery, uniqueOptions]);

	const showCustomOption =
		normalizedQuery.length > 0 && !uniqueOptions.some((option) => normalize(option) === normalizedQuery);

	return (
		<Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						'h-10 w-full justify-between text-left font-normal shadow-inner',
						className
					)}
				>
					<span className="flex min-w-0 items-center gap-2">
						<MapPin className={cn('h-4 w-4 shrink-0', iconClassName)} />
						<span className="truncate">{value.trim() || placeholder}</span>
					</span>
					<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
				<Command>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder={searchPlaceholder}
					/>
					<CommandList>
						<CommandEmpty>{emptyLabel}</CommandEmpty>
						<CommandGroup>
							{showCustomOption ? (
								<CommandItem
									value={query}
									onSelect={() => {
										onValueChange(query.trim());
										setOpen(false);
									}}
								>
									<MapPin className="h-4 w-4" />
									<span className="truncate">{query.trim()}</span>
								</CommandItem>
							) : null}
							{filteredOptions.map((option) => {
								const selected = normalize(option) === normalize(value);
								return (
									<CommandItem
										key={option}
										value={option}
										onSelect={() => {
											onValueChange(option);
											setOpen(false);
										}}
									>
										<Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
										<span className="truncate">{option}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
