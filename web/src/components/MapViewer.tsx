import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Satellite,
  Thermometer,
  RefreshCw,
  BarChart3,
  Calendar,
  Globe,
  Box
} from 'lucide-react';
import { Bounds, LayerState, DayMetric, InspectorSample } from '../types/contract';
import { getDayRasterUrls } from '../services/dataService';
import { pixelSampler } from '../services/pixelSampler';

interface MapViewerProps {
  fireId: string;
  bounds: Bounds;
  days?: string[];
  currentDate: string;
  currentMetric: DayMetric | undefined;
  layerState: LayerState;
  inspectedSample?: InspectorSample | null;
  onChangeLayerState?: (newState: Partial<LayerState>) => void;
  onSamplePixel: (sample: InspectorSample | null) => void;
  showMetrics?: boolean;
  onToggleMetrics?: () => void;
}

// High-performance, unauthenticated ESRI basemaps (Zero watermarks, Zero API keys required)
const FALLBACK_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri, HERE, Garmin, OpenStreetMap'
    },
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#070c14'
      }
    },
    {
      id: 'esri-dark-layer',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 17,
      layout: {
        visibility: 'visible'
      }
    },
    {
      id: 'esri-imagery-layer',
      type: 'raster',
      source: 'esri-imagery',
      minzoom: 0,
      maxzoom: 17,
      layout: {
        visibility: 'none'
      }
    }
  ]
};

// In-memory processed canvas cache for 60fps instant timeline scrubbing
const rasterCanvasCache = new Map<string, string>();

export const MapViewer: React.FC<MapViewerProps> = ({
  fireId,
  bounds,
  days = [],
  currentDate,
  currentMetric,
  layerState,
  inspectedSample,
  onSamplePixel,
  showMetrics = true,
  onToggleMetrics
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const inspectMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Active refs to eliminate stale closure bugs on dynamically switched fires
  const boundsRef = useRef<Bounds>(bounds);
  boundsRef.current = bounds;
  const onSamplePixelRef = useRef(onSamplePixel);
  onSamplePixelRef.current = onSamplePixel;

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [basemap, setBasemap] = useState<'dark' | 'satellite'>('dark');

  // Dynamic basemap switcher: Dark Canvas vs Satellite Imagery
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    try {
      if (map.getLayer('esri-dark-layer')) {
        map.setLayoutProperty('esri-dark-layer', 'visibility', basemap === 'dark' ? 'visible' : 'none');
      }
      if (map.getLayer('esri-imagery-layer')) {
        map.setLayoutProperty('esri-imagery-layer', 'visibility', basemap === 'satellite' ? 'visible' : 'none');
      }
    } catch {
      // ignore before load
    }
  }, [basemap, mapLoaded]);

  // Processed thresholded next-day canvas URL
  const [processedNextDayUrl, setProcessedNextDayUrl] = useState<string>('');
  // Processed confusion canvas URL
  const [processedConfusionUrl, setProcessedConfusionUrl] = useState<string>('');
  // Processed transparent thermal radiance canvas URL
  const [processedThermalUrl, setProcessedThermalUrl] = useState<string>('');
  // 3D Perspective Tilt state
  const [is3D, setIs3D] = useState<boolean>(false);

  const [west, south, east, north] = bounds;
  const imageCoordinates = useMemo<[[number, number], [number, number], [number, number], [number, number]]>(
    () => [
      [west, north],
      [east, north],
      [east, south],
      [west, south]
    ],
    [west, south, east, north]
  );

  // 1. Initialize MapLibre ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const [initW, initS, initE, initN] = boundsRef.current;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: FALLBACK_DARK_STYLE,
      center: [(initW + initE) / 2, (initS + initN) / 2],
      zoom: 10,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
      const [w, s, e, n] = boundsRef.current;
      map.fitBounds(
        [
          [w, s],
          [e, n]
        ],
        { padding: 40, duration: 800 }
      );
    });

    // Handle container resizing dynamically
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    ro.observe(mapContainerRef.current);

    // Map click inspector - uses current onSamplePixelRef to prevent stale handler
    map.on('click', (e) => {
      const sample = pixelSampler.sample(e.lngLat.lng, e.lngLat.lat);
      onSamplePixelRef.current(sample);

      if (sample) {
        if (!inspectMarkerRef.current) {
          const el = document.createElement('div');
          el.className =
            'w-4 h-4 rounded-full border-2 border-orange-400 bg-orange-600/60 shadow-lg shadow-orange-500/50 animate-ping';
          inspectMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([sample.lng, sample.lat])
            .addTo(map);
        } else {
          inspectMarkerRef.current.setLngLat([sample.lng, sample.lat]);
        }
      }
    });

    // Dynamic cursor styling - reads boundsRef to stay accurate across all fire switches
    map.on('mousemove', (e) => {
      const [w, s, ea, n] = boundsRef.current;
      if (e.lngLat.lng >= w && e.lngLat.lng <= ea && e.lngLat.lat >= s && e.lngLat.lat <= n) {
        map.getCanvas().style.cursor = 'crosshair';
      } else {
        map.getCanvas().style.cursor = '';
      }
    });

    mapRef.current = map;

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Fly camera to fire bounds whenever fireId or bounds change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const [w, s, e, n] = bounds;
    mapRef.current.fitBounds(
      [
        [w, s],
        [e, n]
      ],
      { padding: 40, duration: 600 }
    );

    // Reset inspect marker on fire change
    if (inspectMarkerRef.current) {
      inspectMarkerRef.current.remove();
      inspectMarkerRef.current = null;
    }
  }, [fireId, bounds, mapLoaded]);

  // Remove marker if sample is cleared externally (e.g. clicking Close on InspectorCard)
  useEffect(() => {
    if (!inspectedSample && inspectMarkerRef.current) {
      inspectMarkerRef.current.remove();
      inspectMarkerRef.current = null;
    }
  }, [inspectedSample]);

  // 3. Pre-process dynamic canvas rasters (Confusion, Calibrated Forecast & Transparent Thermal Radiance)
  useEffect(() => {
    let cancelled = false;
    pixelSampler.loadDayImages(fireId, currentDate, bounds, [256, 256]);

    const urls = getDayRasterUrls(fireId, currentDate);

    // Dynamic transparent thermal mask: makes cool ambient desert ground 100% transparent
    // so the crisp satellite composite remains completely bright and never darkens!
    const thermalKey = `${fireId}_${currentDate}_thermal`;
    if (rasterCanvasCache.has(thermalKey)) {
      setProcessedThermalUrl(rasterCanvasCache.get(thermalKey)!);
    } else {
      const thermalImg = new Image();
      thermalImg.crossOrigin = 'anonymous';
      thermalImg.onload = () => {
        if (cancelled) return;
        const w = thermalImg.naturalWidth || 512;
        const h = thermalImg.naturalHeight || 512;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(thermalImg, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            // Ambient ground temperature in Arizona daytime is ~310-320K (R <= 135)
            // Make ambient unburned pixels 100% transparent to keep satellite terrain bright
            if (r <= 135) {
              d[i + 3] = 0;
            } else {
              // Incandescent thermal radiance anomaly (>330K)
              const norm = (r - 135) / (255 - 135);
              d[i + 3] = Math.round(180 + norm * 75);
            }
          }
          ctx.putImageData(imgData, 0, 0);
          const dataUrl = c.toDataURL();
          rasterCanvasCache.set(thermalKey, dataUrl);
          if (!cancelled) setProcessedThermalUrl(dataUrl);
        }
      };
      thermalImg.src = urls.thermal;
    }

    // Dynamic calibrated next-day spread probability mask
    // Background terrain sigmoid bias is ~142 (~0.52 raw). Only active expansion perimeter peaks to 254!
    const nextKey = `${fireId}_${currentDate}_next_${layerState.nextDayThreshold}`;
    if (rasterCanvasCache.has(nextKey)) {
      setProcessedNextDayUrl(rasterCanvasCache.get(nextKey)!);
    } else {
      const nextImg = new Image();
      nextImg.crossOrigin = 'anonymous';
      nextImg.onload = () => {
        if (cancelled) return;
        const w = nextImg.naturalWidth || 512;
        const h = nextImg.naturalHeight || 512;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(nextImg, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          const BASE_NOISE = 142;

          for (let i = 0; i < d.length; i += 4) {
            const prob = d[i];
            if (prob > BASE_NOISE) {
              const norm = (prob - BASE_NOISE) / (255 - BASE_NOISE);
              if (norm >= layerState.nextDayThreshold) {
                // Radiant Glowing Magma Flare (Electric Amber -> Neon Flare Orange)
                d[i] = 255;
                d[i + 1] = Math.round(180 - norm * 100);
                d[i + 2] = 0;
                d[i + 3] = 255; // 100% luminous opacity
              } else {
                d[i + 3] = 0;
              }
            } else {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          const dataUrl = c.toDataURL();
          rasterCanvasCache.set(nextKey, dataUrl);
          if (!cancelled) setProcessedNextDayUrl(dataUrl);
        }
      };
      nextImg.src = urls.predNext;
    }

    // Dynamic confusion matrix mask
    const confKey = `${fireId}_${currentDate}_conf`;
    if (rasterCanvasCache.has(confKey)) {
      setProcessedConfusionUrl(rasterCanvasCache.get(confKey)!);
    } else {
      const afPredImg = new Image();
      const afGtImg = new Image();
      let loadedCount = 0;
      const onBothLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          if (cancelled) return;
          const w = afPredImg.naturalWidth || 512;
          const h = afPredImg.naturalHeight || 512;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (ctx) {
            const cGt = document.createElement('canvas');
            cGt.width = w;
            cGt.height = h;
            const ctxGt = cGt.getContext('2d');
            if (ctxGt) {
              ctxGt.drawImage(afGtImg, 0, 0, w, h);
              const gtData = ctxGt.getImageData(0, 0, w, h).data;

              ctx.drawImage(afPredImg, 0, 0, w, h);
              const predData = ctx.getImageData(0, 0, w, h);
              const d = predData.data;

              for (let i = 0; i < d.length; i += 4) {
                const isPred = d[i + 3] > 40;
                const isGt = gtData[i + 3] > 40;

                if (isPred && isGt) {
                  // Correct (True Positive): Radioactive Neon Green
                  d[i] = 0;
                  d[i + 1] = 255;
                  d[i + 2] = 100;
                  d[i + 3] = 255;
                } else if (isPred && !isGt) {
                  // False Alarm (False Positive): Bright High-Voltage Yellow
                  d[i] = 255;
                  d[i + 1] = 220;
                  d[i + 2] = 0;
                  d[i + 3] = 255;
                } else if (!isPred && isGt) {
                  // Missed (False Negative): Vivid Electric Cyan
                  d[i] = 0;
                  d[i + 1] = 220;
                  d[i + 2] = 255;
                  d[i + 3] = 255;
                } else {
                  d[i + 3] = 0;
                }
              }
              ctx.putImageData(predData, 0, 0);
              const dataUrl = c.toDataURL();
              rasterCanvasCache.set(confKey, dataUrl);
              if (!cancelled) setProcessedConfusionUrl(dataUrl);
            }
          }
        }
      };
      afPredImg.crossOrigin = 'anonymous';
      afGtImg.crossOrigin = 'anonymous';
      afPredImg.onload = onBothLoaded;
      afGtImg.onload = onBothLoaded;
      afPredImg.src = urls.afPred;
      afGtImg.src = urls.afGt;
    }

    return () => {
      cancelled = true;
    };
  }, [fireId, currentDate, layerState.nextDayThreshold, bounds]);

  // 4. Update MapLibre Image Layers with strict stacking order
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const urls = getDayRasterUrls(fireId, currentDate);

    const updateImageLayer = (
      sourceId: string,
      layerId: string,
      imageUrl: string,
      visible: boolean,
      opacity: number
    ) => {
      if (!imageUrl) return;

      const source = map.getSource(sourceId) as maplibregl.ImageSource;
      if (source) {
        source.updateImage({ url: imageUrl, coordinates: imageCoordinates });
      } else {
        map.addSource(sourceId, {
          type: 'image',
          url: imageUrl,
          coordinates: imageCoordinates
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': opacity,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear'
          }
        });
      } else {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        map.setPaintProperty(layerId, 'raster-opacity', opacity);
      }
    };

    // Calculate effective prediction opacity from Slide to Compare
    const predOpacity = layerState.predictionOpacity ?? 1.0;

    // 1. Composite Base (Satellite Imagery)
    updateImageLayer(
      'source-composite',
      'layer-composite',
      urls.composite,
      layerState.showComposite,
      layerState.compositeOpacity
    );

    // 2. Thermal Radiance (with ambient background transparency)
    const effectiveThermalOpacity = layerState.showThermal ? layerState.thermalOpacity * predOpacity : 0.0;
    updateImageLayer(
      'source-thermal',
      'layer-thermal',
      processedThermalUrl || urls.thermal,
      layerState.showThermal && effectiveThermalOpacity > 0.01,
      effectiveThermalOpacity
    );

    // 3. Burned Area Scar (underneath flame front)
    if (layerState.burnedAreaMode === 'gt') {
      updateImageLayer('source-ba', 'layer-ba', urls.baGt, true, 0.7 * predOpacity);
    } else if (layerState.burnedAreaMode === 'pred') {
      updateImageLayer('source-ba', 'layer-ba', urls.baPred, true, 0.7 * predOpacity);
    } else {
      updateImageLayer('source-ba', 'layer-ba', urls.baGt, false, 0.0);
    }

    // 4. Next-Day Spread Prediction (governed by Slide to Compare)
    if (layerState.showNextDay && processedNextDayUrl) {
      updateImageLayer('source-next', 'layer-next', processedNextDayUrl, true, predOpacity);
    } else {
      updateImageLayer('source-next', 'layer-next', urls.predNext, false, 0.0);
    }

    // 5. Active Fire Front (Top Layer - governed by Slide to Compare)
    if (layerState.activeFireMode === 'gt') {
      updateImageLayer('source-af', 'layer-af', urls.afGt, true, predOpacity);
    } else if (layerState.activeFireMode === 'pred') {
      updateImageLayer('source-af', 'layer-af', urls.afPred, true, predOpacity);
    } else if (layerState.activeFireMode === 'confusion' && processedConfusionUrl) {
      updateImageLayer('source-af', 'layer-af', processedConfusionUrl, true, predOpacity);
    } else {
      updateImageLayer('source-af', 'layer-af', urls.afPred, false, 0.0);
    }

    // 6. Actual Next-Day Growth Overlay (when enabled via LayerControls)
    const nextIdx = days ? days.indexOf(currentDate) + 1 : -1;
    const nextDate = days && nextIdx > 0 && nextIdx < days.length ? days[nextIdx] : null;
    if (layerState.showActualNextOverlay && nextDate) {
      const nextUrls = getDayRasterUrls(fireId, nextDate);
      updateImageLayer('source-actual-next', 'layer-actual-next', nextUrls.afGt, true, 0.85);
    } else {
      updateImageLayer('source-actual-next', 'layer-actual-next', urls.afGt, false, 0.0);
    }

    // Guaranteed Stacking Order: Ensures active fire front & confusion matrix is ALWAYS topmost
    const STACK_ORDER = [
      'esri-dark-layer',
      'esri-imagery-layer',
      'layer-composite',
      'layer-thermal',
      'layer-ba',
      'layer-next',
      'layer-actual-next',
      'layer-af'
    ];
    for (let i = 0; i < STACK_ORDER.length - 1; i++) {
      const cur = STACK_ORDER[i];
      const nxt = STACK_ORDER[i + 1];
      if (map.getLayer(cur) && map.getLayer(nxt)) {
        try {
          map.moveLayer(cur, nxt);
        } catch {
          // ignore transient re-order
        }
      }
    }
  }, [
    mapLoaded,
    fireId,
    currentDate,
    days,
    layerState,
    processedThermalUrl,
    processedNextDayUrl,
    processedConfusionUrl,
    imageCoordinates
  ]);

  // Toggle 3D Perspective Tilt
  const toggle3D = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextState = !is3D;
    setIs3D(nextState);
    if (nextState) {
      map.easeTo({
        pitch: 45,
        bearing: -12,
        duration: 900
      });
    } else {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800
      });
    }
  };

  // Reset map view
  const handleResetBounds = () => {
    if (mapRef.current) {
      mapRef.current.fitBounds(
        [
          [west, south],
          [east, north]
        ],
        { padding: 40, duration: 600 }
      );
    }
  };

  const nextIdx = days ? days.indexOf(currentDate) + 1 : -1;
  const nextDate = days && nextIdx > 0 && nextIdx < days.length ? days[nextIdx] : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left Satellite Status HUD */}
      {currentMetric && (
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 bg-slate-950/85 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-4 py-2 shadow-2xl select-none ring-1 ring-black/40">
          <div className="flex items-center space-x-2 border-r border-white/10 pr-3">
            <Satellite className="w-4 h-4 text-orange-400" />
            <div className="text-[11px] font-mono leading-tight">
              <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">SENSOR</span>
              <span className="text-white font-bold">VIIRS 375m</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <div className="text-[11px] font-mono leading-tight">
              <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">24H GROWTH</span>
              <span className="text-amber-400 font-bold">+{currentMetric.new_km2} km²</span>
            </div>
          </div>

          {layerState.showActualNextOverlay && (
            <div className="flex items-center space-x-2 border-l border-white/10 pl-3">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <div className="text-[11px] font-mono leading-tight">
                <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">VERIFICATION</span>
                <span className="text-emerald-400 font-bold">{nextDate || 'Final Observation'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Right Quick Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-1.5 shadow-2xl ring-1 ring-black/40">
        <button
          onClick={() => setBasemap((b) => (b === 'dark' ? 'satellite' : 'dark'))}
          className="px-3 py-1 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-mono border border-white/5"
          title="Toggle Basemap: Dark Cartography vs Real Topographic Satellite Imagery"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="capitalize font-semibold">{basemap === 'dark' ? 'Dark Map' : 'Satellite'}</span>
        </button>

        <button
          onClick={toggle3D}
          className={`px-3 py-1 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-mono border ${
            is3D
              ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10 border-white/5'
          }`}
          title="Toggle 3D Perspective Terrain Pitch"
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold">{is3D ? '3D' : '2D'}</span>
        </button>

        <button
          onClick={handleResetBounds}
          className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Reset Camera to Fire Bounds"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Legend (Positioned above timeline player) */}
      <div className="absolute bottom-28 left-4 z-10 bg-slate-950/85 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-4 py-2 text-[10px] font-mono text-slate-300 flex items-center space-x-4 shadow-2xl select-none hidden sm:flex ring-1 ring-black/40">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
          <span className="font-medium text-[#00FF66]">True Positive</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFDC00] shadow-[0_0_8px_#FFDC00]" />
          <span className="font-medium text-[#FFDC00]">False Alarm</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00DCFF] shadow-[0_0_8px_#00DCFF]" />
          <span className="font-medium text-[#00DCFF]">Missed Front</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] shadow-[0_0_8px_#FF5500]" />
          <span className="font-medium text-[#FF8833]">24h Forecast</span>
        </div>
        <div className="text-slate-400 border-l border-white/10 pl-3 font-semibold">
          375m VIIRS Grid
        </div>
      </div>
    </div>
  );
};
