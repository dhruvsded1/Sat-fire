import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Sliders, Zap, Flame } from 'lucide-react';
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

  return (
    <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl px-4 py-3 shadow-2xl space-y-2.5 max-w-2xl mx-auto select-none">
      {/* Row 1: Time Player Scrubber */}
      <div className="flex items-center space-x-3">
        {/* Playback Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleStepBack}
            disabled={currentIndex === 0}
            className="p-1 rounded-full text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
            title="Previous Day"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-600/30 transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play Timeline'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentIndex === days.length - 1}
            className="p-1 rounded-full text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
            title="Next Day"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date & Day Badge */}
        <div className="flex items-center space-x-1.5 font-mono text-xs shrink-0">
          <span className="text-white font-bold">Day {currentIndex + 1}</span>
          <span className="text-slate-500">/ {days.length}</span>
          <span className="text-orange-400 bg-orange-950/70 border border-orange-800/50 px-2 py-0.5 rounded-full text-[10px] font-semibold ml-1">
            {currentDate}
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={days.length - 1}
            value={currentIndex}
            onChange={(e) => onSelectDate(days[parseInt(e.target.value)])}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
          />
        </div>

        {/* Telemetry pill & Speed */}
        <div className="flex items-center space-x-2 shrink-0 font-mono text-[11px]">
          {currentMetric && (
            <span className="hidden sm:flex items-center space-x-1 text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>{currentMetric.burned_km2} km²</span>
            </span>
          )}

          <button
            onClick={toggleSpeed}
            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-center space-x-0.5"
            title="Playback Speed"
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>{speed}x</span>
          </button>
        </div>
      </div>

      {/* Row 2: Slide to Compare (Raw Satellite vs AI Model) */}
      <div className="flex items-center space-x-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
        <span className="flex items-center space-x-1 shrink-0 text-slate-300 font-semibold uppercase text-[9px]">
          <Sliders className="w-3 h-3 text-orange-400" />
          <span>Compare:</span>
        </span>

        <button
          onClick={() => onChangePredictionOpacity(0)}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            predictionOpacity === 0 ? 'bg-slate-800 text-orange-400 font-bold' : 'hover:text-white'
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
            title="Slide left for satellite, right for AI prediction"
          />
        </div>

        <button
          onClick={() => onChangePredictionOpacity(1)}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            predictionOpacity === 1 ? 'bg-slate-800 text-orange-400 font-bold' : 'hover:text-white'
          }`}
        >
          AI Overlay
        </button>

        <span className="text-slate-500 font-mono text-[9px] shrink-0">
          {Math.round(predictionOpacity * 100)}%
        </span>
      </div>
    </div>
  );
};
