<!-- Time Navigation Panel Component -->
<script lang="ts">
  import { 
    timeNavigation, 
    effectiveTime,
    stepForward, 
    stepBackward,
    applyShift,
    resetShift,
    type TimeStep
  } from '$lib/stores/timeNavigation.svelte';
  import { t } from '$lib/i18n/index.svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  
  let {
    dateLabel = '',
    timeLabel = '',
    locationLabel = ''
  }: {
    dateLabel?: string;
    timeLabel?: string;
    locationLabel?: string;
  } = $props();

  // Step amount options (1-30)
  const stepAmountOptions = Array.from({ length: 30 }, (_, i) => i + 1);
  
  // Step unit options (granularity)
  const stepUnitOptions: Array<{ value: TimeStep['unit']; label: string }> = [
    { value: 'seconds', label: t('time_nav_seconds', {}, 'Seconds') },
    { value: 'minutes', label: t('time_nav_minutes', {}, 'Minutes') },
    { value: 'hours', label: t('time_nav_hours', {}, 'Hours') },
    { value: 'days', label: t('time_nav_days', {}, 'Days') },
    { value: 'months', label: t('time_nav_months', {}, 'Months') },
    { value: 'years', label: t('time_nav_years', {}, 'Years') }
  ];

  // Current step state - use derived to access reactive values
  let stepAmount = $state(String(timeNavigation.step.value));
  let stepUnit = $state(timeNavigation.step.unit);
  
  // Sync stepAmount and stepUnit when timeNavigation.step changes
  $effect(() => {
    const nextAmount = String(timeNavigation.step.value);
    const nextUnit = timeNavigation.step.unit;
    if (stepAmount !== nextAmount) stepAmount = nextAmount;
    if (stepUnit !== nextUnit) stepUnit = nextUnit;
  });

  // Update navigation step when selectors change
  $effect(() => {
    const amount = parseInt(stepAmount) || 1;
    if (timeNavigation.step.unit === stepUnit && timeNavigation.step.value === amount) return;
    timeNavigation.step = { unit: stepUnit, value: amount };
  });

  const effective = $derived(effectiveTime());

  const fallbackDateLabel = $derived.by(() =>
    effective.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  );
  const fallbackTimeLabel = $derived.by(() =>
    effective.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  );
</script>

<div class="space-y-3 text-sm">
  <div class="flex items-center gap-2">
    <Button type="button" variant="outline" size="sm" class="h-10 w-10 rounded-full p-0 flex-shrink-0" onclick={stepBackward} title={t('time_nav_previous', {}, 'Previous')}>◀</Button>
    <Select.Root type="single" bind:value={stepAmount}>
      <Select.Trigger class="h-10 min-w-[4.25rem] rounded-xl px-3 text-sm">{#snippet children()}{stepAmount || '1'}{/snippet}</Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each stepAmountOptions as amount}
            <Select.Item value={String(amount)} label={String(amount)}>{amount}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
    <Select.Root type="single" bind:value={stepUnit}>
      <Select.Trigger class="h-10 min-w-[7rem] flex-1 rounded-xl px-3 text-sm">
        {#snippet children()}{stepUnitOptions.find(u => u.value === stepUnit)?.label || t('time_nav_hours', {}, 'Hours')}{/snippet}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each stepUnitOptions as unit}
            <Select.Item value={unit.value} label={unit.label}>{unit.label}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
    <Button type="button" variant="outline" size="sm" class="h-10 w-10 rounded-full p-0 flex-shrink-0" onclick={stepForward} title={t('time_nav_next', {}, 'Next')}>▶</Button>
  </div>

  <div class="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
    <div class="min-w-0 flex-1 truncate">{dateLabel || fallbackDateLabel}</div>
  </div>

  <div class="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
    <div class="min-w-0 flex-1 truncate">{timeLabel || fallbackTimeLabel}</div>
  </div>

  <div class="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
    <div class="min-w-0 flex-1 truncate">{locationLabel || t('new_location', {}, 'Location')}</div>
  </div>

  <div class="border-t border-border/40 pt-2 space-y-2">
    <div class="text-xs font-medium opacity-75">{t('time_nav_shift', {}, 'Time Shift')}</div>
    <div class="grid grid-cols-6 gap-2">
      <Input id="shift-years" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.years || 0)} onchange={(e) => timeNavigation.shift.years = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="Y" title={t('time_nav_years', {}, 'Years')} />
      <Input id="shift-months" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.months || 0)} onchange={(e) => timeNavigation.shift.months = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="M" title={t('time_nav_months', {}, 'Months')} />
      <Input id="shift-days" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.days || 0)} onchange={(e) => timeNavigation.shift.days = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="D" title={t('time_nav_days', {}, 'Days')} />
      <Input id="shift-hours" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.hours || 0)} onchange={(e) => timeNavigation.shift.hours = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="h" title={t('time_nav_hours', {}, 'Hours')} />
      <Input id="shift-minutes" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.minutes || 0)} onchange={(e) => timeNavigation.shift.minutes = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="m" title={t('time_nav_minutes', {}, 'Minutes')} />
      <Input id="shift-seconds" type="number" class="h-9 px-2 text-xs" value={String(timeNavigation.shift.seconds || 0)} onchange={(e) => timeNavigation.shift.seconds = parseInt((e.target as HTMLInputElement).value) || 0} placeholder="s" title={t('time_nav_seconds', {}, 'Seconds')} />
    </div>
    <div class="flex gap-2">
      <Button type="button" variant={timeNavigation.shiftActive ? "default" : "outline"} class="h-9 flex-1 rounded-xl px-3 text-xs" onclick={applyShift}>{t('time_nav_apply_shift', {}, 'Apply')}</Button>
      <Button type="button" variant="outline" class="h-9 px-3 rounded-xl text-xs flex-shrink-0" onclick={resetShift} disabled={!timeNavigation.shiftActive}>{t('time_nav_reset', {}, 'Reset')}</Button>
    </div>
  </div>
</div>
