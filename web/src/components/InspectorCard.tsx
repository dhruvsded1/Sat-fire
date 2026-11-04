import React from 'react';
import { Target, Thermometer, X, Flame, ShieldAlert } from 'lucide-react';
import { InspectorSample } from '../types/contract';

interface InspectorCardProps {
  sample: InspectorSample | null;
  onClear: () => void;
}

export const InspectorCard: React.FC<InspectorCardProps> = ({ sample, onClear }) => {
  if (!sample) return null;

  const celsius = Math.round((sample.estimatedKelvin - 273.15) * 10) / 10;
  // Progress ratio from 285K to 440K
  const tempRatio = Math.min(1.0, Math.max(0.0, (sample.estimatedKelvin - 285.0) / (440.0 - 285.0)));

  const getConfusionBadge = () => {
    switch (sample.confusionCategory) {
      case 'True Positive':
        return (
          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            ● True Positive (Detected Front)
          </span>
        );
      case 'False Positive':
        return (
          <span className="bg-amber-950/90 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            ▲ False Alarm (Edge Anomaly)
          </span>
        );
      case 'False Negative':
        return (
          <span className="bg-blue-950/90 text-blue-300 border border-blue-500/50 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            ■ Missed (Smoke Obscuration)
          </span>
        );
      default:
        return (
          <span className="bg-slate-900 text-slate-400 border border-slate-700/80 px-2 py-0.5 rounded-full text-[10px] font-mono">
            Unburned Background
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-3 select-none text-slate-200 ring-1 ring-black/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-white">
          <Target className="w-3.5 h-3.5 text-orange-400" />
          <span className="tracking-wider">PIXEL RADIOMETRY</span>
        </div>
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          title="Dismiss Pixel Inspection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lat / Lon / Raster Coordinates */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-xl border border-white/[0.06] shadow-inner">
        <div>
          <span className="text-slate-400 text-[10px] block uppercase font-medium">COORDINATES</span>
          <span className="text-white font-bold tracking-tight">
            {sample.lat.toFixed(4)}°N, {Math.abs(sample.lng).toFixed(4)}°W
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block uppercase font-medium">GRID CELL</span>
          <span className="text-slate-200 font-bold">
            [{sample.pixelX}, {sample.pixelY}] <span className="text-slate-500 font-normal">(375m)</span>
          </span>
        </div>
      </div>

      {/* Brightness Temperature Gauge */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06] space-y-2 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium flex items-center space-x-1.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>VIIRS I4 Radiance Temp</span>
          </span>
          <span className="font-mono text-sm font-extrabold text-amber-400 tracking-tight">
            {sample.estimatedKelvin} K{' '}
            <span className="text-xs text-slate-400 font-normal">({celsius} °C)</span>
          </span>
        </div>

        {/* Heat Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-600 transition-all duration-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            style={{ width: `${tempRatio * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400">
          <span>Ambient (285K)</span>
          <span>Hot Scar (340K)</span>
          <span>Flame (440K)</span>
        </div>
      </div>

      {/* Verification & Prediction Risk */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Detection State:</span>
          <div>{getConfusionBadge()}</div>
        </div>

        <div className="flex items-center justify-between font-mono">
          <span className="text-slate-400 font-medium">Fuel Condition:</span>
          <span className="text-orange-400 font-bold">{sample.fuelState}</span>
        </div>

        <div className="flex items-center justify-between font-mono">
          <span className="text-slate-400 font-medium">Next-Day Spread Probability:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-full ${
              sample.nextDayProb > 0.6
                ? 'bg-rose-950/80 text-rose-300 border border-rose-600/40'
                : sample.nextDayProb > 0.3
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                : 'text-slate-300'
            }`}
          >
            {Math.round(sample.nextDayProb * 100)}%
          </span>
        </div>
      </div>

      {/* Radiative Transfer Physics Note */}
      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-orange-500/20 text-[10px] text-slate-400 font-mono leading-tight space-y-1">
        <div className="text-orange-400 font-bold uppercase text-[9px] flex items-center space-x-1">
          <Flame className="w-3 h-3 text-orange-400" />
          <span>Radiative Physics Basis</span>
        </div>
        <p className="leading-relaxed">
          Wien&apos;s Law (λ_peak · T ≈ 2898 µm·K): Flaming fire fronts (700–1200 K) emit Planck radiance peaking in the MWIR band (2.4–4.1 µm), detected by VIIRS Band I4 (3.74 µm).
        </p>
      </div>
    </div>
  );
};
