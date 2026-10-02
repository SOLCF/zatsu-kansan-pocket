// 日付まわりの純関数（DOMに依存しない。単体テスト対象）。
// 日付は「1970-01-01 からの日数」（整数）で扱う。時刻やタイムゾーンの影響を受けないよう、UTCで数える。

const DAY = 86400000;
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
export const MAX_DAYS = 2_900_000; // 西暦 ±7900 年ほど。これより外は日付として扱わない

export function dayNumber(y, m, d) {
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d); // new Date(y, ...) だと 0〜99年が 1900年代になるため
  return Math.round(t.getTime() / DAY);
}

export function ymd(days) {
  const t = new Date(days * DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const pad = (n) => String(n).padStart(2, '0');

// <input type="date"> の値（YYYY-MM-DD）との相互変換
export function toIso(days) {
  const { y, m, d } = ymd(days);
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

export function parseIso(s) {
  const m = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const n = dayNumber(y, mo, d);
  const c = ymd(n);
  return c.y === y && c.m === mo && c.d === d ? n : NaN; // 2月30日などは NaN
}

// 端末の「今日」（端末の日付で数える）
export function todayDays(now = new Date()) {
  return dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export const inRange = (days) => Number.isFinite(days) && Math.abs(days) <= MAX_DAYS;
export const weekdayName = (days) => WEEK[(((days + 4) % 7) + 7) % 7]; // 1970-01-01 は木曜
export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function dateText(days) {
  const { y, m, d } = ymd(days);
  return `${y}年${m}月${d}日（${weekdayName(days)}）`;
}

// ---- 元号 ----
// 開始日（新暦）。明治は新暦に改まった1873年より前は旧暦なので、1868-10-23 以降だけを対象にする。
export const ERAS = [
  { name: '令和', startYear: 2019, start: [2019, 5, 1] },
  { name: '平成', startYear: 1989, start: [1989, 1, 8] },
  { name: '昭和', startYear: 1926, start: [1926, 12, 25] },
  { name: '大正', startYear: 1912, start: [1912, 7, 30] },
  { name: '明治', startYear: 1868, start: [1868, 10, 23] },
].map((e, i, all) => ({ ...e, endYear: i === 0 ? Infinity : all[i - 1].startYear })); // 次の元号が始まる年（その年は両方の元号にまたがる）

export const eraYearText = (era, n) => `${era}${n === 1 ? '元' : n}年`;

// 西暦の年 → その年が属する元号（改元の年は2つ。古い順）
export function warekiOfYear(y) {
  return ERAS.filter((e) => y >= e.startYear && y <= e.endYear)
    .map((e) => ({ era: e.name, n: y - e.startYear + 1 }))
    .reverse();
}

// 元号と和暦の年 → 西暦（範囲外は null。昭和は64年まで、など）
export function seirekiOfWareki(eraName, n) {
  const e = ERAS.find((x) => x.name === eraName);
  if (!e || !Number.isInteger(n) || n < 1) return null;
  const len = e.endYear === Infinity ? Infinity : e.endYear - e.startYear + 1;
  return n <= len ? e.startYear + n - 1 : null;
}

// 日付 → 元号と年（明治より前は null）
export function warekiOfDate(days) {
  const { y } = ymd(days);
  for (const e of ERAS) {
    if (days >= dayNumber(...e.start)) return { era: e.name, n: y - e.startYear + 1 };
  }
  return null;
}

// ---- 干支 ----
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const eto = (y) => STEMS[(((y - 4) % 10) + 10) % 10] + BRANCHES[(((y - 4) % 12) + 12) % 12];

// ---- 年齢 ----
// 誕生日が2月29日の人は、うるう年でない年は3月1日に年をとる（「年齢計算ニ関スル法律」の考え方）。
const birthdayIn = (b, year) => (b.m === 2 && b.d === 29 && !isLeap(year) ? { m: 3, d: 1 } : { m: b.m, d: b.d });
const before = (a, b) => a.m < b.m || (a.m === b.m && a.d < b.d);

export function ageInfo(birthDays, asOfDays) {
  if (!inRange(birthDays) || !inRange(asOfDays) || asOfDays < birthDays) return null;
  const b = ymd(birthDays);
  const a = ymd(asOfDays);
  const age = a.y - b.y - (before(a, birthdayIn(b, a.y)) ? 1 : 0);
  let next = birthdayIn(b, a.y);
  let nextYear = a.y;
  if (before(a, next)) {
    /* 今年の誕生日はまだ */
  } else if (a.m === next.m && a.d === next.d) {
    /* 今日が誕生日 */
  } else {
    nextYear = a.y + 1;
    next = birthdayIn(b, nextYear);
  }
  const nextDays = dayNumber(nextYear, next.m, next.d);
  return { age, kazoe: a.y - b.y + 1, lived: asOfDays - birthDays, toNext: nextDays - asOfDays, nextDays };
}

// 日数 → 「3週間2日」
export function weeksDays(n) {
  const a = Math.abs(n);
  const w = Math.floor(a / 7);
  const d = a % 7;
  if (w === 0) return `${d}日`;
  return d === 0 ? `${w}週間` : `${w}週間${d}日`;
}
