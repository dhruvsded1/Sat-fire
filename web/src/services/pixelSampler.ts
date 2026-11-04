import { Bounds, InspectorSample } from '../types/contract';
import { getDayRasterUrls } from './dataService';

class PixelSampler {
  private canvases: { [key: string]: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } } = {};
  private currentFireId: string = '';
  private currentDate: string = '';
  private bounds: Bounds = [0, 0, 0, 0];
  private size: [number, number] = [256, 256];

  async loadDayImages(fireId: string, date: string, bounds: Bounds, size: [number, number] = [256, 256]) {
    // Immediately update spatial bounds and target fire/date
    this.bounds = bounds;
    this.size = size;

    if (this.currentFireId === fireId && this.currentDate === date && Object.keys(this.canvases).length > 0) {
      return;
    }
    this.currentFireId = fireId;
    this.currentDate = date;

    const urls = getDayRasterUrls(fireId, date);
    const keys: (keyof typeof urls)[] = ['thermal', 'afGt', 'afPred', 'baGt', 'baPred', 'predNext'];

    const newCanvases: { [key: string]: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } } = {};

    await Promise.all(
      keys.map((key) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size[0];
            canvas.height = size[1];
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, size[0], size[1]);
              newCanvases[key] = { canvas, ctx };
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = urls[key];
        });
      })
    );

    // Commit only if fireId and date have not changed during async loading
    if (this.currentFireId === fireId && this.currentDate === date) {
      this.canvases = newCanvases;
    }
  }

  sample(lng: number, lat: number): InspectorSample | null {
    const [west, south, east, north] = this.bounds;
    if (lng < west || lng > east || lat < south || lat > north) {
      return null;
    }

    const u = (lng - west) / (east - west);
    const v = (north - lat) / (north - south);

    const px = Math.min(this.size[0] - 1, Math.max(0, Math.floor(u * this.size[0])));
    const py = Math.min(this.size[1] - 1, Math.max(0, Math.floor(v * this.size[1])));

    const getPixelVal = (key: string): number => {
      const entry = this.canvases[key];
      if (!entry) return 0;
      try {
        const p = entry.ctx.getImageData(px, py, 1, 1).data;
        return p[0]; // Grayscale or Red channel
      } catch {
        return 0;
      }
    };

    // Mask presence check: contract specification v1 states mask PNGs are RGBA with
    // alpha = 0 where label is 0, and alpha = 255 where label is 1 (AF: 255, 69, 0; BA: 88, 28, 135)
    const getMaskPresent = (key: string): boolean => {
      const entry = this.canvases[key];
      if (!entry) return false;
      try {
        const p = entry.ctx.getImageData(px, py, 1, 1).data;
        return p[3] > 40 && (p[0] > 40 || p[1] > 40 || p[2] > 40);
      } catch {
        return false;
      }
    };

    const thermalVal = getPixelVal('thermal');
    const estimatedKelvin = Math.round((285.0 + (thermalVal / 255.0) * (440.0 - 285.0)) * 10) / 10;

    const isActiveFireGT = getMaskPresent('afGt');
    const isActiveFirePred = getMaskPresent('afPred');
    const isBurnedAreaGT = getMaskPresent('baGt');
    const isBurnedAreaPred = getMaskPresent('baPred');
    
    // Calibrated probability: raw values <= 140 are ambient unburned terrain noise floor (~0.52 sigmoid bias)
    const rawNext = getPixelVal('predNext');
    const nextDayProb = rawNext <= 140 ? 0 : Math.round(Math.min(1.0, (rawNext - 140) / 115) * 100) / 100;

    let confusionCategory: InspectorSample['confusionCategory'] = 'Unburned / True Negative';
    if (isActiveFireGT && isActiveFirePred) {
      confusionCategory = 'True Positive';
    } else if (isActiveFirePred && !isActiveFireGT) {
      confusionCategory = 'False Positive';
    } else if (isActiveFireGT && !isActiveFirePred) {
      confusionCategory = 'False Negative';
    }

    let fuelState: InspectorSample['fuelState'] = 'Unburned Biomass';
    if (isActiveFireGT || estimatedKelvin > 360) {
      fuelState = 'Flaming Firefront';
    } else if (isBurnedAreaGT) {
      fuelState = 'Smoldering Scar';
    } else if (nextDayProb > 0.35) {
      fuelState = 'Active Growth Zone';
    }

    return {
      lng: Math.round(lng * 10000) / 10000,
      lat: Math.round(lat * 10000) / 10000,
      pixelX: px,
      pixelY: py,
      thermalValue: thermalVal,
      estimatedKelvin,
      isActiveFireGT,
      isActiveFirePred,
      isBurnedAreaGT,
      isBurnedAreaPred,
      nextDayProb,
      confusionCategory,
      fuelState
    };
  }
}

export const pixelSampler = new PixelSampler();
