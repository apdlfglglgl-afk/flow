import { InterStageTransit, ProcessStep } from '../types/mes';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function elapsedHours(start: string | null | undefined, end: string | null | undefined): number | null {
  const startMs = parseDate(start);
  const endMs = parseDate(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return (endMs - startMs) / (60 * 60 * 1000);
}

/**
 * Returns residence duration in hours, using stored values when valid and
 * deriving missing values from receipt/dispatch dates or process timestamps.
 * A running step/transit is measured up to now.
 */
export function getStepDwellHours(step: ProcessStep, now = Date.now()): number | null {
  if (typeof step.dwellHours === 'number' && Number.isFinite(step.dwellHours) && step.dwellHours > 0) {
    return step.dwellHours;
  }
  if (typeof step.dwellDays === 'number' && Number.isFinite(step.dwellDays) && step.dwellDays > 0) {
    return step.dwellDays * 24;
  }

  const start = step.firstInDate || step.startedAt;
  const end = step.lastOutDate || step.completedAt;
  if (start) {
    const startMs = parseDate(start);
    if (startMs === null) return null;
    if (end) {
      const endMs = parseDate(end);
      if (endMs === null || endMs < startMs) return null;
      // Date-only receipt/dispatch fields have no time component; use exact
      // process timestamps where available to avoid turning same-day work into 0.
      if (end.length <= 10 && step.completedAt) {
        const exactHours = elapsedHours(step.startedAt || start, step.completedAt);
        if (exactHours !== null) return exactHours;
      }
      return (endMs - startMs) / (60 * 60 * 1000);
    }
    if (step.status === 'in_progress' || step.status === 'ready') {
      return Math.max(0, (now - startMs) / (60 * 60 * 1000));
    }
  }

  const timestampHours = elapsedHours(step.startedAt, step.completedAt);
  if (timestampHours !== null) return timestampHours;
  if ((step.status === 'in_progress' || step.status === 'ready') && step.startedAt) {
    const startMs = parseDate(step.startedAt);
    return startMs === null ? null : Math.max(0, (now - startMs) / (60 * 60 * 1000));
  }
  return null;
}

export function getStepDwellDays(step: ProcessStep, now = Date.now()): number | null {
  const hours = getStepDwellHours(step, now);
  return hours === null ? null : Math.round((hours / 24) * 10) / 10;
}

export function getTransitDwellHours(transit: InterStageTransit, now = Date.now()): number | null {
  if (typeof transit.transitHours === 'number' && Number.isFinite(transit.transitHours) && transit.transitHours > 0) {
    return transit.transitHours;
  }
  if (typeof transit.transitDays === 'number' && Number.isFinite(transit.transitDays) && transit.transitDays > 0) {
    return transit.transitDays * 24;
  }
  if (transit.startDate) {
    const startMs = parseDate(transit.startDate);
    if (startMs === null) return null;
    if (transit.endDate) {
      const endMs = parseDate(transit.endDate);
      if (endMs === null || endMs < startMs) return null;
      return (endMs - startMs) / (60 * 60 * 1000);
    }
    if (transit.status === 'in_transit') {
      return Math.max(0, (now - startMs) / (60 * 60 * 1000));
    }
  }
  return null;
}

export function getTransitDwellDays(transit: InterStageTransit, now = Date.now()): number | null {
  const hours = getTransitDwellHours(transit, now);
  return hours === null ? null : Math.round((hours / 24) * 10) / 10;
}

// Exported for tests and other date-based calculations.
export const MILLISECONDS_PER_DAY = DAY_IN_MS;
