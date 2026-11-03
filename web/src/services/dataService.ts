import {
  Manifest,
  FireMeta,
  RawFireMetrics,
  DayMetric,
  FireMetricsSummary,
  ModelsContract,
  ImportanceData
} from '../types/contract';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(`${BASE_URL}/data/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load manifest.json: ${res.statusText}`);
  return res.json();
}

export async function fetchFireMeta(fireId: string): Promise<FireMeta> {
  const res = await fetch(`${BASE_URL}/data/fires/${fireId}/meta.json`);
  if (!res.ok) throw new Error(`Failed to load meta.json for ${fireId}`);
  return res.json();
}

export async function fetchFireMetrics(
  fireId: string
): Promise<{ days: DayMetric[]; summary: FireMetricsSummary }> {
  const res = await fetch(`${BASE_URL}/data/fires/${fireId}/metrics.json`);
  if (!res.ok) throw new Error(`Failed to load metrics.json for ${fireId}`);
  const raw: RawFireMetrics = await res.json();

  // Convert raw dictionary to sorted DayMetric array
  const dateKeys = Object.keys(raw).sort();
  const days: DayMetric[] = dateKeys.map((date, idx) => ({
    date,
    day_index: idx + 1,
    ...raw[date]
  }));

  // Calculate summary metrics
  const validAf = days.filter((d) => d.f1_af > 0);
  const mean_f1_af =
    validAf.length > 0
      ? validAf.reduce((acc, d) => acc + d.f1_af, 0) / validAf.length
      : 0;
  const mean_iou_af =
    validAf.length > 0
      ? validAf.reduce((acc, d) => acc + d.iou_af, 0) / validAf.length
      : 0;

  const validBa = days.filter((d) => d.f1_ba > 0);
  const mean_f1_ba =
    validBa.length > 0
      ? validBa.reduce((acc, d) => acc + d.f1_ba, 0) / validBa.length
      : 0;
  const mean_iou_ba =
    validBa.length > 0
      ? validBa.reduce((acc, d) => acc + d.iou_ba, 0) / validBa.length
      : 0;

  const total_burned_km2 = days.length > 0 ? days[days.length - 1].burned_km2 : 0;
  const max_daily_growth_km2 =
    days.length > 0 ? Math.max(...days.map((d) => d.new_km2)) : 0;

  return {
    days,
    summary: {
      mean_f1_af: Math.round(mean_f1_af * 1000) / 1000,
      mean_iou_af: Math.round(mean_iou_af * 1000) / 1000,
      mean_f1_ba: Math.round(mean_f1_ba * 1000) / 1000,
      mean_iou_ba: Math.round(mean_iou_ba * 1000) / 1000,
      total_burned_km2: Math.round(total_burned_km2 * 10) / 10,
      max_daily_growth_km2: Math.round(max_daily_growth_km2 * 10) / 10
    }
  };
}

export async function fetchModels(): Promise<ModelsContract> {
  const res = await fetch(`${BASE_URL}/data/models.json`);
  if (!res.ok) throw new Error(`Failed to load models.json`);
  return res.json();
}

export async function fetchImportance(): Promise<ImportanceData> {
  const res = await fetch(`${BASE_URL}/data/importance.json`);
  if (!res.ok) throw new Error(`Failed to load importance.json`);
  return res.json();
}

export function getDayRasterUrls(fireId: string, date: string) {
  const base = `${BASE_URL}/data/fires/${fireId}/days/${date}`;
  return {
    composite: `${base}/composite.png`,
    thermal: `${base}/thermal.png`,
    afGt: `${base}/af_gt.png`,
    afPred: `${base}/af_pred.png`,
    baGt: `${base}/ba_gt.png`,
    baPred: `${base}/ba_pred.png`,
    predNext: `${base}/pred_next.png`
  };
}
