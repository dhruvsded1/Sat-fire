import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3, Radio, Sparkles } from 'lucide-react';
import { ImportanceData } from '../types/contract';

interface FeatureImportanceProps {
  importanceData: ImportanceData | null;
}

const COLORS = [
  '#ea580c', // I4 Thermal
  '#f97316', // I5 Thermal
  '#fb923c', // M11 SWIR
  '#f59e0b', // I1 Red
  '#10b981', // I2 NIR
  '#06b6d4', // I3 SWIR
  '#38bdf8', // Wind Speed
  '#818cf8', // Relative Humidity
  '#a855f7'  // DEM Terrain
];

export const FeatureImportance: React.FC<FeatureImportanceProps> = ({ importanceData }) => {
  if (!importanceData) return null;

  const totalDrop = importanceData.reduce((acc, item) => acc + item.f1_drop, 0);

  const enhancedFeatures = importanceData.map((item, idx) => {
    const relWeight =
      totalDrop > 0 ? Math.round((item.f1_drop / totalDrop) * 1000) / 10 : 0;

    let desc = 'Contributes to multi-spectral fire detection and next-day spread dynamics.';
    if (item.channel.includes('I4')) {
      desc =
        'Mid-wave infrared (3.74 um). Crucial for active flaming combustion detection via intense Planck emission radiance spikes.';
    } else if (item.channel.includes('I5')) {
      desc =
        'Long-wave infrared (11.45 um). Sensitive to smoldering embers, cooler ground temperatures, and background radiometric contrast.';
    } else if (item.channel.includes('M11')) {
      desc =
        'Short-wave infrared (2.25 um). Penetrates thick smoke aerosol columns to sharply image active perimeter lines and severe burn scars.';
    } else if (item.channel.includes('Wind')) {
      desc =
        'Atmospheric 10m wind velocity vector. Directly governs convective head-fire acceleration, flame tilt, and downwind propagation.';
    } else if (item.channel.includes('Humidity')) {
      desc =
        'Surface relative humidity. Strongly impacts fine dead fuel moisture and ignition ease along advancing perimeters.';
    } else if (item.channel.includes('DEM')) {
      desc =
        'Digital Elevation Model slope and aspect. Steep canyons accelerate fire propagation upslope via radiative and convective preheating.';
    } else if (item.channel.includes('NIR') || item.channel.includes('I2')) {
      desc =
        'Near-infrared reflection (0.86 um). Sensitive to live vegetative biomass and chlorophyll absorption; drops sharply upon canopy combustion.';
    } else if (item.channel.includes('Red') || item.channel.includes('I1')) {
      desc =
        'Red visible band (0.64 um). Complements false-color visual mapping and background surface albedo differentiation.';
    }

    return {
      ...item,
      relWeight,
      desc
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono uppercase text-orange-400 mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>SATELLITE SPECTRAL SENSITIVITY</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Spectral Channel & Permutation Feature Importance
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Quantification of predictive degradation (ΔF1 score drop) when individual satellite radiometric
          bands, meteorological forcings, and topographic channels are zeroed in the TS-SatFire model.
        </p>
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2 font-mono text-xs text-slate-300">
            <Radio className="w-4 h-4 text-orange-400" />
            <span className="font-semibold uppercase">Permutation F1-Score Drop by Channel</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Higher Drop = Higher Criticality</span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enhancedFeatures}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 'dataMax + 0.02']}
                stroke="#475569"
                fontSize={10}
                tickFormatter={(val) => `ΔF1 -${val.toFixed(3)}`}
              />
              <YAxis
                type="category"
                dataKey="channel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                width={175}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fff'
                }}
                formatter={(val: any) => [`-${val} ΔF1`, 'Permutation Impact']}
              />
              <Bar dataKey="f1_drop" name="F1 Drop" radius={[0, 4, 4, 0]}>
                {enhancedFeatures.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Physics Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enhancedFeatures.map((feat, idx) => (
          <div
            key={feat.channel}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-xs font-mono text-orange-400 font-bold">
                  {feat.relWeight}% Relative Impact
                </span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono mt-1.5">{feat.channel}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-2">{feat.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Metric Drop:</span>
              <span className="text-rose-400 font-semibold">-{(feat.f1_drop * 100).toFixed(1)}% F1</span>
            </div>
          </div>
        ))}
      </div>

      {/* Physics Radiative Transfer Callout */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 space-y-2">
        <h4 className="font-mono font-bold text-white uppercase flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Radiometric Physical Principles (TS-SatFire Radiative Formulation)</span>
        </h4>
        <p className="leading-relaxed text-slate-400">
          According to <strong>Wien&apos;s Displacement Law</strong> (λ_max · T = 2898 µm·K),
          the peak spectral radiance emitted by flaming combustion (typically 600 K to 1200 K) occurs between
          2.4 µm and 4.8 µm. This explains why <strong>VIIRS Band I4 (3.74 µm Mid-Wave Infrared)</strong>{' '}
          exhibits the largest single F1 drop: even sub-pixel flaming fronts radiate intense energy in the 3.74 µm
          window, providing decisive firefront delineation compared to solar reflectance alone.
        </p>
      </div>
    </div>
  );
};
