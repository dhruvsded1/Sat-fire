import React from 'react';
import {
  Flame,
  BarChart3,
  BookOpen,
  Loader2,
  Sparkles,
  Thermometer,
  TrendingUp,
  Target
} from 'lucide-react';
import { ManifestFire } from '../types/contract';

export type PresentationMode = 'physics' | 'detection' | 'forecast';

interface HeaderProps {
  fires: ManifestFire[];
  selectedFire: ManifestFire | null;
  onSelectFire: (fire: ManifestFire) => void;
  activeTab: 'explorer' | 'benchmarks' | 'importance';
  onChangeTab: (tab: 'explorer' | 'benchmarks' | 'importance') => void;
  activeMode: PresentationMode;
  onSelectMode: (mode: PresentationMode) => void;
  onOpenMethodology: () => void;
  showMetrics: boolean;
  onToggleMetrics: () => void;
  isSwitchingFire?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fires,
  selectedFire,
  activeTab,
  onChangeTab,
  activeMode,
  onSelectMode,
  onOpenMethodology,
  onSelectFire,
  showMetrics,
  onToggleMetrics,
  isSwitchingFire = false
}) => {
  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between select-none z-30 sticky top-0">
      {/* Left: Brand + Wildfire Scenario Selector */}
      <div className="flex items-center space-x-3">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-base tracking-wider text-slate-100 font-mono">
              FIRE<span className="text-orange-500">LENS</span>
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Wildfire Event Dropdown */}
        <div className="relative">
          <select
            value={selectedFire?.id || ''}
            disabled={isSwitchingFire}
            onChange={(e) => {
              const f = fires.find((x) => x.id === e.target.value);
              if (f) onSelectFire(f);
            }}
            aria-label="Select Wildfire Event"
            className="bg-slate-900 hover:bg-slate-800/90 disabled:opacity-50 border border-slate-700/80 text-slate-200 text-xs rounded-full px-3 py-1.5 pr-8 focus:outline-none focus:border-orange-500 font-medium cursor-pointer transition-colors shadow-sm"
          >
            {fires.map((fire) => (
              <option key={fire.id} value={fire.id}>
                📍 [{fire.state}] {fire.name} ({fire.start} → {fire.end})
              </option>
            ))}
          </select>
          {isSwitchingFire && (
            <div className="absolute right-2.5 top-2 pointer-events-none">
              <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Center: The Big 3 Presentation Modes (Visible on Map tab) */}
      {activeTab === 'explorer' ? (
        <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-full border border-slate-800 shadow-inner">
          <button
            onClick={() => onSelectMode('physics')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
              activeMode === 'physics'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Isolate VIIRS Band I4 (3.74 µm) Planck Thermal Radiance"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>1. Thermal IR</span>
          </button>

          <button
            onClick={() => onSelectMode('detection')}
            className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-medium transition-all ${
              activeMode === 'detection'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Algorithm Verification: False Color + Confusion Matrix (TP Green, FP Amber, FN Blue)"
          >
            <Target className="w-3.5 h-3.5" />
            <span>2. AI Detection</span>
          </button>

          <button
            onClick={() => onSelectMode('forecast')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
              activeMode === 'forecast'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="24h Spread Forecasting Surface & Verified Actual Next-Day Perimeter"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>3. 24h Forecast</span>
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>TS-SatFire Official Benchmark Results</span>
        </div>
      )}

      {/* Right: Tab Navigation & Modals */}
      <div className="flex items-center space-x-2">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onChangeTab('explorer')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'explorer'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => onChangeTab('benchmarks')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'benchmarks'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => onChangeTab('importance')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'importance'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Features
          </button>
        </div>

        {/* Analytics Toggle Button (Map tab only) */}
        {activeTab === 'explorer' && (
          <button
            onClick={onToggleMetrics}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono border transition-all ${
              showMetrics
                ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle Analytics Drawer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        )}

        {/* Academic Briefing Modal Button */}
        <button
          onClick={onOpenMethodology}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono text-orange-300 hover:text-white bg-orange-950/40 hover:bg-orange-900/60 border border-orange-800/80 transition-all shadow-sm"
          title="Open Academic Defense Script & Sensor Methodology"
        >
          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline">Guide</span>
        </button>
      </div>
    </header>
  );
};
