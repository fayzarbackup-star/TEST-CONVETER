/* ফয়জার এআই কম্পোজ — ছবি-প্রস্তুতি (পর্ব ৫): ৪ কোণা টানা ও স্বয়ংক্রিয় কোণা-খোঁজা।
 * খাঁটি JS; কোনো বাহ্যিক লাইব্রেরি বা OpenCV নেই।
 * ব্রাউজার ও Node.js দুই পরিবেশেই কার্যকর।
 */
(function (root) {
  'use strict';

  /**
   * স্বয়ংক্রিয় কোণা-খোঁজা (ধূসর রং → প্রান্ত → সবচেয়ে বড় চতুর্ভুজ)
   * img: { data: Uint8Array|Uint8ClampedArray, width, height } বা ক্যানভাস/ইমেজ
   */
  function detectCorners(img) {
    let W, H, data;

    if (img.width && img.height && img.data) {
      W = img.width;
      H = img.height;
      data = img.data;
    } else if (typeof document !== 'undefined' && (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement)) {
      W = img.naturalWidth || img.width;
      H = img.naturalHeight || img.height;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      data = ctx.getImageData(0, 0, W, H).data;
    } else {
      throw new Error('অকার্যকর ছবি অবজেক্ট');
    }

    // হিসাবের গতির জন্য ছবিকে ছোট গ্রিডে নামানো (প্রস্থ ~২৪০)
    const targetW = 240;
    const scale = targetW / W;
    const sW = targetW;
    const sH = Math.max(10, Math.round(H * scale));

    const gray = new Float32Array(sW * sH);
    for (let y = 0; y < sH; y++) {
      const srcY = Math.min(H - 1, Math.floor(y / scale));
      for (let x = 0; x < sW; x++) {
        const srcX = Math.min(W - 1, Math.floor(x / scale));
        const idx = (srcY * W + srcX) * 4;
        gray[y * sW + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      }
    }

    // বর্ডার বনাম কেন্দ্রের উজ্জ্বলতা তুলনা
    let borderLum = 0, borderCount = 0;
    for (let x = 0; x < sW; x++) {
      borderLum += gray[x] + gray[(sH - 1) * sW + x];
      borderCount += 2;
    }
    for (let y = 0; y < sH; y++) {
      borderLum += gray[y * sW] + gray[y * sW + (sW - 1)];
      borderCount += 2;
    }
    borderLum /= Math.max(1, borderCount);

    let centerLum = 0, centerCount = 0;
    const cy0 = Math.floor(sH * 0.25), cy1 = Math.floor(sH * 0.75);
    const cx0 = Math.floor(sW * 0.25), cx1 = Math.floor(sW * 0.75);
    for (let y = cy0; y < cy1; y++) {
      for (let x = cx0; x < cx1; x++) {
        centerLum += gray[y * sW + x];
        centerCount++;
      }
    }
    centerLum /= Math.max(1, centerCount);

    // গ্রেডিয়েন্ট হিসাব (সোবেল/পার্থক্য)
    const grad = new Float32Array(sW * sH);
    let maxGrad = 0;
    for (let y = 1; y < sH - 1; y++) {
      for (let x = 1; x < sW - 1; x++) {
        const gx = Math.abs(gray[y * sW + (x + 1)] - gray[y * sW + (x - 1)]);
        const gy = Math.abs(gray[(y + 1) * sW + x] - gray[(y - 1) * sW + x]);
        const g = gx + gy;
        grad[y * sW + x] = g;
        if (g > maxGrad) maxGrad = g;
      }
    }

    // চারপাশ থেকে ভেতরের দিকে পাতার প্রান্ত খোঁজা
    const boundaryPts = [];
    const gThreshold = Math.max(22, maxGrad * 0.22);
    const isDarkBorder = (centerLum - borderLum) > 20;
    const lumThreshold = (centerLum + borderLum) / 2;

    for (let y = 2; y < sH - 2; y += 2) {
      // বাঁ থেকে ডানে
      for (let x = 0; x < sW / 2; x++) {
        const hit = isDarkBorder ? (gray[y * sW + x] >= lumThreshold) : (grad[y * sW + x] >= gThreshold);
        if (hit) { boundaryPts.push({ x, y }); break; }
      }
      // ডান থেকে বাঁয়ে
      for (let x = sW - 1; x >= sW / 2; x--) {
        const hit = isDarkBorder ? (gray[y * sW + x] >= lumThreshold) : (grad[y * sW + x] >= gThreshold);
        if (hit) { boundaryPts.push({ x, y }); break; }
      }
    }

    for (let x = 2; x < sW - 2; x += 2) {
      // ওপর থেকে নিচে
      for (let y = 0; y < sH / 2; y++) {
        const hit = isDarkBorder ? (gray[y * sW + x] >= lumThreshold) : (grad[y * sW + x] >= gThreshold);
        if (hit) { boundaryPts.push({ x, y }); break; }
      }
      // নিচ থেকে ওপরে
      for (let y = sH - 1; y >= sH / 2; y--) {
        const hit = isDarkBorder ? (gray[y * sW + x] >= lumThreshold) : (grad[y * sW + x] >= gThreshold);
        if (hit) { boundaryPts.push({ x, y }); break; }
      }
    }

    let tl = { x: 0, y: 0 }, tr = { x: sW, y: 0 }, br = { x: sW, y: sH }, bl = { x: 0, y: sH };

    if (boundaryPts.length >= 8) {
      let minSum = Infinity, maxSum = -Infinity;
      let minDiff = Infinity, maxDiff = -Infinity;
      for (const p of boundaryPts) {
        const s = p.x + p.y;
        const d = p.x - p.y;
        if (s < minSum) { minSum = s; tl = p; }
        if (s > maxSum) { maxSum = s; br = p; }
        if (d > maxDiff) { maxDiff = d; tr = p; }
        if (d < minDiff) { minDiff = d; bl = p; }
      }
    }

    const toOrig = (p) => ({
      x: Math.max(0, Math.min(W, Math.round(p.x / scale))),
      y: Math.max(0, Math.min(H, Math.round(p.y / scale)))
    });

    return [toOrig(tl), toOrig(tr), toOrig(br), toOrig(bl)];
  }

  /**
   * ব্রাউজারে ৪ কোণা টেনে বসানোর UI (Modal overlay with Canvas)
   */
  function openCornerEditor(imgItem, onApply, onCancel) {
    if (typeof document === 'undefined') return;

    // লোডিং বা ইমেজ অবজেক্ট তৈরি
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const W = img.naturalWidth || img.width;
      const H = img.naturalHeight || img.height;

      // প্রাথমিক স্বয়ংক্রিয় কোণা
      let currentCorners = detectCorners(img);

      // মোডাল কন্টেইনার
      const modal = document.createElement('div');
      modal.className = 'fz-corner-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:sans-serif;';

      const box = document.createElement('div');
      box.style.cssText = 'background:#1e293b;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);display:flex;flex-direction:column;max-width:95vw;max-height:92vh;overflow:hidden;border:1px solid #334155;';

      // শিরোনাম বার
      const header = document.createElement('div');
      header.style.cssText = 'padding:12px 18px;background:#0f172a;color:#f8fafc;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;';
      header.innerHTML = '<span style="font-weight:600;font-size:15px;">📐 পাতা সোজা ও ক্রপ করুন (৪ কোণা টেনে বসান)</span>';
      box.appendChild(header);

      // ক্যানভাস ভিউপোর্ট
      const viewContainer = document.createElement('div');
      viewContainer.style.cssText = 'position:relative;overflow:auto;display:flex;justify-content:center;align-items:center;padding:12px;background:#090d16;';

      const canvas = document.createElement('canvas');
      const maxCanvasW = Math.min(window.innerWidth * 0.82, 850);
      const maxCanvasH = Math.min(window.innerHeight * 0.65, 600);
      const viewScale = Math.min(maxCanvasW / W, maxCanvasH / H, 1);
      const cW = Math.round(W * viewScale);
      const cH = Math.round(H * viewScale);
      canvas.width = cW;
      canvas.height = cH;
      canvas.style.cssText = 'border-radius:6px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);cursor:crosshair;touch-action:none;';
      viewContainer.appendChild(canvas);
      box.appendChild(viewContainer);

      // টুলবার ও বোতাম
      const footer = document.createElement('div');
      footer.style.cssText = 'padding:12px 18px;background:#0f172a;display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #334155;flex-wrap:wrap;';

      const leftActions = document.createElement('div');
      leftActions.style.cssText = 'display:flex;gap:8px;';

      const btnAuto = document.createElement('button');
      btnAuto.type = 'button';
      btnAuto.textContent = '✨ স্বয়ংক্রিয় কোণা';
      btnAuto.style.cssText = 'padding:6px 12px;background:#334155;color:#f8fafc;border:none;border-radius:6px;cursor:pointer;font-size:13px;';
      btnAuto.onclick = () => {
        currentCorners = detectCorners(img);
        redraw();
      };

      const btnFull = document.createElement('button');
      btnFull.type = 'button';
      btnFull.textContent = '⛶ পুরো পাতা';
      btnFull.style.cssText = 'padding:6px 12px;background:#334155;color:#f8fafc;border:none;border-radius:6px;cursor:pointer;font-size:13px;';
      btnFull.onclick = () => {
        currentCorners = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
        redraw();
      };

      leftActions.appendChild(btnAuto);
      leftActions.appendChild(btnFull);

      const rightActions = document.createElement('div');
      rightActions.style.cssText = 'display:flex;gap:8px;';

      const btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.textContent = 'বাতিল';
      btnCancel.style.cssText = 'padding:6px 14px;background:#475569;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;';
      btnCancel.onclick = () => {
        document.body.removeChild(modal);
        if (typeof onCancel === 'function') onCancel();
      };

      const btnApply = document.createElement('button');
      btnApply.type = 'button';
      btnApply.textContent = '✔ সোজা করুন ও কাটুন';
      btnApply.style.cssText = 'padding:6px 16px;background:#0284c7;color:#fff;font-weight:600;border:none;border-radius:6px;cursor:pointer;font-size:13px;';
      btnApply.onclick = async () => {
        btnApply.textContent = 'প্রক্রিয়াকরণ হচ্ছে…';
        btnApply.disabled = true;
        try {
          // হোমোগ্রাফি ওয়ার্প
          const H_module = root.FayzarHomography;
          const warped = H_module.warpCanvas(img, currentCorners);

          // আলো সমান করা (light-blur)
          const LB_module = root.FayzarLightBlur;
          if (LB_module && LB_module.equalizeIllumination) {
            const wctx = warped.canvas.getContext('2d');
            const wdata = wctx.getImageData(0, 0, warped.canvas.width, warped.canvas.height);
            const eq = LB_module.equalizeIllumination(wdata);
            wctx.putImageData(new ImageData(eq.data, eq.width, eq.height), 0, 0);
          }

          // ফলস্বরূপ আইটেম তৈরি
          const dataUrl = warped.canvas.toDataURL('image/jpeg', 0.92);
          warped.canvas.toBlob((blob) => {
            const outName = (imgItem.name || 'image').replace(/\.[^.]+$/, '') + '_prep.jpg';
            const file = blob ? new File([blob], outName, { type: 'image/jpeg' }) : null;
            const newItem = {
              file: file,
              name: outName,
              size: blob ? blob.size : dataUrl.length,
              isPdf: false,
              mimeType: 'image/jpeg',
              base64: dataUrl,
              w: warped.canvas.width,
              h: warped.canvas.height,
              paper: warped.paper,
              rawOriginal: imgItem.rawOriginal || imgItem
            };
            document.body.removeChild(modal);
            if (typeof onApply === 'function') onApply(newItem);
          }, 'image/jpeg', 0.92);
        } catch (err) {
          console.error(err);
          alert('ওয়ার্প করতে সমস্যা: ' + err.message);
          btnApply.textContent = '✔ সোজা করুন ও কাটুন';
          btnApply.disabled = false;
        }
      };

      rightActions.appendChild(btnCancel);
      rightActions.appendChild(btnApply);

      footer.appendChild(leftActions);
      footer.appendChild(rightActions);
      box.appendChild(footer);
      modal.appendChild(box);
      document.body.appendChild(modal);

      // ক্যানভাসে ছবি ও ৪ কোণা আঁকার লজিক
      const ctx = canvas.getContext('2d');
      let dragIdx = -1;
      const handleRadius = 14;

      function redraw() {
        ctx.clearRect(0, 0, cW, cH);
        ctx.drawImage(img, 0, 0, cW, cH);

        // ভিউ স্কেলে কোণাগুলো
        const vPts = currentCorners.map((p) => ({
          x: p.x * viewScale,
          y: p.y * viewScale
        }));

        // বাইরে অন্ধকার ছায়া
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.rect(0, 0, cW, cH);
        ctx.moveTo(vPts[0].x, vPts[0].y);
        ctx.lineTo(vPts[3].x, vPts[3].y);
        ctx.lineTo(vPts[2].x, vPts[2].y);
        ctx.lineTo(vPts[1].x, vPts[1].y);
        ctx.closePath();
        ctx.fill();

        // চতুর্ভুজের সীমানা রেখা
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(vPts[0].x, vPts[0].y);
        ctx.lineTo(vPts[1].x, vPts[1].y);
        ctx.lineTo(vPts[2].x, vPts[2].y);
        ctx.lineTo(vPts[3].x, vPts[3].y);
        ctx.closePath();
        ctx.stroke();

        // ৪টি হ্যান্ডেল আঁকা
        const labels = ['TL', 'TR', 'BR', 'BL'];
        vPts.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, handleRadius, 0, Math.PI * 2);
          ctx.fillStyle = dragIdx === idx ? '#f59e0b' : '#0284c7';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // লেবেল
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[idx], p.x, p.y);
        });
      }

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left),
          y: (e.clientY - rect.top)
        };
      }

      canvas.addEventListener('pointerdown', (e) => {
        const pos = getPos(e);
        const vPts = currentCorners.map((p) => ({ x: p.x * viewScale, y: p.y * viewScale }));
        dragIdx = -1;
        for (let i = 0; i < 4; i++) {
          const d = Math.hypot(vPts[i].x - pos.x, vPts[i].y - pos.y);
          if (d <= handleRadius + 6) {
            dragIdx = i;
            canvas.setPointerCapture(e.pointerId);
            redraw();
            break;
          }
        }
      });

      canvas.addEventListener('pointermove', (e) => {
        if (dragIdx >= 0) {
          const pos = getPos(e);
          const origX = Math.max(0, Math.min(W, Math.round(pos.x / viewScale)));
          const origY = Math.max(0, Math.min(H, Math.round(pos.y / viewScale)));
          currentCorners[dragIdx] = { x: origX, y: origY };
          redraw();
        } else {
          const pos = getPos(e);
          const vPts = currentCorners.map((p) => ({ x: p.x * viewScale, y: p.y * viewScale }));
          const hovering = vPts.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) <= handleRadius + 6);
          canvas.style.cursor = hovering ? 'pointer' : 'crosshair';
        }
      });

      canvas.addEventListener('pointerup', (e) => {
        if (dragIdx >= 0) {
          try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
          dragIdx = -1;
          redraw();
        }
      });

      redraw();
    };

    if (imgItem.base64) {
      img.src = imgItem.base64;
    } else if (imgItem.file) {
      const url = URL.createObjectURL(imgItem.file);
      img.onload = ((origOnload) => () => {
        URL.revokeObjectURL(url);
        origOnload();
      })(img.onload);
      img.src = url;
    }
  }

  const api = {
    detectCorners: detectCorners,
    openCornerEditor: openCornerEditor
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FayzarCorners = api;
})(typeof window !== 'undefined' ? window : globalThis);
