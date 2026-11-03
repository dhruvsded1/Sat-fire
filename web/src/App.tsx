import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MapViewer } from './components/MapViewer';
import { TimelinePlayer } from './components/TimelinePlayer';
import { LayerControls } from './components/LayerControls';
import { InspectorCard } from './components/InspectorCard';
import { MetricsPanel } from './components/MetricsPanel';
import { ModelBenchmarks } from './components/ModelBenchmarks';
import { FeatureImportance } from './components/FeatureImportance';
import { MethodologyModal } from './components/MethodologyModal';

import {
  Manifest,
  ManifestFire,
  FireMeta,
  DayMetric,
  FireMetricsSummary,
  ModelsContract,
  ImportanceData,
  LayerState,
  InspectorSample
} from './types/contract';
import {
  fetchManifest,
  fetchFireMeta,
  fetchFireMetrics,
  fetchModels,
  fetchImportance
} from './services/dataService';
import { pixelSampler } from './services/pixelSampler';
import { Flame, MapPin, Calendar } from 'lucide-react';

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedFire, setSelectedFire] = useState<ManifestFire | null>(null);
  const [fireMeta, setFireMeta] = useState<FireMeta | null>(null);
  const [fireMetrics, setFireMetrics] = useState<{
    days: DayMetric[];
    summary: FireMetricsSummary;
  } | null>(null);
  const [modelsData, setModelsData] = useState<ModelsContract | null>(null);
  const [importanceData, setImportanceData] = useState<ImportanceData | null>(null);

  const [currentDate, setCurrentDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'explorer' | 'benchmarks' | 'importance'>('explorer');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);
  const [inspectedSample, setInspectedSample] = useState<InspectorSample | null>(null);
  const [showMetrics, setShowMetrics] = useState<boolean>(true);
  const [isSwitchingFire, setIsSwitchingFire] = useState<boolean>(false);

  const [layerState, setLayerState] = useState<LayerState>({
    showComposite: true,
    compositeOpacity: 0.95,
    showThermal: false,
    thermalOpacity: 0.8,
    activeFireMode: 'confusion', // Default to confusion matrix to highlight algorithm evaluation
    burnedAreaMode: 'none',
    showNextDay: true, // Default to next-day prediction
    nextDayThreshold: 0.35,
    showActualNextOverlay: false,
    predictionOpacity: 0.85
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamically re-sample active inspected coordinates when timeline date changes
  useEffect(() => {
    if (inspectedSample && !isSwitchingFire) {
      const timer = window.setTimeout(() => {
        const updated = pixelSampler.sample(inspectedSample.lng, inspectedSample.lat);
        if (updated) {
          setInspectedSample(updated);
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [currentDate]);

  // 1. Initial Data Initialization (atomic load of first fire)
  useEffect(() => {
    async function init() {
      try {
        const [m, models, imp] = await Promise.all([
          fetchManifest(),
          fetchModels(),
          fetchImportance()
        ]);
        setManifest(m);
        setModelsData(models);
        setImportanceData(imp);

        if (m.fires.length > 0) {
          const prominentFire =
            m.fires.find(
              (f) =>
                f.id === 'US_2021_CA3627811855020210815' ||
                f.id === '24103571' ||
                f.area_km2 > 100
            ) || m.fires[0];

          const [meta, metrics] = await Promise.all([
            fetchFireMeta(prominentFire.id),
            fetchFireMetrics(prominentFire.id)
          ]);

          const activeDay = metrics.days.find((d) => d.f1_af > 0.4 || d.new_km2 > 0.5);
          const targetDate = activeDay ? activeDay.date : (meta.days[0] || '');

          setSelectedFire(prominentFire);
          setFireMeta(meta);
          setFireMetrics(metrics);
          setCurrentDate(targetDate);
        }
      } catch (err) {
        console.error('Failed to initialize FireLens data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 2. Atomic Fire Switch Handler: fetches meta & metrics before updating state
  const handleSelectFire = async (fire: ManifestFire) => {
    if (fire.id === selectedFire?.id) return;
    setIsSwitchingFire(true);
    try {
      const [meta, metrics] = await Promise.all([
        fetchFireMeta(fire.id),
        fetchFireMetrics(fire.id)
      ]);

      const activeDay = metrics.days.find((d) => d.f1_af > 0.4 || d.new_km2 > 0.5);
      const targetDate = activeDay ? activeDay.date : (meta.days[0] || '');

      // Synchronously batch-update all fire state to prevent coordinate/layer desync
      setSelectedFire(fire);
      setFireMeta(meta);
      setFireMetrics(metrics);
      setCurrentDate(targetDate);
      setInspectedSample(null);
    } catch (err) {
      console.error(`Error switching to fire ${fire.id}:`, err);
    } finally {
      setIsSwitchingFire(false);
    }
  };

  const handleUpdateLayerState = (newState: Partial<LayerState>) => {
    setLayerState((prev) => ({ ...prev, ...newState }));
  };

  if (isLoading || !manifest || !selectedFire || !fireMeta || !fireMetrics) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 font-mono space-y-3">
        <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
          <Flame className="w-7 h-7 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-wider text-orange-400">
          INITIALIZING FIRELENS TELEMETRY...
        </div>
        <div className="text-xs text-slate-500">Loading TS-SatFire Multi-Spectral Wildfire Rasters</div>
      </div>
    );
  }

  const currentDayMetric =
    fireMetrics.days.find((d) => d.date === currentDate) || fireMetrics.days[0];
  const finalBurnedKm2 =
    selectedFire.area_km2 > 0
      ? selectedFire.area_km2
      : fireMetrics.summary.total_burned_km2;

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        fires={manifest.fires}
        selectedFire={selectedFire}
        onSelectFire={handleSelectFire}
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics((v) => !v)}
        isSwitchingFire={isSwitchingFire}
      />

      {/* Main Body View */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'explorer' && (
          <div className="w-full h-full flex flex-col lg:flex-row relative overflow-hidden">
            {/* Left Controls & Scenario Details Panel */}
            <div className="w-full lg:w-80 lg:min-w-[320px] lg:max-w-[340px] shrink-0 p-3 border-r border-slate-800 bg-slate-950/95 overflow-y-auto space-y-3 z-10 max-h-56 lg:max-h-full">
              {/* Scenario Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 select-none shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-orange-400 font-semibold flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-orange-400" />
                    <span>State: {selectedFire.state}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {fireMeta.days.length} Days
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{selectedFire.name}</h3>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{selectedFire.start} &rarr; {selectedFire.end}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">TOTAL SCAR</span>
                    <span className="text-orange-400 font-bold">{finalBurnedKm2} km²</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RESOLUTION</span>
                    <span className="text-slate-300 font-bold">
                      {fireMeta.pixel_size_m}m <span className="text-slate-500">({fireMeta.png_size.join('×')})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Layer Toggles, Threshold Controls & Slide to Compare */}
              <LayerControls
                layerState={layerState}
                onChangeLayerState={handleUpdateLayerState}
              />
            </div>

            {/* Center: MapLibre Geospatial Canvas & Floating Timeline */}
            <div className="flex-1 relative min-w-0 h-[55vh] lg:h-full flex flex-col overflow-hidden">
              <div className="relative w-full h-full flex-1 min-h-0">
                <MapViewer
                  fireId={selectedFire.id}
                  bounds={fireMeta.bounds}
                  days={fireMeta.days}
                  currentDate={currentDate}
                  currentMetric={currentDayMetric}
                  layerState={layerState}
                  inspectedSample={inspectedSample}
                  onSamplePixel={(s) => setInspectedSample(s)}
                  showMetrics={showMetrics}
                  onToggleMetrics={() => setShowMetrics((v) => !v)}
                />

                {/* Floating Bottom Timeline Scrubber */}
                <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto z-20 pointer-events-auto">
                  <TimelinePlayer
                    days={fireMeta.days}
                    metrics={fireMetrics.days}
                    currentDate={currentDate}
                    onSelectDate={(d) => setCurrentDate(d)}
                  />
                </div>
              </div>
            </div>

            {/* Right Telemetry & Inspector Panel */}
            {showMetrics && (
              <div className="w-full lg:w-96 lg:min-w-[350px] lg:max-w-[420px] shrink-0 p-3 border-l border-slate-800 bg-slate-950/95 overflow-y-auto space-y-3 z-10 max-h-72 lg:max-h-full">
                {/* Click / Hover Pixel Inspector */}
                <InspectorCard
                  sample={inspectedSample}
                  onClear={() => setInspectedSample(null)}
                />

                {/* Daily Metrics & Recharts Progression */}
                <MetricsPanel
                  currentMetric={currentDayMetric}
                  metrics={fireMetrics.days}
                  summary={fireMetrics.summary}
                  currentDate={currentDate}
                  onSelectDate={(d) => setCurrentDate(d)}
                />
              </div>
            )}
          </div>
        )}

        {/* Algorithm Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <ModelBenchmarks modelsData={modelsData} />
        )}

        {/* Channel Feature Importance Tab */}
        {activeTab === 'importance' && (
          <FeatureImportance importanceData={importanceData} />
        )}
      </div>

      {/* Methodology & Guide Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
};

export default App;
