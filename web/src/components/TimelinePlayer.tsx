import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Zap } from 'lucide-react';
import { DayMetric } from '../types/contract';

interface TimelinePlayerProps {
  days: string[];
  metrics: DayMetric[];
  currentDate: string;
  onSelectDate: (date: string) => void;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  days,
  metrics,
  currentDate,
  onSelectDate
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const timerRef = useRef<number | null>(null);

  const currentIndex = Math.max(0, days.indexOf(currentDate));
  const currentMetric = metrics.find((m) => m.date === currentDate) || metrics[currentIndex];

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Auto-play interval
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
    if (currentIndex > 0) {
      onSelectDate(days[currentIndex - 1]);
    }
  };

  const handleStepForward = () => {
    if (currentIndex < days.length - 1) {
      onSelectDate(days[currentIndex + 1]);
    }
  };

  const toggleSpeed = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-4 py-3 shadow-xl">
      {/* Top telemetry row */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-orange-400" />
          <span className="font-mono text-slate-300 font-medium">
            Observation Day <strong className="text-white">{currentIndex + 1}</strong> of {days.length}
          </span>
          <span className="font-mono text-orange-400 bg-orange-950/60 border border-orange-800/40 px-2 py-0.5 rounded text-[11px]">
            {currentDate}
          </span>
        </div>

        {currentMetric && (
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
            <div>
              Burned Area: <span className="text-orange-400 font-semibold">{currentMetric.burned_km2} km²</span>
            </div>
            <div>
              24h Growth: <span className="text-amber-400 font-semibold">+{currentMetric.new_km2} km²</span>
            </div>
            <div className="hidden sm:block">
              AF F1: <span className="text-cyan-400 font-semibold">{Math.round(currentMetric.f1_af * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Scrubber Slider */}
      <div className="relative mb-2.5">
        <input
          type="range"
          min={0}
          max={days.length - 1}
          value={currentIndex}
          onChange={(e) => onSelectDate(days[parseInt(e.target.value)])}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
        />

        {/* Milestone Tick Marks */}
        <div className="flex justify-between items-center px-1 mt-1">
          {days.map((d, i) => (
            <button
              key={d}
              onClick={() => onSelectDate(d)}
              className={`w-2 h-2 rounded-full transition-transform ${
                i === currentIndex
                  ? 'bg-orange-500 ring-2 ring-orange-400/50 scale-150'
                  : i < currentIndex
                  ? 'bg-slate-600 hover:bg-slate-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Day ${i + 1}: ${d}`}
            />
          ))}
        </div>
      </div>

      {/* Playback Controls Row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <div className="flex items-center space-x-2">
          {/* Step Back */}
          <button
            onClick={handleStepBack}
            disabled={currentIndex === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Day"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs shadow-md shadow-orange-600/30 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Animation</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={handleStepForward}
            disabled={currentIndex === days.length - 1}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Day"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSpeed}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
            title="Playback Speed"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{speed}x Speed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
