// 画面の色（ライト／ダーク）。'auto' は端末（OS）の設定に従う。
// index.html の先頭にも同じ内容の小さなスクリプトがあり、画面が描かれる前に適用してちらつきを防ぐ。
export const THEMES = [
  { value: 'auto', label: '端末の設定に合わせる' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
];

// 不正な値は 'auto' に戻す
export function normalizeTheme(value) {
  return THEMES.some((t) => t.value === value) ? value : 'auto';
}

// <html data-theme="light|dark"> を付ける。auto のときは付けない（CSS が端末の設定に従う）。
export function applyTheme(mode, root = document.documentElement) {
  const m = normalizeTheme(mode);
  if (m === 'auto') delete root.dataset.theme;
  else root.dataset.theme = m;
}
