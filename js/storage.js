// localStorage への保存。使えない環境（プライベートモード等）でも落ちないようにする。
import { MY_VALUE_DEFS } from './data/myvalues.js';

const KEY = 'zkp.myValues';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

// 保存値＋初期値をマージしたマイ基準値
export function getMyValues() {
  const saved = load();
  const out = {};
  for (const d of MY_VALUE_DEFS) out[d.key] = Number.isFinite(saved[d.key]) ? saved[d.key] : d.value;
  return out;
}

export function setMyValue(key, value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), [key]: value }));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

export function resetMyValues() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
