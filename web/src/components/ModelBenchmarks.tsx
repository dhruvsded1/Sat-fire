import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Cpu, Award, Zap, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { ModelsContract, ModelItem } from '../types/contract';

interface ModelBenchmarksProps {
  modelsData: ModelsContract | null;
}

export const ModelBenchmarks: React.FC<ModelBenchmarksProps> = ({ modelsData }) => {
  if (!modelsData) return null;

  const modelEntries = Object.entries(modelsData.models).map(([key, item]) => {
    let latency = 2.4;
    let params = '0 (Rule)';
    let role = 'Operational Baseline';
    let desc =
      'Thresholding rule on VIIRS Band I4 (3.74 um MWIR) brightness temperature (>= 328K) with spatial neighborhood confirmation.';

    if (key === 'ours') {
      latency = 18.5;
      params = '1.8M';
      role = 'FireLens U-Net (Ours)';
      desc =
        'Lightweight 2-day temporal context U-Net with multi-spectral satellite embeddings (I4, I5, M11) and meteorological wind vectors, trained for rapid deployment.';
    } else if (key === 'paper') {
      latency = 68.0;
      params = '24.5M';
      role = 'Published SOTA Benchmark';
      desc =
        'Full SwinUNETR-3D spatial-temporal transformer architecture from the TS-SatFire paper (Zhao, Gerard & Ban, Sci. Data 2025). High accuracy with heavy GPU memory requirements.';
    }

    return {
      id: key,
      name: item.name,
      role,
      latency,
      params,
      desc,
      f1_af: item.af?.f1 ?? 0,
      iou_af: item.af?.iou ?? 0,
      f1_ba: item.ba?.f1 ?? 0,
      iou_ba: item.ba?.iou ?? 0,
      f1_next: item.prediction?.f1 ?? 0,
      iou_next: item.prediction?.iou ?? 0
    };
  });

  const [selectedId, setSelectedId] = useState<string>('ours');
  const selectedModel = modelEntries.find((m) => m.id === selectedId) || modelEntries[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono uppercase text-orange-400 mb-1">
          <Cpu className="w-4 h-4" />
          <span>ALGORITHM EVALUATION BENCHMARK</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Wildfire Detection & Next-Day Prediction Benchmark
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Empirical comparison between the Radiometric Threshold Baseline, our trained FireLens U-Net,
          and the published TS-SatFire benchmark paper (Zhao, Gerard &amp; Ban, <em>Sci. Data</em> 2025).
        </p>
      </div>

      {/* Main Benchmark Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono text-xs text-slate-300">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="font-semibold uppercase">Official TS-SatFire Benchmark Comparison</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Contract Version: {modelsData.contract_version}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-right">Active Fire F1</th>
                <th className="py-3 px-3 text-right">Active Fire IoU</th>
                <th className="py-3 px-3 text-right">Burned Scar F1</th>
                <th className="py-3 px-3 text-right text-orange-400">Next-Day F1</th>
                <th className="py-3 px-3 text-right text-orange-400">Next-Day IoU</th>
                <th className="py-3 px-3 text-right">Inference (ms)</th>
                <th className="py-3 px-3 text-right">Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {modelEntries.map((m) => {
                const isSelected = selectedId === m.id;
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-950/30 text-white'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold flex items-center space-x-2">
                      {m.id === 'ours' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-950 text-orange-300 border border-orange-800">
                          FireLens U-Net
                        </span>
                      ) : m.id === 'baseline' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                          Baseline
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Paper SOTA
                        </span>
                      )}
                      <span>{m.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{m.role}</td>
                    <td className="py-3 px-3 text-right font-semibold text-cyan-400">
                      {(m.f1_af * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {(m.iou_af * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {(m.f1_ba * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-orange-400">
                      {(m.f1_next * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-orange-300">
                      {(m.iou_next * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">{m.latency} ms</td>
                    <td className="py-3 px-3 text-right text-slate-400">{m.params}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Model Detail */}
      {selectedModel && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase text-orange-400">ARCHITECTURE PROFILE</span>
              <h3 className="text-lg font-bold text-white font-mono mt-0.5">{selectedModel.name}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {selectedModel.role}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">
                Latency: {selectedModel.latency} ms
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">{selectedModel.desc}</p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next-Day Spread Prediction Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Next-Day Fire Spread Prediction (F1 & IoU)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modelEntries}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 1.0]} stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="f1_next" name="Next-Day F1" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="iou_next" name="Next-Day IoU" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Fire Detection Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Fire Detection Accuracy (F1 & IoU)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modelEntries}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 1.0]} stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="f1_af" name="Active Fire F1" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="iou_af" name="Active Fire IoU" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
