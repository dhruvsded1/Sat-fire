import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Sliders, Zap, Flame, Calendar } from 'lucide-react';
import { DayMetric } from '../types/contract';

interface TimelinePlayerProps {
  days: string[];
  metrics: DayMetric[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  predictionOpacity: number;
  onChangePredictionOpacity: (opacity: number) => void;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  days,
  metrics,
  currentDate,
  onSelectDate,
  predictionOpacity,
  onChangePredictionOpacity
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const timerRef = useRef<number | null>(null);

  const currentIndex = Math.max(0, days.indexOf(currentDate));
  const currentMetric = metrics.find((m) => m.date === currentDate) || metrics[currentIndex];

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(300, 1500 / speed);
      timerRef.current = window.setInterval(() => {
        const nextIdx = (currentIndexRef.current + 1) % days.length;
        onSelectDate(days[nextIdx]);
      }, delay);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, days, onSelectDate]);

  const handleStepBack = () => {
    if (currentIndex > 0) onSelectDate(days[currentIndex - 1]);
  };

  const handleStepForward = () => {
    if (currentIndex < days.length - 1) onSelectDate(days[currentIndex + 1]);
  };

  const toggleSpeed = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  // Progress percentage
  const timelineProgress = days.length > 1 ? (currentIndex / (days.length - 1)) * 100 : 0;

  return (
    <div className="bg-slate-950/85 backdrop-blur-2xl border border-white/[0.12] rounded-2xl px-5 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-3 max-w-2xl mx-auto select-none ring-1 ring-black/40">
      {/* Row 1: Time Player Scrubber */}
      <div className="flex items-center space-x-3.5">
        {/* Playback Button Group */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleStepBack}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-full text-slate-400 hover:text-white disabled:opacity-25 disabled:pointer-events-none hover:bg-white/10 transition-colors"
            title="Previous Day"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 ring-1 ring-white/30"
            title={isPlaying ? 'Pause' : 'Play Timeline'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-slate-950" />
            ) : (
              <Play className="w-4 h-4 fill-current text-slate-950 ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentIndex === days.length - 1}
            className="p-1.5 rounded-full text-slate-400 hover:text-white disabled:opacity-25 disabled:pointer-events-none hover:bg-white/10 transition-colors"
            title="Next Day"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date & Day Indicator */}
        <div className="flex items-center space-x-1.5 font-mono text-xs shrink-0">
          <span className="text-white font-bold tracking-tight">Day {currentIndex + 1}</span>
          <span className="text-slate-500 text-[11px]">/{days.length}</span>
          <span className="text-orange-400 bg-orange-950/70 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ml-1 shadow-sm">
            {currentDate}
          </span>
        </div>

        {/* Custom Progress Scrubber */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={days.length - 1}
            value={currentIndex}
            onChange={(e) => onSelectDate(days[parseInt(e.target.value)])}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
          />
        </div>

        {/* Metrics Pill & Speed Toggle */}
        <div className="flex items-center space-x-2 shrink-0 font-mono text-xs">
          {currentMetric && (
            <div className="hidden sm:flex items-center space-x-1 text-slate-200 bg-slate-900/90 border border-white/10 px-2.5 py-0.5 rounded-full shadow-inner">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-bold">{currentMetric.burned_km2}</span>
              <span className="text-[10px] text-slate-400">km²</span>
            </div>
          )}

          <button
            onClick={toggleSpeed}
            className="text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded-full bg-slate-900/90 border border-white/10 hover:border-amber-500/50 transition-colors flex items-center space-x-1 shadow-sm"
            title="Toggle Playback Speed"
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span className="font-bold">{speed}x</span>
          </button>
        </div>
      </div>

      {/* Row 2: Slide to Compare (Raw Satellite ◄————————► AI Prediction) */}
      <div className="flex items-center space-x-3 pt-2.5 border-t border-white/[0.08] text-[11px] font-mono text-slate-300">
        <span className="flex items-center space-x-1.5 shrink-0 font-bold uppercase text-[10px] text-orange-400 tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-orange-400" />
          <span>Compare:</span>
        </span>

        <button
          onClick={() => onChangePredictionOpacity(0)}
          className={`px-2 py-0.5 rounded-full transition-all text-[10px] ${
            predictionOpacity === 0
              ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Raw Satellite
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={predictionOpacity}
            onChange={(e) => onChangePredictionOpacity(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
            title="Drag slider: 0% = Raw Satellite only, 100% = Full AI Prediction overlay"
          />
        </div>

        <button
          onClick={() => onChangePredictionOpacity(1)}
          className={`px-2 py-0.5 rounded-full transition-all text-[10px] ${
            predictionOpacity === 1
              ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          AI Overlay
        </button>

        <span className="text-orange-400/90 font-bold font-mono text-[10px] w-8 text-right">
          {Math.round(predictionOpacity * 100)}%
        </span>
      </div>
    </div>
  );
};
