import React, { useState } from 'react';
import {
  Layers,
  Thermometer,
  TrendingUp,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { LayerState } from '../types/contract';

interface LayerControlsProps {
  layerState: LayerState;
  onChangeLayerState: (newState: Partial<LayerState>) => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  layerState,
  onChangeLayerState
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Active preset detection
  const isVerify =
    layerState.activeFireMode === 'confusion' &&
    layerState.showComposite &&
    !layerState.showThermal &&
    !layerState.showNextDay;

  const isForecast =
    layerState.showNextDay &&
    layerState.showActualNextOverlay &&
    layerState.activeFireMode === 'none';

  const isPhysics =
    layerState.showThermal &&
    !layerState.showComposite &&
    layerState.activeFireMode === 'pred';

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3.5 select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Presentation Modes
          </h2>
        </div>
        <button
          onClick={() =>
            onChangeLayerState({
              showComposite: true,
              compositeOpacity: 0.9,
              showThermal: false,
              activeFireMode: 'confusion',
              burnedAreaMode: 'none',
              showNextDay: true,
              nextDayThreshold: 0.35,
              showActualNextOverlay: false,
              predictionOpacity: 0.85
            })
          }
          className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
          title="Reset to default presentation layout"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1-Click Presentation Presets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 font-semibold">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Select Focus For Demo:</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Verify Preset */}
          <button
            onClick={() =>
              onChangeLayerState({
                showComposite: true,
                compositeOpacity: 0.9,
                showThermal: false,
                activeFireMode: 'confusion',
                burnedAreaMode: 'none',
                showNextDay: false,
                predictionOpacity: 0.85
              })
            }
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center group ${
              isVerify
                ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-950/50'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-emerald-400 font-bold text-xs group-hover:scale-105 transition-transform">
              🎯 Verify
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">Confusion Map</span>
          </button>

          {/* Forecast Preset */}
          <button
            onClick={() =>
              onChangeLayerState({
                showComposite: true,
                compositeOpacity: 0.85,
                showThermal: false,
                activeFireMode: 'none',
                burnedAreaMode: 'none',
                showNextDay: true,
                nextDayThreshold: 0.35,
                showActualNextOverlay: true,
                predictionOpacity: 0.9
              })
            }
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center group ${
              isForecast
                ? 'bg-orange-950/80 border-orange-500 shadow-md shadow-orange-950/50'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-orange-400 font-bold text-xs group-hover:scale-105 transition-transform">
              🔮 Forecast
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">24h Spread</span>
          </button>

          {/* Physics Preset */}
          <button
            onClick={() =>
              onChangeLayerState({
                showComposite: false,
                showThermal: true,
                thermalOpacity: 0.95,
                activeFireMode: 'pred',
                burnedAreaMode: 'none',
                showNextDay: false,
                predictionOpacity: 0.8
              })
            }
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center group ${
              isPhysics
                ? 'bg-amber-950/80 border-amber-500 shadow-md shadow-amber-950/50'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-amber-400 font-bold text-xs group-hover:scale-105 transition-transform">
              🛰️ Physics
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">Thermal IR</span>
          </button>
        </div>

        {/* Dynamic Mode Explanatory Pill */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-2 text-[10px] text-slate-400 font-mono leading-tight">
          {isVerify && (
            <p className="text-emerald-300/90 flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Verification Mode:</strong> SWIR false-color penetration with True Positives (Green), False Alarms (Amber), and Missed Fronts (Blue).
              </span>
            </p>
          )}
          {isForecast && (
            <p className="text-orange-300/90 flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>Spread Forecast:</strong> 24h forward probability field compared against verified next-day perimeter growth.
              </span>
            </p>
          )}
          {isPhysics && (
            <p className="text-amber-300/90 flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Radiative Physics:</strong> Isolates VIIRS Band I4 (3.74 µm MWIR) Planck radiation spikes from flaming combustion.
              </span>
            </p>
          )}
          {!isVerify && !isForecast && !isPhysics && (
            <p className="text-slate-400">
              Active configuration: Custom multi-layer composite view.
            </p>
          )}
        </div>
      </div>

      {/* Slide to Compare: Raw Satellite vs AI Prediction */}
      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[10px] uppercase text-orange-400 font-semibold flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Slide to Compare</span>
          </span>
          <span className="text-[10px] text-slate-300">
            {Math.round((layerState.predictionOpacity ?? 0.85) * 100)}% AI Overlay
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layerState.predictionOpacity ?? 0.85}
          onChange={(e) => onChangeLayerState({ predictionOpacity: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
          title="Drag left for raw satellite only, drag right for full AI model overlay"
        />

        <div className="flex justify-between text-[9px] font-mono text-slate-400">
          <button
            onClick={() => onChangeLayerState({ predictionOpacity: 0 })}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors ${
              (layerState.predictionOpacity ?? 0.85) === 0 ? 'text-orange-400 font-bold bg-slate-800' : ''
            }`}
          >
            Raw Satellite
          </button>
          <button
            onClick={() => onChangeLayerState({ predictionOpacity: 0.85 })}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors ${
              (layerState.predictionOpacity ?? 0.85) === 0.85 ? 'text-orange-400 font-bold bg-slate-800' : ''
            }`}
          >
            Balanced
          </button>
          <button
            onClick={() => onChangeLayerState({ predictionOpacity: 1 })}
            className={`px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors ${
              (layerState.predictionOpacity ?? 0.85) === 1 ? 'text-orange-400 font-bold bg-slate-800' : ''
            }`}
          >
            AI Overlay
          </button>
        </div>
      </div>

      {/* Primary Toggles (Simplified) */}
      <div className="space-y-2">
        {/* Active Fire Mode Selector */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
            Active Fire Segmentation
          </span>
          <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onChangeLayerState({ activeFireMode: 'none' })}
              className={`py-1 text-[11px] font-mono rounded transition-colors ${
                layerState.activeFireMode === 'none'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Off
            </button>
            <button
              onClick={() => onChangeLayerState({ activeFireMode: 'pred' })}
              className={`py-1 text-[11px] font-mono rounded transition-colors ${
                layerState.activeFireMode === 'pred'
                  ? 'bg-orange-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Model
            </button>
            <button
              onClick={() => onChangeLayerState({ activeFireMode: 'gt' })}
              className={`py-1 text-[11px] font-mono rounded transition-colors ${
                layerState.activeFireMode === 'gt'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Actual
            </button>
            <button
              onClick={() => onChangeLayerState({ activeFireMode: 'confusion' })}
              className={`py-1 text-[11px] font-mono rounded transition-colors ${
                layerState.activeFireMode === 'confusion'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Verify
            </button>
          </div>
        </div>

        {/* 24h Forward Spread Toggle */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={layerState.showNextDay}
                onChange={(e) => onChangeLayerState({ showNextDay: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
              />
              <span className="text-orange-300 flex items-center space-x-1.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                <span>Next-Day Spread Forecast</span>
              </span>
            </label>
            <span className="text-[10px] font-mono text-orange-400">
              &gt;{Math.round(layerState.nextDayThreshold * 100)}% prob
            </span>
          </div>

          {layerState.showNextDay && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={layerState.nextDayThreshold}
                  onChange={(e) => onChangeLayerState({ nextDayThreshold: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <label className="flex items-center space-x-2 text-[10px] font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layerState.showActualNextOverlay}
                  onChange={(e) => onChangeLayerState({ showActualNextOverlay: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Overlay actual verified perimeter (t+1)</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Granular Tuner (Collapsible Accordion) */}
      <div className="pt-1 border-t border-slate-800/80">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center justify-between w-full text-[10px] font-mono text-slate-400 hover:text-slate-200 py-1 transition-colors"
        >
          <span className="flex items-center space-x-1 font-semibold uppercase">
            {showAdvanced ? <ChevronDown className="w-3.5 h-3.5 text-orange-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>Fine-Grained Layer Tuner</span>
          </span>
          <span className="text-[9px] text-slate-500">{showAdvanced ? 'Collapse' : 'Expand'}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-150">
            {/* Satellite Rasters */}
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={layerState.showComposite}
                    onChange={(e) => onChangeLayerState({ showComposite: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
                  />
                  <span>SWIR Smoke Penetration</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {Math.round(layerState.compositeOpacity * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={layerState.showThermal}
                    onChange={(e) => onChangeLayerState({ showThermal: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="flex items-center space-x-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    <span>Thermal IR (I4 3.74 µm)</span>
                  </span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {Math.round(layerState.thermalOpacity * 100)}%
                </span>
              </div>
            </div>

            {/* Burned Scar Mode */}
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Cumulative Burn Scar
              </span>
              <div className="flex bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => onChangeLayerState({ burnedAreaMode: 'none' })}
                  className={`flex-1 py-1 rounded transition-colors ${
                    layerState.burnedAreaMode === 'none'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Off
                </button>
                <button
                  onClick={() => onChangeLayerState({ burnedAreaMode: 'pred' })}
                  className={`flex-1 py-1 rounded transition-colors ${
                    layerState.burnedAreaMode === 'pred'
                      ? 'bg-red-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Model
                </button>
                <button
                  onClick={() => onChangeLayerState({ burnedAreaMode: 'gt' })}
                  className={`flex-1 py-1 rounded transition-colors ${
                    layerState.burnedAreaMode === 'gt'
                      ? 'bg-purple-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Actual
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
