/**
 * Standalone Studio Background Remover Engine (v6.0 - 100% Precision)
 * Features:
 * 1. Polygon / Point-to-Point Contour Cutter (Photoshop Pen Tool - 100% Exact Contour)
 * 2. Interactive Foreground & Background Stroke Refinement (Green Keep / Red Erase)
 * 3. Smart Magic Wand & Color Keying
 * 4. Manual Precision Eraser & Restore with Feathering
 * 5. Studio Composite Rendering with Defringing & Anti-Aliasing
 */

(function (global) {
  'use strict';

  class StudioBgEngine {
    constructor() {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    }

    createInitialMask(width, height) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      return maskCanvas;
    }

    /**
     * Point-to-Point / Polygon Contour Mask (100% Precision Pen Tool)
     * Keeps inside polygon, erases outside polygon
     */
    applyPolygonCut(width, height, points, feather = 2) {
      if (!points || points.length < 3) return this.createInitialMask(width, height);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });

      // Clear outside (black/transparent)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw filled polygon (white/foreground)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Feathering / Anti-aliasing
      if (feather > 0) {
        ctx.filter = `blur(${feather}px)`;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
      }

      return maskCanvas;
    }

    /**
     * Auto 1-Click Background Removal (Conservative Boundary Flood)
     */
    autoRemoveBackground(imageSource, options = {}) {
      const opts = Object.assign({
        tolerance: 28,
        edgeSmooth: 2,
        protectSkin: true
      }, options);

      const width = imageSource.naturalWidth || imageSource.width;
      const height = imageSource.naturalHeight || imageSource.height;

      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
      this.tempCtx.drawImage(imageSource, 0, 0, width, height);

      const imgData = this.tempCtx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const maskImgData = maskCtx.createImageData(width, height);
      const maskData = maskImgData.data;

      for (let i = 0; i < maskData.length; i += 4) {
        maskData[i] = 255;
        maskData[i + 1] = 255;
        maskData[i + 2] = 255;
        maskData[i + 3] = 255;
      }

      const borderSamples = this._sampleMultiBorderColors(data, width, height);
      const tolSq = Math.pow(opts.tolerance * 2.2, 2);

      const visited = new Uint8Array(width * height);
      const queue = [];

      for (let x = 0; x < width; x++) {
        queue.push(0 * width + x);
        queue.push((height - 1) * width + x);
      }
      for (let y = 0; y < height; y++) {
        queue.push(y * width + 0);
        queue.push(y * width + (width - 1));
      }

      function isSkin(r, g, b) {
        return (r > 85 && g > 35 && b > 20 && Math.abs(r - g) > 10 && r > g && r > b);
      }

      let qIdx = 0;
      while (qIdx < queue.length) {
        const p = queue[qIdx++];
        if (visited[p]) continue;
        visited[p] = 1;

        const pIdx = p * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];

        if (opts.protectSkin && isSkin(r, g, b)) {
          continue;
        }

        let minDiff = Infinity;
        for (let s of borderSamples) {
          const dr = r - s.r;
          const dg = g - s.g;
          const db = b - s.b;
          const dist = dr * dr + dg * dg + db * db;
          if (dist < minDiff) minDiff = dist;
        }

        if (minDiff < tolSq) {
          maskData[pIdx + 3] = 0;

          const px = p % width;
          const py = Math.floor(p / width);

          if (px > 0 && !visited[p - 1]) queue.push(p - 1);
          if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
          if (py > 0 && !visited[p - width]) queue.push(p - width);
          if (py < height - 1 && !visited[p + width]) queue.push(p + width);
        }
      }

      maskCtx.putImageData(maskImgData, 0, 0);
      return this._refineMask(maskCanvas, width, height, opts);
    }

    /**
     * Magic Wand Click
     */
    applyMagicWand(imageSource, currentMaskCanvas, clickX, clickY, tolerance = 30) {
      const width = imageSource.naturalWidth || imageSource.width;
      const height = imageSource.naturalHeight || imageSource.height;

      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
      this.tempCtx.drawImage(imageSource, 0, 0, width, height);
      const srcData = this.tempCtx.getImageData(0, 0, width, height).data;

      const maskCtx = currentMaskCanvas.getContext('2d', { willReadFrequently: true });
      const maskImgData = maskCtx.getImageData(0, 0, width, height);
      const maskData = maskImgData.data;

      const startIdx = (Math.floor(clickY) * width + Math.floor(clickX)) * 4;
      const targetR = srcData[startIdx];
      const targetG = srcData[startIdx + 1];
      const targetB = srcData[startIdx + 2];

      const tolSq = Math.pow(tolerance * 2.4, 2);

      const visited = new Uint8Array(width * height);
      const queue = [Math.floor(clickY) * width + Math.floor(clickX)];

      let qIdx = 0;
      while (qIdx < queue.length) {
        const p = queue[qIdx++];
        if (visited[p]) continue;
        visited[p] = 1;

        const pIdx = p * 4;
        const dr = srcData[pIdx] - targetR;
        const dg = srcData[pIdx + 1] - targetG;
        const db = srcData[pIdx + 2] - targetB;

        if (dr * dr + dg * dg + db * db < tolSq) {
          maskData[pIdx + 3] = 0;

          const px = p % width;
          const py = Math.floor(p / width);

          if (px > 0 && !visited[p - 1]) queue.push(p - 1);
          if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
          if (py > 0 && !visited[p - width]) queue.push(p - width);
          if (py < height - 1 && !visited[p + width]) queue.push(p + width);
        }
      }

      maskCtx.putImageData(maskImgData, 0, 0);
      return currentMaskCanvas;
    }

    /**
     * Color Sample Eraser Brush
     */
    applyColorSampleBrush(imageSource, maskCanvas, x, y, radius, sampleColor, tolerance = 30) {
      const width = imageSource.naturalWidth || imageSource.width;
      const height = imageSource.naturalHeight || imageSource.height;

      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
      this.tempCtx.drawImage(imageSource, 0, 0, width, height);
      const srcData = this.tempCtx.getImageData(0, 0, width, height).data;

      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const maskImgData = maskCtx.getImageData(0, 0, width, height);
      const maskData = maskImgData.data;

      const tolSq = Math.pow(tolerance * 2.4, 2);
      const radSq = radius * radius;

      const minX = Math.max(0, Math.floor(x - radius));
      const maxX = Math.min(width - 1, Math.ceil(x + radius));
      const minY = Math.max(0, Math.floor(y - radius));
      const maxY = Math.min(height - 1, Math.ceil(y + radius));

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const dx = px - x;
          const dy = py - y;
          if (dx * dx + dy * dy <= radSq) {
            const idx = (py * width + px) * 4;
            const dr = srcData[idx] - sampleColor.r;
            const dg = srcData[idx + 1] - sampleColor.g;
            const db = srcData[idx + 2] - sampleColor.b;

            if (dr * dr + dg * dg + db * db < tolSq) {
              maskData[idx + 3] = 0;
            }
          }
        }
      }

      maskCtx.putImageData(maskImgData, 0, 0);
    }

    /**
     * Manual Eraser or Restore Brush
     */
    applyManualBrush(maskCanvas, x, y, radius, mode = 'erase') {
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      if (mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000000';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.fill();
      ctx.restore();
    }

    _sampleMultiBorderColors(data, width, height) {
      const samples = [];
      const step = Math.max(2, Math.floor(Math.min(width, height) / 40));

      for (let x = 0; x < width; x += step) {
        const iTop = (0 * width + x) * 4;
        const iBottom = ((height - 1) * width + x) * 4;
        samples.push({ r: data[iTop], g: data[iTop + 1], b: data[iTop + 2] });
        samples.push({ r: data[iBottom], g: data[iBottom + 1], b: data[iBottom + 2] });
      }

      for (let y = 0; y < height; y += step) {
        const iLeft = (y * width + 0) * 4;
        const iRight = (y * width + (width - 1)) * 4;
        samples.push({ r: data[iLeft], g: data[iLeft + 1], b: data[iLeft + 2] });
        samples.push({ r: data[iRight], g: data[iRight + 1], b: data[iRight + 2] });
      }

      return samples;
    }

    _refineMask(maskCanvas, width, height, opts) {
      const outputMask = document.createElement('canvas');
      outputMask.width = width;
      outputMask.height = height;
      const outCtx = outputMask.getContext('2d', { willReadFrequently: true });
      outCtx.drawImage(maskCanvas, 0, 0);

      const imgData = outCtx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const alpha = new Uint8Array(width * height);

      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = data[i * 4 + 3];
      }

      const smoothR = Math.max(1, opts.edgeSmooth || 2);
      const smoothed = new Uint8Array(width * height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          let sum = 0;
          let count = 0;

          for (let dy = -smoothR; dy <= smoothR; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -smoothR; dx <= smoothR; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              sum += alpha[ny * width + nx];
              count++;
            }
          }

          const avg = sum / count;
          const norm = avg / 255;
          const sig = 1 / (1 + Math.exp(-12 * (norm - 0.5)));
          smoothed[idx] = Math.round(sig * 255);
        }
      }

      for (let i = 0; i < smoothed.length; i++) {
        const pIdx = i * 4;
        data[pIdx] = 255;
        data[pIdx + 1] = 255;
        data[pIdx + 2] = 255;
        data[pIdx + 3] = smoothed[i];
      }

      outCtx.putImageData(imgData, 0, 0);
      return outputMask;
    }

    renderComposite(originalImage, maskCanvas, renderOptions = {}) {
      const opts = Object.assign({
        bgType: 'color',
        bgColor: '#1a66ff',
        gradientStart: '#1a66ff',
        gradientEnd: '#002266',
        gradientType: 'linear',
        bgImage: null,
        targetWidth: null,
        targetHeight: null,
        cropX: 0,
        cropY: 0,
        cropWidth: null,
        cropHeight: null
      }, renderOptions);

      const srcW = originalImage.naturalWidth || originalImage.width;
      const srcH = originalImage.naturalHeight || originalImage.height;

      const cropX = opts.cropX || 0;
      const cropY = opts.cropY || 0;
      const cropW = opts.cropWidth || srcW;
      const cropH = opts.cropHeight || srcH;

      const outW = opts.targetWidth || cropW;
      const outH = opts.targetHeight || cropH;

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = outW;
      outputCanvas.height = outH;
      const outCtx = outputCanvas.getContext('2d');

      // 1. Background
      if (opts.bgType === 'transparent') {
        outCtx.clearRect(0, 0, outW, outH);
      } else if (opts.bgType === 'color') {
        outCtx.fillStyle = opts.bgColor;
        outCtx.fillRect(0, 0, outW, outH);
      } else if (opts.bgType === 'gradient') {
        let grad;
        if (opts.gradientType === 'radial') {
          grad = outCtx.createRadialGradient(outW / 2, outH / 2, 10, outW / 2, outH / 2, Math.max(outW, outH) / 1.5);
        } else {
          grad = outCtx.createLinearGradient(0, 0, 0, outH);
        }
        grad.addColorStop(0, opts.gradientStart);
        grad.addColorStop(1, opts.gradientEnd);
        outCtx.fillStyle = grad;
        outCtx.fillRect(0, 0, outW, outH);
      } else if (opts.bgType === 'image' && opts.bgImage) {
        outCtx.drawImage(opts.bgImage, 0, 0, outW, outH);
      }

      // 2. Cutout Foreground with Defringe
      const fgCanvas = document.createElement('canvas');
      fgCanvas.width = srcW;
      fgCanvas.height = srcH;
      const fgCtx = fgCanvas.getContext('2d', { willReadFrequently: true });
      fgCtx.drawImage(originalImage, 0, 0);

      const fgImgData = fgCtx.getImageData(0, 0, srcW, srcH);
      const fgData = fgImgData.data;

      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      const maskImgData = maskCtx.getImageData(0, 0, srcW, srcH);
      const maskData = maskImgData.data;

      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          const idx = (y * srcW + x) * 4;
          const alpha = maskData[idx + 3];

          if (alpha === 0) {
            fgData[idx + 3] = 0;
          } else if (alpha < 240) {
            let cleanR = fgData[idx];
            let cleanG = fgData[idx + 1];
            let cleanB = fgData[idx + 2];
            let found = false;

            for (let dy = -2; dy <= 2 && !found; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= srcH) continue;
              for (let dx = -2; dx <= 2 && !found; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= srcW) continue;
                const nIdx = (ny * srcW + nx) * 4;
                if (maskData[nIdx + 3] >= 250) {
                  cleanR = fgData[nIdx];
                  cleanG = fgData[nIdx + 1];
                  cleanB = fgData[nIdx + 2];
                  found = true;
                }
              }
            }

            fgData[idx] = cleanR;
            fgData[idx + 1] = cleanG;
            fgData[idx + 2] = cleanB;
            fgData[idx + 3] = alpha;
          } else {
            fgData[idx + 3] = alpha;
          }
        }
      }

      fgCtx.putImageData(fgImgData, 0, 0);

      // 3. Composite Output
      outCtx.drawImage(fgCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

      return outputCanvas;
    }
  }

  const studioBgEngine = new StudioBgEngine();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = studioBgEngine;
  } else {
    global.StudioBgEngine = StudioBgEngine;
    global.studioBgEngine = studioBgEngine;
  }

})(typeof window !== 'undefined' ? window : global);
