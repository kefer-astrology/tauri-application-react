---
title: "Time navigation"
description: "Reference design for time navigation behavior and state."
weight: 60
---

# Time Navigation Architecture

> **Note:** Code samples use Svelte; implement the same behavior with React state/hooks. See [frontend-react](./frontend-react/).

## Overview

The application needs to support precise time navigation for browsing computed astrological data, with support for:

- **High precision**: Seconds-level granularity (JPL precision)
- **Flexible stepping**: User-selectable time steps (seconds, minutes, hours, days)
- **Quick navigation**: Jump forward/backward by selected step
- **Time range selection**: Define start/end times for computation
- **Current time tracking**: Track current position in time series

## UI Components

### Time Navigation Panel

Located in the left sidebar (similar to Streamlit's Astrolab), provides:

1. **Current Time Display**
   - Shows current datetime being viewed
   - Format: `YYYY-MM-DD HH:MM:SS`
   - Timezone-aware display

2. **Time Step Selector**
   - Dropdown/buttons for step size:
     - Seconds (1s, 5s, 10s, 30s, 60s)
     - Minutes (1m, 5m, 15m, 30m)
     - Hours (1h, 6h, 12h, 24h)
     - Days (1d, 7d, 30d)
   - Default: 1 hour

3. **Navigation Controls**
   - `⏮ First`: Jump to start of time range
   - `⏪ Previous`: Step backward by selected step
   - `⏩ Next`: Step forward by selected step
   - `⏭ Last`: Jump to end of time range
   - `📍 Now`: Jump to current real-time

4. **Time Range Selector**
   - Start datetime picker
   - End datetime picker
   - Quick presets:
     - "Today"
     - "This Week"
     - "This Month"
     - "This Year"
     - "Custom Range"

5. **Time Shift (Astrolab)**
   - Years, Months, Days inputs
   - Hours, Minutes, Seconds inputs
   - "Apply Shift" button
   - "Reset" button

## State Management

### Svelte Store Structure

```typescript
// src/lib/stores/timeNavigation.ts
import { writable, derived } from 'svelte/store';

export type TimeStep =
	| { unit: 'seconds'; value: number }
	| { unit: 'minutes'; value: number }
	| { unit: 'hours'; value: number }
	| { unit: 'days'; value: number };

export interface TimeNavigationState {
	// Current time being viewed
	currentTime: Date;

	// Time range for computation
	startTime: Date;
	endTime: Date;

	// Current step size
	step: TimeStep;

	// Time shift (Astrolab)
	shift: {
		years: number;
		months: number;
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	};

	// Whether shift is active
	shiftActive: boolean;
}

export const timeNavigation = writable<TimeNavigationState>({
	currentTime: new Date(),
	startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
	endTime: new Date(),
	step: { unit: 'hours', value: 1 },
	shift: {
		years: 0,
		months: 0,
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0
	},
	shiftActive: false
});

// Derived: Effective time (current + shift)
export const effectiveTime = derived(timeNavigation, ($nav) => {
	if (!$nav.shiftActive) return $nav.currentTime;

	const result = new Date($nav.currentTime);
	result.setFullYear(result.getFullYear() + $nav.shift.years);
	result.setMonth(result.getMonth() + $nav.shift.months);
	result.setDate(result.getDate() + $nav.shift.days);
	result.setHours(result.getHours() + $nav.shift.hours);
	result.setMinutes(result.getMinutes() + $nav.shift.minutes);
	result.setSeconds(result.getSeconds() + $nav.shift.seconds);

	return result;
});

// Helper functions
export function stepForward() {
	timeNavigation.update((nav) => {
		const newTime = addTimeStep(nav.currentTime, nav.step);
		if (newTime <= nav.endTime) {
			return { ...nav, currentTime: newTime };
		}
		return nav;
	});
}

export function stepBackward() {
	timeNavigation.update((nav) => {
		const newTime = subtractTimeStep(nav.currentTime, nav.step);
		if (newTime >= nav.startTime) {
			return { ...nav, currentTime: newTime };
		}
		return nav;
	});
}

export function jumpToStart() {
	timeNavigation.update((nav) => ({
		...nav,
		currentTime: new Date(nav.startTime)
	}));
}

export function jumpToEnd() {
	timeNavigation.update((nav) => ({
		...nav,
		currentTime: new Date(nav.endTime)
	}));
}

export function jumpToNow() {
	timeNavigation.update((nav) => ({
		...nav,
		currentTime: new Date()
	}));
}

function addTimeStep(date: Date, step: TimeStep): Date {
	const result = new Date(date);
	switch (step.unit) {
		case 'seconds':
			result.setSeconds(result.getSeconds() + step.value);
			break;
		case 'minutes':
			result.setMinutes(result.getMinutes() + step.value);
			break;
		case 'hours':
			result.setHours(result.getHours() + step.value);
			break;
		case 'days':
			result.setDate(result.getDate() + step.value);
			break;
	}
	return result;
}

function subtractTimeStep(date: Date, step: TimeStep): Date {
	const result = new Date(date);
	switch (step.unit) {
		case 'seconds':
			result.setSeconds(result.getSeconds() - step.value);
			break;
		case 'minutes':
			result.setMinutes(result.getMinutes() - step.value);
			break;
		case 'hours':
			result.setHours(result.getHours() - step.value);
			break;
		case 'days':
			result.setDate(result.getDate() - step.value);
			break;
	}
	return result;
}
```

## Component Implementation

### TimeNavigationPanel.svelte

```svelte
<script lang="ts">
  import { timeNavigation, effectiveTime, stepForward, stepBackward, jumpToStart, jumpToEnd, jumpToNow } from '$lib/stores/timeNavigation';
  import { t } from '$lib/i18n/index.svelte';

  const nav = $derived.by(() => $timeNavigation);
  const effective = $derived($effectiveTime);

  // Format time for display
  function formatTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  // Step options
  const stepOptions = [
    { unit: 'seconds' as const, value: 1, label: '1 second' },
    { unit: 'seconds' as const, value: 5, label: '5 seconds' },
    { unit: 'seconds' as const, value: 10, label: '10 seconds' },
    { unit: 'seconds' as const, value: 30, label: '30 seconds' },
    { unit: 'seconds' as const, value: 60, label: '1 minute' },
    { unit: 'minutes' as const, value: 1, label: '1 minute' },
    { unit: 'minutes' as const, value: 5, label: '5 minutes' },
    { unit: 'minutes' as const, value: 15, label: '15 minutes' },
    { unit: 'minutes' as const, value: 30, label: '30 minutes' },
    { unit: 'hours' as const, value: 1, label: '1 hour' },
    { unit: 'hours' as const, value: 6, label: '6 hours' },
    { unit: 'hours' as const, value: 12, label: '12 hours' },
    { unit: 'hours' as const, value: 24, label: '1 day' },
    { unit: 'days' as const, value: 1, label: '1 day' },
    { unit: 'days' as const, value: 7, label: '1 week' },
    { unit: 'days' as const, value: 30, label: '1 month' },
  ];

  function updateStep(unit: 'seconds' | 'minutes' | 'hours' | 'days', value: number) {
    timeNavigation.update(n => ({ ...n, step: { unit, value } }));
  }

  function applyShift() {
    timeNavigation.update(n => ({ ...n, shiftActive: true }));
  }

  function resetShift() {
    timeNavigation.update(n => ({
      ...n,
      shift: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
      shiftActive: false,
    }));
  }
</script>

<div class="space-y-4 p-4">
  <h3 class="text-lg font-semibold">{t('time_navigation.title', {}, 'Time Navigation')}</h3>

  <!-- Current Time Display -->
  <div class="space-y-1">
    <label class="text-sm font-medium">{t('time_navigation.current_time', {}, 'Current Time')}</label>
    <div class="p-2 bg-muted rounded text-sm font-mono">
      {formatTime(effective)}
    </div>
    {#if nav.shiftActive}
      <div class="text-xs text-muted-foreground">
        Base: {formatTime(nav.currentTime)} + Shift
      </div>
    {/if}
  </div>

  <!-- Time Step Selector -->
  <div class="space-y-1">
    <label class="text-sm font-medium">{t('time_navigation.step_size', {}, 'Step Size')}</label>
    <select
      class="w-full p-2 border rounded"
      onchange={(e) => {
        const selected = stepOptions[parseInt(e.target.value)];
        updateStep(selected.unit, selected.value);
      }}
    >
      {#each stepOptions as opt, i}
        <option
          value={i}
          selected={nav.step.unit === opt.unit && nav.step.value === opt.value}
        >
          {opt.label}
        </option>
      {/each}
    </select>
  </div>

  <!-- Navigation Controls -->
  <div class="grid grid-cols-3 gap-2">
    <button
      class="px-2 py-1 text-xs border rounded hover:bg-muted"
      onclick={jumpToStart}
    >
      ⏮ First
    </button>
    <button
      class="px-2 py-1 text-xs border rounded hover:bg-muted"
      onclick={stepBackward}
    >
      ⏪ Prev
    </button>
    <button
      class="px-2 py-1 text-xs border rounded hover:bg-muted"
      onclick={stepForward}
    >
      ⏩ Next
    </button>
    <button
      class="px-2 py-1 text-xs border rounded hover:bg-muted"
      onclick={jumpToEnd}
    >
      ⏭ Last
    </button>
    <button
      class="px-2 py-1 text-xs border rounded hover:bg-muted col-span-2"
      onclick={jumpToNow}
    >
      📍 Now
    </button>
  </div>

  <!-- Time Shift (Astrolab) -->
  <div class="space-y-2 border-t pt-4">
    <h4 class="text-sm font-medium">{t('time_navigation.shift', {}, 'Time Shift')}</h4>
    <div class="grid grid-cols-3 gap-2">
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Years"
        bind:value={nav.shift.years}
      />
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Months"
        bind:value={nav.shift.months}
      />
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Days"
        bind:value={nav.shift.days}
      />
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Hours"
        bind:value={nav.shift.hours}
      />
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Minutes"
        bind:value={nav.shift.minutes}
      />
      <input
        type="number"
        class="p-1 border rounded text-sm"
        placeholder="Seconds"
        bind:value={nav.shift.seconds}
      />
    </div>
    <div class="flex gap-2">
      <button
        class="flex-1 px-2 py-1 text-sm border rounded hover:bg-muted"
        onclick={applyShift}
      >
        {t('time_navigation.apply_shift', {}, 'Apply Shift')}
      </button>
      {#if nav.shiftActive}
        <button
          class="flex-1 px-2 py-1 text-sm border rounded hover:bg-muted"
          onclick={resetShift}
        >
          {t('time_navigation.reset', {}, 'Reset')}
        </button>
      {/if}
    </div>
  </div>
</div>
```

## Integration with Data Queries

When querying positions/aspects, use the effective time:

```typescript
// In data query functions
import { effectiveTime } from '$lib/stores/timeNavigation';

export async function queryPositionsForCurrentTime(chartId: string) {
	const time = $effectiveTime;
	const isoString = time.toISOString();

	return await invoke('query_positions', {
		chartId,
		datetime: isoString
	});
}
```

## Keyboard Shortcuts

- `←` / `→`: Step backward/forward
- `Home` / `End`: Jump to start/end
- `N`: Jump to now
- `+` / `-`: Increase/decrease step size
- `S`: Toggle shift mode
