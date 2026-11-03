import React from 'react';
import { X, Satellite, Flame, ShieldAlert, Cpu, BarChart2, BookOpen, Layers } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              FireLens Scientific Methodology & TS-SatFire Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Important Transparency Notice */}
          <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold font-mono text-xs uppercase">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Simulation Transparency & Research Disclaimer</span>
            </div>
            <p className="text-amber-200/90 text-xs leading-relaxed">
              All 5 wildfire scenarios in this application are <strong>synthetically simulated</strong>{' '}
              using physics-informed cellular automata, radiative transfer equations, and digital
              elevation modeling. They reproduce realistic spatial dynamics (wind-driven elongation,
              topographic slope acceleration, cooling interior burn scars, and smoke aerosols) inspired
              by the TS-SatFire benchmark dataset. This platform is designed for research, algorithm
              comparison, and exploration—it does not claim to present real-time satellite telemetry.
            </p>
          </div>

          {/* Section 1: TS-SatFire Concept */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase text-orange-400 flex items-center space-x-1.5">
              <Satellite className="w-4 h-4" />
              <span>1. The TS-SatFire Benchmark Concept</span>
            </h3>
            <p>
              Wildfire prediction from space requires tracking fire perimeters across consecutive satellite
              overpasses. The TS-SatFire (Time-Series Satellite Fire) paradigm organizes multi-spectral
              radiometric imagery from the VIIRS (Visible Infrared Imaging Radiometer Suite) instrument
              onboard Suomi-NPP and NOAA-20/21 into aligned temporal cubes. This allows models to learn
              both static terrain fuels and dynamic atmospheric forcings across time.
            </p>
          </div>

          {/* Section 2: Sensor Physics & Radiative Transfer */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase text-orange-400 flex items-center space-x-1.5">
              <Flame className="w-4 h-4" />
              <span>2. Spectral Bands & Radiative Physics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-mono font-bold text-orange-400 block">
                  VIIRS I4 (3.74 µm MWIR)
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Mid-wave thermal channel. Highly sensitive to Planck radiance from flaming temperatures
                  (600–1200 K). Even sub-pixel fires trigger strong brightness temperature spikes.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-mono font-bold text-orange-300 block">
                  VIIRS I5 (11.45 µm LWIR)
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Long-wave thermal channel. Responds to cooler surface ambient temperatures (~300 K) and
                  smoldering embers. Used as the differential background reference.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-mono font-bold text-cyan-400 block">
                  VIIRS M11 (2.25 µm SWIR)
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Short-wave infrared. Wavelength is longer than smoke aerosol particles, penetrating thick
                  smoke columns to clearly delineate burn scars and active lines.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Baseline Algorithmic Formulations */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase text-orange-400 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4" />
              <span>3. Independent Baseline Formulations</span>
            </h3>

            <div className="space-y-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <h4 className="text-xs font-mono font-bold text-white">
                  A. Active Fire Detection (Thermal Radiative Thresholding)
                </h4>
                <p className="text-xs text-slate-400">
                  A pixel is classified as actively flaming if its Band I4 brightness temperature{' '}
                  <code className="text-orange-400">T4 &gt; 325 K</code> and exceeds the local background
                  mean by at least <code className="text-orange-400">ΔT &gt; 15 K</code>. Single-pixel
                  thermal anomalies without spatial neighbors are rejected via morphological erosion.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <h4 className="text-xs font-mono font-bold text-white">
                  B. Cumulative Burned Area Mapping
                </h4>
                <p className="text-xs text-slate-400">
                  Because satellite detection may momentarily miss smoldering cells obscured by clouds,
                  the burned area accumulator takes the temporal union of all active fire detections over
                  days 1 through T, followed by morphological closing to consolidate interior scars.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <h4 className="text-xs font-mono font-bold text-white">
                  C. Next-Day Spread Prediction (Directional Advection-Diffusion)
                </h4>
                <p className="text-xs text-slate-400">
                  Analyzes fire front displacement over the preceding 3–5 days to derive an average
                  advancement velocity vector <code className="text-orange-400">v_adv</code>. An
                  anisotropic Gaussian diffusion kernel oriented downwind and adjusted for slope gradient
                  is applied to the current perimeter, outputting a continuous probability map (0–255).
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Evaluation Metrics */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase text-orange-400 flex items-center space-x-1.5">
              <BarChart2 className="w-4 h-4" />
              <span>4. Evaluation Metrics</span>
            </h3>
            <p className="text-xs text-slate-400">
              Predictions are quantitatively evaluated against ground truth masks using standard spatial
              overlap metrics:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <strong>Precision:</strong> TP / (TP + FP)
              </div>
              <div>
                <strong>Recall:</strong> TP / (TP + FN)
              </div>
              <div>
                <strong>F1-Score:</strong> 2 · (P · R) / (P + R)
              </div>
              <div>
                <strong>IoU (Jaccard):</strong> TP / (TP + FP + FN)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
