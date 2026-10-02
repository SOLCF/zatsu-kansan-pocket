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

export function approxMinSec(sec) {
  const s = Math.round(sec);
  if (s < 60) return `約${s}秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `約${m}分` : `約${m}分${r}秒`;
}
