import React from 'react';
import {
  Flame,
  BarChart3,
  BookOpen,
  Loader2,
  Sparkles,
  Thermometer,
  TrendingUp,
  Target,
  Radio
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
  isTourRunning?: boolean;
  onToggleTour?: () => void;
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
  isSwitchingFire = false,
  isTourRunning = false,
  onToggleTour
}) => {
  return (
    <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-2 flex items-center justify-between select-none z-30 sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {/* Left: Brand & Telemetry Beacon */}
      <div className="flex items-center space-x-3.5">
        {/* Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-white/20">
            <Flame className="w-5 h-5 text-slate-950 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wider text-white font-mono">
                FIRE<span className="text-orange-500">LENS</span>
              </span>
              {/* Telemetry Status Beacon */}
              <div className="hidden lg:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="font-semibold tracking-wide">VIIRS 375m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-800/80 hidden sm:block" />

        {/* Wildfire Selector Pill */}
        <div className="relative">
          <select
            value={selectedFire?.id || ''}
            disabled={isSwitchingFire}
            onChange={(e) => {
              const f = fires.find((x) => x.id === e.target.value);
              if (f) onSelectFire(f);
            }}
            aria-label="Select Wildfire Event"
            className="bg-slate-900/90 hover:bg-slate-850 disabled:opacity-50 border border-white/10 hover:border-orange-500/50 text-slate-200 text-xs rounded-full px-3.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium cursor-pointer transition-all shadow-sm"
          >
            {fires.map((fire) => (
              <option key={fire.id} value={fire.id}>
                📍 [{fire.state}] {fire.name} — {fire.start} → {fire.end}
              </option>
            ))}
          </select>
          {isSwitchingFire && (
            <div className="absolute right-3 top-2 pointer-events-none">
              <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Center: The Big 3 Presentation Modes (Sharp Segmented Controller) */}
      {activeTab === 'explorer' ? (
        <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-full border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
          {/* Mode 1: Physics */}
          <button
            onClick={() => onSelectMode('physics')}
            className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-mono transition-all ${
              activeMode === 'physics'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Isolate VIIRS Band I4 (3.74 µm) Planck Radiance Spikes"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>1. Thermal IR</span>
          </button>

          {/* Mode 2: Detection */}
          <button
            onClick={() => onSelectMode('detection')}
            className={`flex items-center space-x-1.5 px-4 py-1 rounded-full text-xs font-mono transition-all ${
              activeMode === 'detection'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Algorithm Verification: SWIR False Color + Confusion Map (Green = TP, Amber = FP, Blue = FN)"
          >
            <Target className="w-3.5 h-3.5" />
            <span>2. AI Detection</span>
          </button>

          {/* Mode 3: Forecast */}
          <button
            onClick={() => onSelectMode('forecast')}
            className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-mono transition-all ${
              activeMode === 'forecast'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="24h Spread Probability Surface & Verified Actual Next-Day Expansion"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>3. 24h Forecast</span>
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>TS-SatFire Official Benchmark Evaluation</span>
        </div>
      )}

      {/* Right: Navigation Tabs & Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-full border border-white/10 shadow-inner">
          <button
            onClick={() => onChangeTab('explorer')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'explorer'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => onChangeTab('benchmarks')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'benchmarks'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => onChangeTab('importance')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'importance'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Features
          </button>
        </div>

        {/* Analytics Drawer Toggle */}
        {activeTab === 'explorer' && (
          <button
            onClick={onToggleMetrics}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              showMetrics
                ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/30'
                : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-orange-500/40 hover:text-white'
            }`}
            title="Toggle Right Analytics Drawer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        )}

        {/* Auto Demo Tour */}
        {activeTab === 'explorer' && onToggleTour && (
          <button
            onClick={onToggleTour}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all border ${
              isTourRunning
                ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse shadow-lg shadow-amber-500/40'
                : 'text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 shadow-sm hover:scale-105'
            }`}
            title="Automated 1-Click Guided Presentation Tour for Professor"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="hidden sm:inline">{isTourRunning ? 'Stop Demo' : 'Auto Demo'}</span>
          </button>
        )}

        {/* Academic Briefing Modal Button */}
        <button
          onClick={onOpenMethodology}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-orange-200 hover:text-white bg-orange-950/60 hover:bg-orange-900/80 border border-orange-800/80 transition-all shadow-sm hover:shadow-orange-900/40 hover:scale-102"
          title="Open Academic Defense Script & Methodology"
        >
          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline font-semibold">Academic Guide</span>
        </button>
      </div>
    </header>
  );
};
