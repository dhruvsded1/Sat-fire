import React from 'react';
import { Flame, Layers, BarChart3, HelpCircle, Cpu, Loader2 } from 'lucide-react';
import { ManifestFire } from '../types/contract';

interface HeaderProps {
  fires: ManifestFire[];
  selectedFire: ManifestFire | null;
  onSelectFire: (fire: ManifestFire) => void;
  activeTab: 'explorer' | 'benchmarks' | 'importance';
  onChangeTab: (tab: 'explorer' | 'benchmarks' | 'importance') => void;
  onOpenMethodology: () => void;
  showMetrics?: boolean;
  onToggleMetrics?: () => void;
  isSwitchingFire?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fires,
  selectedFire,
  activeTab,
  onChangeTab,
  onOpenMethodology,
  onSelectFire,
  showMetrics = true,
  onToggleMetrics,
  isSwitchingFire = false
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none z-30">
      {/* Brand & Telemetry Badge */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wider text-slate-100 font-mono">
                FIRE<span className="text-orange-500">LENS</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-800/60">
                TS-SatFire Explorer
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Interactive Wildfire Detection &amp; Next-Day Prediction
            </p>
          </div>
        </div>

        {/* Scenario Selector Dropdown */}
        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block" />

        <div className="relative">
          <label className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5 flex items-center space-x-1">
            <span>Wildfire Event ({fires.length} Available)</span>
            {isSwitchingFire && <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />}
          </label>
          <select
            value={selectedFire?.id || ''}
            disabled={isSwitchingFire}
            onChange={(e) => {
              const f = fires.find((x) => x.id === e.target.value);
              if (f) onSelectFire(f);
            }}
            aria-label="Wildfire Event"
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 pr-7 focus:outline-none focus:border-orange-500 font-medium cursor-pointer transition-colors"
          >
            {fires.map((fire) => (
              <option key={fire.id} value={fire.id}>
                {fire.name} ({fire.state}) — {fire.start} to {fire.end}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => onChangeTab('explorer')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            activeTab === 'explorer'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Geospatial Map</span>
        </button>

        <button
          onClick={() => onChangeTab('benchmarks')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            activeTab === 'benchmarks'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Model Benchmarks</span>
        </button>

        <button
          onClick={() => onChangeTab('importance')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
            activeTab === 'importance'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Feature Importance</span>
        </button>
      </div>

      {/* Guide, Metrics Toggle */}
      <div className="flex items-center space-x-2">
        {activeTab === 'explorer' && onToggleMetrics && (
          <button
            onClick={onToggleMetrics}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              showMetrics
                ? 'bg-orange-950/80 text-orange-300 border-orange-700/80 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Toggle Right Telemetry & Metrics Panel"
          >
            <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">{showMetrics ? 'Hide Metrics' : 'Show Metrics'}</span>
          </button>
        )}

        <button
          onClick={onOpenMethodology}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          title="Methodology, Sensors & Algorithm Formulation"
        >
          <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline">Methodology &amp; Guide</span>
        </button>
      </div>
    </header>
  );
};
