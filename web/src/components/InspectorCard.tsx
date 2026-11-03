import React from 'react';
import { Target, Thermometer, Flame, AlertCircle, Compass, Zap } from 'lucide-react';
import { InspectorSample } from '../types/contract';

interface InspectorCardProps {
  sample: InspectorSample | null;
  onClear: () => void;
}

export const InspectorCard: React.FC<InspectorCardProps> = ({ sample, onClear }) => {
  if (!sample) {
    return (
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-500 font-mono">
        <Target className="w-4 h-4 mx-auto mb-1 text-slate-600" />
        Click or hover over the map to inspect pixel radiometric telemetry
      </div>
    );
  }

  const celsius = Math.round((sample.estimatedKelvin - 273.15) * 10) / 10;
  // Progress ratio from 285K to 440K
  const tempRatio = Math.min(1.0, Math.max(0.0, (sample.estimatedKelvin - 285.0) / (440.0 - 285.0)));

  const getConfusionBadge = () => {
    switch (sample.confusionCategory) {
      case 'True Positive':
        return (
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
            True Positive (Correct Detection)
          </span>
        );
      case 'False Positive':
        return (
          <span className="bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
            False Positive (False Alarm)
          </span>
        );
      case 'False Negative':
        return (
          <span className="bg-blue-950/80 text-blue-300 border border-blue-700/80 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
            False Negative (Missed Detection)
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
            Unburned / True Negative
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-2xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-slate-200">
          <Target className="w-3.5 h-3.5 text-orange-400" />
          <span>PIXEL RADIOMETRIC INSPECTION</span>
        </div>
        <button
          onClick={onClear}
          className="text-[10px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 bg-slate-800 rounded"
        >
          Close
        </button>
      </div>

      {/* Lat / Lon / Grid Coordinates */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
        <div>
          <span className="text-slate-500 text-[10px] block">COORDINATES</span>
          <span className="text-slate-200 font-semibold">
            {sample.lat.toFixed(4)}°N, {Math.abs(sample.lng).toFixed(4)}°W
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">RASTER PIXEL</span>
          <span className="text-slate-300">
            [{sample.pixelX}, {sample.pixelY}] <span className="text-slate-500">(375m/px)</span>
          </span>
        </div>
      </div>

      {/* Temperature Gauge */}
      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Brightness Temp (VIIRS I4)</span>
          </span>
          <span className="font-mono text-sm font-bold text-amber-400">
            {sample.estimatedKelvin} K{' '}
            <span className="text-xs text-slate-400 font-normal">({celsius} °C)</span>
          </span>
        </div>

        {/* Heat Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-600 transition-all duration-300"
            style={{ width: `${tempRatio * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>Ambient (285K)</span>
          <span>Hot Scar (340K)</span>
          <span>Active Flame (440K)</span>
        </div>
      </div>

      {/* Classification & State */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Model Verification:</span>
          <div>{getConfusionBadge()}</div>
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Fuel Regime:</span>
          <span className="text-orange-400 font-semibold">{sample.fuelState}</span>
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Next-Day Spread Probability:</span>
          <span
            className={`font-bold ${
              sample.nextDayProb > 0.6
                ? 'text-rose-400'
                : sample.nextDayProb > 0.3
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {Math.round(sample.nextDayProb * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
