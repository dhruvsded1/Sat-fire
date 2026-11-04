import React, { useState, useEffect } from 'react';
import { Header, PresentationMode } from './components/Header';
import { MapViewer } from './components/MapViewer';
import { TimelinePlayer } from './components/TimelinePlayer';
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
import { Flame, AlertTriangle, RefreshCw, X, Sparkles } from 'lucide-react';

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
  const [showMetrics, setShowMetrics] = useState<boolean>(false); // Default to clean full-screen map!
  const [isSwitchingFire, setIsSwitchingFire] = useState<boolean>(false);

  const [layerState, setLayerState] = useState<LayerState>({
    showComposite: true,
    compositeOpacity: 0.95,
    showThermal: false,
    thermalOpacity: 0.85,
    activeFireMode: 'confusion', // Default to algorithm verification
    burnedAreaMode: 'none',
    showNextDay: false,
    nextDayThreshold: 0.35,
    showActualNextOverlay: false,
    predictionOpacity: 1.0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [isTourRunning, setIsTourRunning] = useState<boolean>(false);
  const [tourStepText, setTourStepText] = useState<string | null>(null);
  const tourTimeoutsRef = React.useRef<number[]>([]);

  const stopTour = () => {
    tourTimeoutsRef.current.forEach(clearTimeout);
    tourTimeoutsRef.current = [];
    setIsTourRunning(false);
    setTourStepText(null);
  };

  // Dynamic active mode calculation
  const activeMode: PresentationMode =
    layerState.showThermal
      ? 'physics'
      : layerState.showNextDay
      ? 'forecast'
      : 'detection';

  const handleSelectMode = (mode: PresentationMode) => {
    if (mode === 'physics') {
      setLayerState((prev) => ({
        ...prev,
        showComposite: true,
        compositeOpacity: 0.95,
        showThermal: true,
        thermalOpacity: 0.95,
        activeFireMode: 'none',
        burnedAreaMode: 'none',
        showNextDay: false,
        predictionOpacity: 1.0
      }));
    } else if (mode === 'detection') {
      setLayerState((prev) => ({
        ...prev,
        showComposite: true,
        compositeOpacity: 0.95,
        showThermal: false,
        thermalOpacity: 0.0,
        activeFireMode: 'confusion',
        burnedAreaMode: 'none',
        showNextDay: false,
        predictionOpacity: 1.0
      }));
    } else if (mode === 'forecast') {
      setLayerState((prev) => ({
        ...prev,
        showComposite: true,
        compositeOpacity: 0.95,
        showThermal: false,
        thermalOpacity: 0.0,
        activeFireMode: 'none',
        burnedAreaMode: 'none',
        showNextDay: true,
        nextDayThreshold: 0.35,
        showActualNextOverlay: true,
        predictionOpacity: 1.0
      }));
    }
  };

  const startTour = () => {
    stopTour();
    if (!fireMetrics?.days || fireMetrics.days.length === 0) return;
    const days = fireMetrics.days.map((d) => d.date);
    setIsTourRunning(true);

    const schedule = (fn: () => void, delayMs: number) => {
      const id = window.setTimeout(fn, delayMs);
      tourTimeoutsRef.current.push(id);
    };

    // Phase 1 (0s): Physics / Thermal IR
    setTourStepText('🛰️ Step 1/4: VIIRS 3.74µm Thermal Radiance (Planck Inception Detection)');
    setCurrentDate(days[0]);
    handleSelectMode('physics');

    // Phase 2 (3.5s): AI U-Net Detection
    schedule(() => {
      setTourStepText('🎯 Step 2/4: U-Net Active Fire Segmentation (Green: True Positives)');
      const peakIdx = Math.min(2, days.length - 1);
      setCurrentDate(days[peakIdx]);
      handleSelectMode('detection');
    }, 3500);

    // Phase 3 (7.0s): Slide to Compare
    schedule(() => {
      setTourStepText('🔍 Step 3/4: SWIR Smoke Penetration — Cross-fading Satellite & AI Layer');
      setLayerState((prev) => ({ ...prev, predictionOpacity: 0.1 }));
      schedule(() => {
        setLayerState((prev) => ({ ...prev, predictionOpacity: 1.0 }));
      }, 1200);
    }, 7000);

    // Phase 4 (10.5s): 24h Spread Forecast
    schedule(() => {
      setTourStepText('🔮 Step 4/4: 24h Forecast Surface & Ground Truth Perimeter Expansion');
      handleSelectMode('forecast');
    }, 10500);

    // Completion (14.0s)
    schedule(() => {
      setTourStepText('✨ Presentation Tour Complete! Explore freely or click any pixel to sample telemetry.');
      schedule(() => {
        stopTour();
      }, 3500);
    }, 14000);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const days = fireMetrics?.days?.map((d) => d.date) || [];
      if (e.code === 'Space') {
        e.preventDefault();
        if (days.length > 0) {
          const idx = days.indexOf(currentDate);
          const nextIdx = (idx + 1) % days.length;
          setCurrentDate(days[nextIdx]);
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        if (days.length > 0) {
          const idx = days.indexOf(currentDate);
          if (idx < days.length - 1) setCurrentDate(days[idx + 1]);
        }
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (days.length > 0) {
          const idx = days.indexOf(currentDate);
          if (idx > 0) setCurrentDate(days[idx - 1]);
        }
      } else if (e.key === '1') {
        handleSelectMode('physics');
      } else if (e.key === '2') {
        handleSelectMode('detection');
      } else if (e.key === '3') {
        handleSelectMode('forecast');
      } else if (e.key === 'Escape' && isTourRunning) {
        stopTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fireMetrics, currentDate, isTourRunning]);

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

  // Initial Data Initialization
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
      } catch (err: any) {
        console.error('Failed to initialize FireLens data:', err);
        setInitError(err.message || 'Failed to initialize dataset telemetry');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Atomic Fire Switch Handler
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

  if (initError) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 font-mono p-4 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-wider text-rose-400 uppercase">
          Dataset Initialization Failed
        </div>
        <div className="text-xs text-slate-400 max-w-lg text-center bg-slate-900 border border-slate-800 p-3.5 rounded-lg leading-relaxed">
          {initError}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

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

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header
        fires={manifest.fires}
        selectedFire={selectedFire}
        onSelectFire={handleSelectFire}
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics((v) => !v)}
        isSwitchingFire={isSwitchingFire}
        isTourRunning={isTourRunning}
        onToggleTour={isTourRunning ? stopTour : startTour}
      />

      {/* Main Body View */}
      <div className="flex-1 relative overflow-hidden">
        {/* Automated Guided Presentation Demo Banner */}
        {tourStepText && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-2xl border border-amber-400/60 rounded-full px-5 py-2.5 shadow-[0_12px_40px_rgba(245,158,11,0.4)] flex items-center space-x-3 text-xs font-mono text-amber-200 ring-1 ring-amber-400/40">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="font-bold tracking-tight">{tourStepText}</span>
            <button
              onClick={stopTour}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors ml-1"
              title="End Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="relative w-full h-full overflow-hidden">
            {/* 100% Full-Screen Edge-to-Edge Map */}
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

            {/* Mode Description Toast (Top Center Pill) */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none hidden md:block">
              <div className="bg-slate-950/85 backdrop-blur-xl border border-white/[0.12] rounded-full px-4 py-1.5 shadow-2xl text-xs font-mono flex items-center space-x-2 text-slate-200 ring-1 ring-black/40">
                <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                {activeMode === 'physics' && (
                  <span>
                    <strong className="text-amber-400">Radiative Physics:</strong> VIIRS Band I4 (3.74 µm MWIR) Planck radiation spikes
                  </span>
                )}
                {activeMode === 'detection' && (
                  <span>
                    <strong className="text-emerald-400">Model Verification:</strong> True Positive (Green), False Alarm (Amber), Missed (Blue)
                  </span>
                )}
                {activeMode === 'forecast' && (
                  <span>
                    <strong className="text-orange-400">24h Spread Forecast:</strong> Probability surface vs verified actual expansion (t+1)
                  </span>
                )}
              </div>
            </div>

            {/* Floating Inspector Card (Bottom Left) */}
            {inspectedSample && (
              <div className="absolute bottom-28 left-4 z-20 max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
                <InspectorCard
                  sample={inspectedSample}
                  onClear={() => setInspectedSample(null)}
                />
              </div>
            )}

            {/* Floating Bottom Media & Comparison Dock */}
            <div className="absolute bottom-5 left-4 right-4 z-20 pointer-events-auto">
              <TimelinePlayer
                days={fireMeta.days}
                metrics={fireMetrics.days}
                currentDate={currentDate}
                onSelectDate={(d) => setCurrentDate(d)}
                predictionOpacity={layerState.predictionOpacity ?? 0.85}
                onChangePredictionOpacity={(op) => handleUpdateLayerState({ predictionOpacity: op })}
              />
            </div>

            {/* Floating Analytics Slide-Over Panel (Right Side) */}
            {showMetrics && (
              <div className="absolute top-4 right-4 bottom-24 w-full max-w-md z-30 bg-slate-950/90 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200 pointer-events-auto ring-1 ring-black/40">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>Observation Telemetry & Analytics</span>
                  </span>
                  <button
                    onClick={() => setShowMetrics(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    title="Close Analytics Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

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
