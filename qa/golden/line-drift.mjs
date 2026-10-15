// v1 lineBands & alignBands (প্রস্থজুড়ে অনুভূমিক কালি-ছায়া; কেবল আনুভূমিক রেখা বাদ)
export function lineBands(mask, w, h, px) {
  const work = new Uint8Array(mask);
  const pad = Math.max(1, Math.round(1.5 * px));
  for (let y = 0; y < h; y++) {
    let run = 0, maxR = 0;
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) { run++; if (run > maxR) maxR = run; } else run = 0; }
    if (maxR >= w * 0.25) for (let yy = Math.max(0, y - pad); yy <= Math.min(h - 1, y + pad); yy++) for (let x = 0; x < w; x++) work[yy * w + x] = 0;
  }
  const minH = Math.max(2, Math.round(2 * px));
  const rowInk = new Int32Array(h), rowX0 = new Int32Array(h), rowX1 = new Int32Array(h);
  for (let y = 0; y < h; y++) {
    let cnt = 0, x0 = w, x1 = -1;
    for (let x = 0; x < w; x++) {
      if (work[y * w + x]) { cnt++; if (x < x0) x0 = x; x1 = x; }
    }
    if (cnt >= Math.max(2, Math.round(px))) { rowInk[y] = cnt; rowX0[y] = x0; rowX1[y] = x1; }
  }
  const bands = [];
  let y0 = -1, bx0 = w, bx1 = -1;
  for (let y = 0; y <= h; y++) {
    if (y < h && rowInk[y] > 0) {
      if (y0 < 0) { y0 = y; bx0 = rowX0[y]; bx1 = rowX1[y]; }
      else { if (rowX0[y] < bx0) bx0 = rowX0[y]; if (rowX1[y] > bx1) bx1 = rowX1[y]; }
    } else if (y0 >= 0) {
      if (y - y0 >= minH) bands.push({ y0, y1: y - 1, x0: bx0, x1: bx1 });
      y0 = -1;
    }
  }
  return bands;
}

export function alignBands(A, B, h) {
  const maxD = h * 0.08;
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const pick = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      let best = dp[i + 1][j], way = 1;
      if (dp[i][j + 1] > best) { best = dp[i][j + 1]; way = 2; }
      const d = Math.abs((A[i].y0 + A[i].y1) / 2 - (B[j].y0 + B[j].y1) / 2);
      if (d <= maxD) {
        const sc = 1 + (1 - d / maxD) * 0.5 + dp[i + 1][j + 1];
        if (sc >= best) { best = sc; way = 3; }
      }
      dp[i][j] = best; pick[i][j] = way;
    }
  }
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (pick[i][j] === 3) { pairs.push([i++, j++]); }
    else if (pick[i][j] === 1) i++;
    else j++;
  }
  return pairs;
}
