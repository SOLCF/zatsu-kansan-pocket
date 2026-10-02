// 表示用の丸め・整形。結果は「約」を付けて有効数字2〜3桁に丸める。

export function roundSig(x, sig = 3) {
  if (!Number.isFinite(x) || x === 0) return 0;
  return Number(x.toPrecision(sig));
}

export function fmtNum(x, sig = 3) {
  return roundSig(x, sig).toLocaleString('ja-JP', { maximumFractionDigits: 6 });
}

export function approx(x, unit = '', sig = 3) {
  return `約${fmtNum(x, sig)}${unit}`;
}

// 幅のある値は範囲で示す（例：約210〜250g）
export function approxRange(lo, hi, unit = '', sig = 2) {
  return `約${fmtNum(lo, sig)}〜${fmtNum(hi, sig)}${unit}`;
}

// 金額。1万円以上は「万円」、1億円以上は「億円」で読みやすくする。
export function yen(x, sig = 3) {
  if (Math.abs(x) >= 1e8) return `${fmtNum(x / 1e8, sig)}億円`;
  if (Math.abs(x) >= 1e4) return `${fmtNum(x / 1e4, sig)}万円`;
  return `${fmtNum(x, sig)}円`;
}

export function approxYen(x, sig = 3) {
  return `約${yen(x, sig)}`;
}

// 金額の範囲（例：約23〜26万円）。両端が万円以上なら単位は末尾に1回だけ付ける。
export function approxYenRange(lo, hi, sig = 2) {
  if (Math.abs(lo) >= 1e4 && Math.abs(hi) < 1e8) return `約${fmtNum(lo / 1e4, sig)}〜${fmtNum(hi / 1e4, sig)}万円`;
  return `約${fmtNum(lo, sig)}〜${fmtNum(hi, sig)}円`;
}

// ドル。「約$0.08」
export function approxUsd(x, sig = 3) {
  return `約$${fmtNum(x, sig)}`;
}

// 分 → 「約1時間12分」「約45分」
export function approxHourMin(min) {
  const m = Math.round(min);
  if (m < 60) return `約${m}分`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `約${h}時間` : `約${h}時間${r}分`;
}

export function approxMinSec(sec) {
  const s = Math.round(sec);
  if (s < 60) return `約${s}秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `約${m}分` : `約${m}分${r}秒`;
}
