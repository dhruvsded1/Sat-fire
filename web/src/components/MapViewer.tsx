import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Satellite,
  Thermometer,
  RefreshCw,
  BarChart3,
  Calendar,
  Globe
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

  // 3. Pre-process dynamic canvas rasters (Confusion & Next-Day Probability Filter)
  useEffect(() => {
    let cancelled = false;
    pixelSampler.loadDayImages(fireId, currentDate, bounds, [256, 256]);

    const urls = getDayRasterUrls(fireId, currentDate);

    // Dynamic next-day thresholded mask image
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
        const thresh = Math.round(layerState.nextDayThreshold * 255);

        for (let i = 0; i < d.length; i += 4) {
          const prob = d[i];
          if (prob >= thresh) {
            const norm = (prob - thresh) / (255 - thresh + 1e-4);
            // Radiant Glowing Lava (Electric Amber -> Neon Flare Orange)
            d[i] = 255;
            d[i + 1] = Math.round(190 - norm * 110);
            d[i + 2] = 0;
            d[i + 3] = Math.round(210 + norm * 45); // High opacity, ultra luminous!
          } else {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        if (!cancelled) setProcessedNextDayUrl(c.toDataURL());
      }
    };
    nextImg.src = urls.predNext;

    // Dynamic confusion matrix mask
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
              const isPred = d[i + 3] > 40 || d[i] > 80;
              const isGt = gtData[i + 3] > 40 || gtData[i] > 80;

              if (isPred && isGt) {
                // Correct (True Positive): Radioactive Neon Green (Max Luminosity!)
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
                // Missed (False Negative): Vivid Electric Cyan (Glowing against terrain!)
                d[i] = 0;
                d[i + 1] = 220;
                d[i + 2] = 255;
                d[i + 3] = 255;
              } else {
                d[i + 3] = 0;
              }
            }
            ctx.putImageData(predData, 0, 0);
            if (!cancelled) setProcessedConfusionUrl(c.toDataURL());
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

    return () => {
      cancelled = true;
    };
  }, [fireId, currentDate, layerState.nextDayThreshold, bounds]);

  // 4. Update MapLibre Image Layers
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
    const predOpacity = layerState.predictionOpacity ?? 0.85;

    // 1. Composite Base
    updateImageLayer(
      'source-composite',
      'layer-composite',
      urls.composite,
      layerState.showComposite,
      layerState.compositeOpacity
    );

    // 2. Thermal
    updateImageLayer(
      'source-thermal',
      'layer-thermal',
      urls.thermal,
      layerState.showThermal,
      layerState.thermalOpacity
    );

    // 3. Burned Area Scar (underneath flame front)
    if (layerState.burnedAreaMode === 'gt') {
      updateImageLayer('source-ba', 'layer-ba', urls.baGt, true, 0.7);
    } else if (layerState.burnedAreaMode === 'pred') {
      updateImageLayer('source-ba', 'layer-ba', urls.baPred, true, 0.7);
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
  }, [
    mapLoaded,
    fireId,
    currentDate,
    days,
    layerState,
    processedNextDayUrl,
    processedConfusionUrl,
    imageCoordinates
  ]);

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
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span className="font-medium text-emerald-300">True Positive</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span className="font-medium text-amber-300">False Alarm</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          <span className="font-medium text-blue-300">Missed Front</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 shadow-[0_0_8px_#f97316]" />
          <span className="font-medium text-orange-400">24h Forecast</span>
        </div>
        <div className="text-slate-400 border-l border-white/10 pl-3 font-semibold">
          375m VIIRS Grid
        </div>
      </div>
    </div>
  );
};
