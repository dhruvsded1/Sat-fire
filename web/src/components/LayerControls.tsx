import React from 'react';
import {
  Layers,
  Thermometer,
  TrendingUp,
  Sliders,
  Sparkles
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
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 select-none">
      {/* Title */}
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
        <Layers className="w-4 h-4 text-orange-400" />
        <h2 className="text-xs font-mono font-semibold uppercase text-slate-200">
          Geospatial Layers &amp; Controls
        </h2>
      </div>

      {/* 1-Click Presentation Presets (For Professor Demo) */}
      <div className="bg-gradient-to-r from-orange-950/40 via-slate-950 to-slate-900 border border-orange-800/50 rounded-xl p-2.5 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-orange-400 font-bold">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Demo Presets</span>
          </span>
          <span className="text-[9px] text-slate-500 font-normal">Presentation Mode</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
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
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500 text-slate-200 transition-all text-center group shadow-md"
            title="Algorithm Verification: SWIR False-Color + Confusion Map (True Positive Green, False Alarm Amber, Missed Blue)"
          >
            <span className="text-emerald-400 font-bold text-[11px] group-hover:scale-105 transition-transform">🎯 Verify</span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">Confusion</span>
          </button>

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
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-orange-500 text-slate-200 transition-all text-center group shadow-md"
            title="24h Spread Forecast: Next-Day Probability Field + Actual Verification Perimeter"
          >
            <span className="text-orange-400 font-bold text-[11px] group-hover:scale-105 transition-transform">🔮 Forecast</span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">24h Spread</span>
          </button>

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
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-500 text-slate-200 transition-all text-center group shadow-md"
            title="Thermal Radiance: Isolates VIIRS Band I4 (3.74 um MWIR) Planck Radiance Spikes"
          >
            <span className="text-amber-400 font-bold text-[11px] group-hover:scale-105 transition-transform">🛰️ Physics</span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">Thermal IR</span>
          </button>
        </div>
      </div>

      {/* 1. Slide to Compare: Raw Satellite vs AI Prediction */}
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-orange-400 font-semibold flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Slide to Compare</span>
          </span>
          <span className="text-[10px] font-mono text-slate-300">
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
          title="Slide to compare raw satellite imagery (0%) with AI predictions (100%)"
        />

        <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-0.5">
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

      {/* 2. Base Satellite Rasters */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
          Satellite Observation Rasters
        </span>

        {/* False Color Composite */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={layerState.showComposite}
                onChange={(e) => onChangeLayerState({ showComposite: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
              />
              <span className="text-slate-200">SWIR/NIR/Red False Color</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {Math.round(layerState.compositeOpacity * 100)}%
            </span>
          </div>

          {layerState.showComposite && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layerState.compositeOpacity}
              onChange={(e) => onChangeLayerState({ compositeOpacity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
            />
          )}
        </div>

        {/* Thermal Infrared */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={layerState.showThermal}
                onChange={(e) => onChangeLayerState({ showThermal: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
              />
              <span className="text-slate-200 flex items-center space-x-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Thermal IR (I4 3.74 µm)</span>
              </span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {Math.round(layerState.thermalOpacity * 100)}%
            </span>
          </div>

          {layerState.showThermal && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layerState.thermalOpacity}
              onChange={(e) => onChangeLayerState({ thermalOpacity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
            />
          )}
        </div>
      </div>

      {/* 3. Active Fire Detection (AF) */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
          Active Fire (Flaming Perimeter)
        </span>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
          <button
            onClick={() => onChangeLayerState({ activeFireMode: 'none' })}
            className={`py-1 px-2 rounded text-xs transition-colors ${
              layerState.activeFireMode === 'none'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Off
          </button>

          <button
            onClick={() => onChangeLayerState({ activeFireMode: 'pred' })}
            className={`py-1 px-2 rounded text-xs transition-colors ${
              layerState.activeFireMode === 'pred'
                ? 'bg-orange-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prediction (Ours)
          </button>

          <button
            onClick={() => onChangeLayerState({ activeFireMode: 'gt' })}
            className={`py-1 px-2 rounded text-xs transition-colors ${
              layerState.activeFireMode === 'gt'
                ? 'bg-emerald-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ground Truth
          </button>

          <button
            onClick={() => onChangeLayerState({ activeFireMode: 'confusion' })}
            className={`py-1 px-2 rounded text-xs transition-colors ${
              layerState.activeFireMode === 'confusion'
                ? 'bg-cyan-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Confusion Map
          </button>
        </div>

        {/* Confusion Legend */}
        {layerState.activeFireMode === 'confusion' && (
          <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center space-x-2 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Correct (True Positive)</span>
            </div>
            <div className="flex items-center space-x-2 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>False Alarm (False Positive)</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Missed (False Negative)</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Cumulative Burned Area (BA) */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
          Cumulative Burned Area Scar
        </span>

        <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => onChangeLayerState({ burnedAreaMode: 'none' })}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              layerState.burnedAreaMode === 'none'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Off
          </button>
          <button
            onClick={() => onChangeLayerState({ burnedAreaMode: 'pred' })}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              layerState.burnedAreaMode === 'pred'
                ? 'bg-red-700 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Predicted Scar
          </button>
          <button
            onClick={() => onChangeLayerState({ burnedAreaMode: 'gt' })}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              layerState.burnedAreaMode === 'gt'
                ? 'bg-violet-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Actual Scar
          </button>
        </div>
      </div>

      {/* 5. Next-Day Spread Prediction */}
      <div className="bg-slate-950/70 p-3 rounded-lg border border-orange-950/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={layerState.showNextDay}
              onChange={(e) => onChangeLayerState({ showNextDay: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
            />
            <span className="text-orange-300 flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>Next-Day Spread Prediction</span>
            </span>
          </label>

          <span className="text-[10px] font-mono text-orange-400">
            {Math.round(layerState.nextDayThreshold * 100)}% prob
          </span>
        </div>

        {layerState.showNextDay && (
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Probability Threshold:</span>
                <span className="font-mono text-white">
                  &gt; {Math.round(layerState.nextDayThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={layerState.nextDayThreshold}
                onChange={(e) => onChangeLayerState({ nextDayThreshold: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>High Sensitivity (10%)</span>
                <span>Conservative (90%)</span>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={layerState.showActualNextOverlay}
                onChange={(e) => onChangeLayerState({ showActualNextOverlay: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Overlay actual next-day growth</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
