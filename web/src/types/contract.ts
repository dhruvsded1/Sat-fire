export type Bounds = [number, number, number, number]; // [West_Lon, South_Lat, East_Lon, North_Lat]

export interface ManifestFire {
  id: string;
  name: string;
  state: string;
  start: string;
  end: string;
  bounds: Bounds;
  area_km2: number;
}

export interface Manifest {
  contract_version: number;
  fires: ManifestFire[];
}

export interface FireMeta {
  id: string;
  name?: string;
  state?: string;
  bounds: Bounds;
  pixel_size_m: number;
  png_size: [number, number];
  days: string[];
}

export interface RawDayMetrics {
  f1_af: number;
  iou_af: number;
  f1_ba: number;
  iou_ba: number;
  burned_km2: number;
  new_km2: number;
}

export type RawFireMetrics = Record<string, RawDayMetrics>;

export interface DayMetric extends RawDayMetrics {
  date: string;
  day_index: number;
}

export interface FireMetricsSummary {
  mean_f1_af: number;
  mean_iou_af: number;
  mean_f1_ba: number;
  mean_iou_ba: number;
  total_burned_km2: number;
  max_daily_growth_km2: number;
}

export interface TaskMetric {
  f1: number;
  iou: number;
}

export interface ModelItem {
  name: string;
  af: TaskMetric;
  ba: TaskMetric;
  prediction: TaskMetric;
  category?: string;
  latency_ms?: number;
  parameters_m?: number;
  description?: string;
}

export interface ModelsContract {
  contract_version: number;
  tasks: string[];
  models: {
    baseline: ModelItem;
    ours: ModelItem;
    paper: ModelItem;
    [key: string]: ModelItem;
  };
}

export interface ImportanceItem {
  channel: string;
  f1_drop: number;
}

export type ImportanceData = ImportanceItem[];

export type ActiveFireMode = 'none' | 'gt' | 'pred' | 'confusion';
export type BurnedAreaMode = 'none' | 'gt' | 'pred';

export interface LayerState {
  showComposite: boolean;
  compositeOpacity: number;
  showThermal: boolean;
  thermalOpacity: number;
  activeFireMode: ActiveFireMode;
  burnedAreaMode: BurnedAreaMode;
  showNextDay: boolean;
  nextDayThreshold: number; // 0.1 to 0.9
  showActualNextOverlay: boolean;
  predictionOpacity: number; // 0 to 1 (Slide to Compare)
  swipeCompare?: boolean;
  swipePosition?: number; // 0 to 100%
}

export interface InspectorSample {
  lng: number;
  lat: number;
  pixelX: number;
  pixelY: number;
  thermalValue: number; // 0-255
  estimatedKelvin: number;
  isActiveFireGT: boolean;
  isActiveFirePred: boolean;
  isBurnedAreaGT: boolean;
  isBurnedAreaPred: boolean;
  nextDayProb: number; // 0.0 - 1.0
  confusionCategory: 'True Positive' | 'False Positive' | 'False Negative' | 'Unburned / True Negative';
  fuelState: 'Flaming Firefront' | 'Smoldering Scar' | 'Active Growth Zone' | 'Unburned Biomass';
}
