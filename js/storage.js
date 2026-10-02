// localStorage への保存。使えない環境（プライベートモード等）でも落ちないようにする。
import { MY_VALUE_DEFS } from './data/myvalues.js';
import { normalizeTheme } from './theme.js';

const KEYS = { myValues: 'zkp.myValues', favorites: 'zkp.favorites', theme: 'zkp.theme', groups: 'zkp.groups' };

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

function readJson(key, fallback) {
  try {
    return JSON.parse(read(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

// ---- マイ基準値 ----

// 保存値＋初期値をマージしたマイ基準値
export function getMyValues() {
  const saved = readJson(KEYS.myValues, {});
  const out = {};
  for (const d of MY_VALUE_DEFS) out[d.key] = Number.isFinite(saved[d.key]) ? saved[d.key] : d.value;
  return out;
}

export function setMyValue(key, value) {
  write(KEYS.myValues, JSON.stringify({ ...readJson(KEYS.myValues, {}), [key]: value }));
}

export function resetMyValues() {
  try {
    localStorage.removeItem(KEYS.myValues);
  } catch {
    /* noop */
  }
}

// ---- お気に入り（項目のid） ----

export function getFavorites() {
  const v = readJson(KEYS.favorites, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

export const isFavorite = (id) => getFavorites().includes(id);

// 付け外しして、操作後にお気に入りになっているかを返す
export function toggleFavorite(id) {
  const list = getFavorites();
  const on = !list.includes(id);
  write(KEYS.favorites, JSON.stringify(on ? [...list, id] : list.filter((x) => x !== id)));
  return on;
}

// ---- ホームのジャンルの開閉（名前 → 開いているか） ----
// 保存が無いジャンルは fallback（既定は閉じている）。お気に入り欄は呼び出し側が fallback=true で開いた状態から始める。

function readGroups() {
  const v = readJson(KEYS.groups, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

export function getGroupOpen(name, fallback = false) {
  const v = readGroups()[name];
  return typeof v === 'boolean' ? v : fallback;
}

export function setGroupOpen(name, open) {
  write(KEYS.groups, JSON.stringify({ ...readGroups(), [name]: open }));
}

// 全ジャンルをまとめて開く／閉じる
export function setAllGroupsOpen(names, open) {
  write(KEYS.groups, JSON.stringify({ ...readGroups(), ...Object.fromEntries(names.map((n) => [n, open])) }));
}

// ---- 画面の色 ----

export function getTheme() {
  return normalizeTheme(read(KEYS.theme));
}

export function setTheme(mode) {
  write(KEYS.theme, normalizeTheme(mode));
}
