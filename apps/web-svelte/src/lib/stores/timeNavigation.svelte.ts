// Time Navigation Store - Svelte 5 runes-based
// This file must be Svelte-compiled (.svelte.ts) to use runes

export type TimeStepUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years';

export interface TimeStep {
  unit: TimeStepUnit;
  value: number;
}

export interface TimeShift {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TimeNavigationState {
  // Current time being viewed
  currentTime: Date;
  
  // Time range for computation
  startTime: Date;
  endTime: Date;
  
  // Current step size
  step: TimeStep;
  
  // Time shift (Astrolab)
  shift: TimeShift;
  
  // Whether shift is active
  shiftActive: boolean;
}

// Initialize with sensible defaults
function getDefaultState(): TimeNavigationState {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    currentTime: now,
    startTime: sevenDaysAgo,
    endTime: now,
    step: { unit: 'hours', value: 1 },
    shift: {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
    shiftActive: false,
  };
}

// Export state using Svelte 5 runes
export const timeNavigation = $state<TimeNavigationState>(getDefaultState());

// Helper: Add time step to date
function addTimeStep(date: Date, step: TimeStep): Date {
  const result = new Date(date);
  switch (step.unit) {
    case 'seconds':
      result.setUTCSeconds(result.getUTCSeconds() + step.value);
      break;
    case 'minutes':
      result.setUTCMinutes(result.getUTCMinutes() + step.value);
      break;
    case 'hours':
      result.setUTCHours(result.getUTCHours() + step.value);
      break;
    case 'days':
      result.setUTCDate(result.getUTCDate() + step.value);
      break;
    case 'months':
      result.setUTCMonth(result.getUTCMonth() + step.value);
      break;
    case 'years':
      result.setUTCFullYear(result.getUTCFullYear() + step.value);
      break;
  }
  return result;
}

// Helper: Subtract time step from date
function subtractTimeStep(date: Date, step: TimeStep): Date {
  const result = new Date(date);
  switch (step.unit) {
    case 'seconds':
      result.setUTCSeconds(result.getUTCSeconds() - step.value);
      break;
    case 'minutes':
      result.setUTCMinutes(result.getUTCMinutes() - step.value);
      break;
    case 'hours':
      result.setUTCHours(result.getUTCHours() - step.value);
      break;
    case 'days':
      result.setUTCDate(result.getUTCDate() - step.value);
      break;
    case 'months':
      result.setUTCMonth(result.getUTCMonth() - step.value);
      break;
    case 'years':
      result.setUTCFullYear(result.getUTCFullYear() - step.value);
      break;
  }
  return result;
}

// Navigation functions
export function stepForward() {
  timeNavigation.currentTime = addTimeStep(timeNavigation.currentTime, timeNavigation.step);
  // Clamp to end time
  if (timeNavigation.currentTime > timeNavigation.endTime) {
    timeNavigation.currentTime = new Date(timeNavigation.endTime);
  }
}

export function stepBackward() {
  timeNavigation.currentTime = subtractTimeStep(timeNavigation.currentTime, timeNavigation.step);
  // Clamp to start time
  if (timeNavigation.currentTime < timeNavigation.startTime) {
    timeNavigation.currentTime = new Date(timeNavigation.startTime);
  }
}

export function jumpToStart() {
  timeNavigation.currentTime = new Date(timeNavigation.startTime);
}

export function jumpToEnd() {
  timeNavigation.currentTime = new Date(timeNavigation.endTime);
}

export function jumpToNow() {
  timeNavigation.currentTime = new Date();
  // Update end time if now is beyond it
  if (timeNavigation.currentTime > timeNavigation.endTime) {
    timeNavigation.endTime = new Date(timeNavigation.currentTime);
  }
}

export function applyShift() {
  timeNavigation.shiftActive = true;
}

export function resetShift() {
  timeNavigation.shift = {
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  timeNavigation.shiftActive = false;
}

// Export function to get effective time (computed on access)
// This function computes the effective time based on current state
export function effectiveTime(): Date {
  if (!timeNavigation.shiftActive) {
    return timeNavigation.currentTime;
  }
  
  const result = new Date(timeNavigation.currentTime);
  result.setUTCFullYear(result.getUTCFullYear() + timeNavigation.shift.years);
  result.setUTCMonth(result.getUTCMonth() + timeNavigation.shift.months);
  result.setUTCDate(result.getUTCDate() + timeNavigation.shift.days);
  result.setUTCHours(result.getUTCHours() + timeNavigation.shift.hours);
  result.setUTCMinutes(result.getUTCMinutes() + timeNavigation.shift.minutes);
  result.setUTCSeconds(result.getUTCSeconds() + timeNavigation.shift.seconds);
  
  return result;
}

// Format time for display
export function formatTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Format time with microseconds (for high precision)
export function formatTimePrecise(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 23).replace('T', ' '); // Includes milliseconds
}
