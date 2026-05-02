export const ASPECT_ROWS = [
  { id: 'conjunction', labelKey: 'aspect_conjunction', defaultOrb: 8 },
  { id: 'sextile', labelKey: 'aspect_sextile', defaultOrb: 6 },
  { id: 'square', labelKey: 'aspect_square', defaultOrb: 8 },
  { id: 'trine', labelKey: 'aspect_trine', defaultOrb: 8 },
  { id: 'quincunx', labelKey: 'aspect_quincunx', defaultOrb: 3 },
  { id: 'opposition', labelKey: 'aspect_opposition', defaultOrb: 8 }
] as const;

export type AspectRowId = (typeof ASPECT_ROWS)[number]['id'];

export const DEFAULT_ASPECT_ORBS: Record<AspectRowId, number> = Object.fromEntries(
  ASPECT_ROWS.map((aspect) => [aspect.id, aspect.defaultOrb])
) as Record<AspectRowId, number>;

export const DEFAULT_ASPECT_COLORS: Record<AspectRowId, string> = {
  conjunction: '#f59e0b',
  sextile: '#10b981',
  square: '#ef4444',
  trine: '#3b82f6',
  quincunx: '#8b5cf6',
  opposition: '#f97316'
};

export interface AspectLineTierStyleState {
  tightThresholdPct: number;
  mediumThresholdPct: number;
  looseThresholdPct: number;
  widthTight: number;
  widthMedium: number;
  widthLoose: number;
  widthOuter: number;
}

export const DEFAULT_ASPECT_LINE_TIER_STYLE: AspectLineTierStyleState = {
  tightThresholdPct: 1,
  mediumThresholdPct: 2,
  looseThresholdPct: 10,
  widthTight: 5,
  widthMedium: 2,
  widthLoose: 1,
  widthOuter: 1
};

export function normalizeAspectLineTierStyle(
  value: unknown
): AspectLineTierStyleState {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const numberOr = (key: string, fallback: number) => {
    const candidate = source[key];
    return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback;
  };

  return {
    tightThresholdPct: numberOr('tightThresholdPct', DEFAULT_ASPECT_LINE_TIER_STYLE.tightThresholdPct),
    mediumThresholdPct: numberOr('mediumThresholdPct', DEFAULT_ASPECT_LINE_TIER_STYLE.mediumThresholdPct),
    looseThresholdPct: numberOr('looseThresholdPct', DEFAULT_ASPECT_LINE_TIER_STYLE.looseThresholdPct),
    widthTight: numberOr('widthTight', DEFAULT_ASPECT_LINE_TIER_STYLE.widthTight),
    widthMedium: numberOr('widthMedium', DEFAULT_ASPECT_LINE_TIER_STYLE.widthMedium),
    widthLoose: numberOr('widthLoose', DEFAULT_ASPECT_LINE_TIER_STYLE.widthLoose),
    widthOuter: numberOr('widthOuter', DEFAULT_ASPECT_LINE_TIER_STYLE.widthOuter)
  };
}
