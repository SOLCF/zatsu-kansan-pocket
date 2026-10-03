// 日付の換算項目（西暦⇄和暦・日数計算・年齢）。日付は端末の時計と標準の計算だけで求める（外部通信なし）。
// 元号の開始年: 令和2019・平成1989・昭和1926・大正1912・明治1868（改元の年は両方の元号にまたがる）。
// 干支は (西暦−4) を10と12で割った余り。年齢は満年齢（誕生日で年をとる）と数え年（年−生まれ年+1）。
import { isNum } from '../../calc.js';
import { fmtNum } from '../../format.js';
import {
  ERAS, inRange, todayDays, dateText, ymd, weeksDays,
  eraYearText, warekiOfYear, seirekiOfWareki, warekiOfDate, eto, ageInfo,
} from '../../dates.js';

const today = () => todayDays();
const warekiText = (days) => {
  const w = warekiOfDate(days);
  return w ? eraYearText(w.era, w.n) : null;
};

// ---- 西暦⇄和暦 ----
// 年だけを換算する。改元の年は2つの元号を併記（1989年＝昭和64年・平成元年、など）。
export function describeWareki(seireki, thisYear) {
  if (!isNum(seireki)) return [];
  const list = warekiOfYear(seireki);
  const lines = [
    list.length
      ? `${seireki}年 ＝ ${list.map((w) => eraYearText(w.era, w.n)).join('・')}`
      : `${seireki}年は明治より前で、元号の換算の対象外です`,
  ];
  if (Number.isInteger(seireki)) lines.push(`干支：${eto(seireki)}`);
  const diff = thisYear - seireki;
  if (diff === 0) lines.push(`${thisYear}年は今年です（今年生まれなら0歳）`);
  else if (Number.isInteger(diff) && diff > 0 && diff <= 130) lines.push(`${thisYear}年に ${diff}歳になる年（誕生日の前は${diff - 1}歳）`);
  return lines;
}

export const wareki = {
  id: 'wareki',
  genre: '日付',
  title: '西暦⇄和暦',
  kind: 'calc',
  hint: '西暦 ⇄ 和暦、干支、今年の年齢',
  computeOnLoad: true,
  selects: [
    {
      key: 'era',
      label: '元号（和暦から西暦に直すとき）',
      default: '令和',
      options: ERAS.map((e) => ({ value: e.name, label: e.name, set: { eraName: e.name } })),
    },
  ],
  fields: [
    // 最初は今年（端末の日付）。開いた時点で和暦・干支まで出る
    { key: 'seireki', label: '西暦', unit: '年', integer: true, exact: true, default: () => new Date().getFullYear() },
    { key: 'wareki', label: '和暦の年', unit: '年', integer: true, exact: true },
  ],
  assumptions: [],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (key === 'seireki') {
      const era = ERAS.find((e) => e.name === a.eraName);
      const n = value - era.startYear + 1;
      out.wareki = seirekiOfWareki(era.name, n) === value ? n : null; // 選んだ元号の範囲外は空欄（下の説明に全元号を出す）
    } else {
      out.seireki = seirekiOfWareki(a.eraName, value);
    }
    return out;
  },
  describe: (v, a) => {
    if (isNum(v.seireki)) return describeWareki(v.seireki, new Date().getFullYear());
    if (isNum(v.wareki)) {
      const e = ERAS.find((x) => x.name === a.eraName);
      const len = e.endYear === Infinity ? null : e.endYear - e.startYear + 1;
      return [len ? `${e.name}は${len}年まで（${e.startYear}〜${e.endYear}年）です` : `${e.name}は${e.startYear}年から始まっています`];
    }
    return [];
  },
  note: '改元の年は、1月から改元日までは古い元号、その後は新しい元号です（この画面では年だけを換算します）。',
};

// ---- 日数計算 ----
// 起点日＋日数＝終点日。どれを入れても他が求まる。日数は負の数（○日前）も使える。
export const datecalc = {
  id: 'datecalc',
  genre: '日付',
  title: '日数計算',
  kind: 'calc',
  hint: '○日後・○日前、2つの日付の間の日数',
  fields: [
    { key: 'start', label: '起点の日付', unit: '', type: 'date', param: true, signed: true, default: today },
    { key: 'days', label: '日数（マイナスは○日前）', unit: '日', integer: true, exact: true, signed: true },
    { key: 'end', label: '終点の日付', unit: '', type: 'date', signed: true, exact: true },
  ],
  assumptions: [],
  compute: (key, value, values) => {
    const out = { ...values, [key]: value };
    if (key === 'end') {
      out.days = isNum(out.start) ? value - out.start : null;
    } else if (key === 'days') {
      // 日数は整数だけ（「1.5日後」は日付にならない）
      out.end = isNum(out.start) && Number.isInteger(value) ? out.start + value : null;
    } else if (isNum(out.days)) {
      out.end = out.start + out.days; // 起点を変えたら、日数を保ったまま終点が動く
    } else if (isNum(out.end)) {
      out.days = out.end - out.start;
    }
    if (isNum(out.end) && !inRange(out.end)) Object.assign(out, { end: null, days: key === 'days' ? out.days : null });
    return out;
  },
  describe: (v) => {
    if (!isNum(v.start) || !isNum(v.days) || !isNum(v.end)) return [];
    const lines = [`${dateText(v.start)} ${v.days >= 0 ? 'から' : 'の'} ${Math.abs(v.days)}日${v.days >= 0 ? '後' : '前'} ＝ ${dateText(v.end)}`];
    lines.push(`${weeksDays(v.days)}（両端の日を含めて数えると ${Math.abs(v.days) + 1}日間）`);
    const months = Math.abs(v.days) / 30.44;
    if (months >= 1) lines.push(`およそ ${fmtNum(months, 2)}か月（1か月＝約30.4日として）`);
    const w = warekiText(v.end);
    if (w) lines.push(`終点の日付は ${w}`);
    return lines;
  },
  note: '起点の日付は、最初は今日（端末の日付）です。「何日間」と数えるとき、起点の日を1日目に含めるかは場面で違うので、両端を含めた日数も添えています。',
};

// ---- 厄年 ----
// 本厄は数え年で 男性 25・42・61、女性 19・33・37・61（一般に広く言われる目安。大厄は男性42・女性33）。
// 本厄の前の年が前厄、後の年が後厄。社寺や地域、数え年を元日で数えるか立春で数えるかで扱いが違う。
export const YAKU = {
  m: { label: '男性', hon: [25, 42, 61], taiyaku: 42 },
  f: { label: '女性', hon: [19, 33, 37, 61], taiyaku: 33 },
};

// 数え年 kazoe の人の厄年判定。{ status:'前厄'|'本厄'|'後厄'|null, hon, next:{ hon, years }|null }
// next は今の年より先にある次の前厄の始まりまでの年数（今が厄年の最中ならその後の次の厄年）。
export function yakudoshi(kazoe, sex) {
  const rule = YAKU[sex];
  if (!rule || !Number.isInteger(kazoe)) return null;
  let status = null;
  let hon = null;
  for (const h of rule.hon) {
    if (kazoe === h - 1) [status, hon] = ['前厄', h];
    else if (kazoe === h) [status, hon] = ['本厄', h];
    else if (kazoe === h + 1) [status, hon] = ['後厄', h];
  }
  const nextHon = rule.hon.find((h) => h - 1 > kazoe);
  return { status, hon, taiyaku: hon === rule.taiyaku, next: nextHon ? { hon: nextHon, years: nextHon - 1 - kazoe } : null };
}

export function describeYakudoshi(kazoe, sex, birthYear) {
  const y = yakudoshi(kazoe, sex);
  if (!y) return [];
  const yearOf = (n) => `${birthYear + n - 1}年`;
  const lines = [];
  if (y.status) {
    lines.push(`数え年${kazoe}歳：${y.status}${y.taiyaku && y.status === '本厄' ? '（大厄）' : ''}にあたる目安です（本厄は数え${y.hon}歳＝${yearOf(y.hon)}）`);
  } else {
    lines.push(`数え年${kazoe}歳：いまは厄年にあたりません`);
  }
  if (y.next) {
    const when = y.next.years === 1 ? '来年' : `${y.next.years}年後`;
    lines.push(`次の前厄は${when}（数え${y.next.hon - 1}歳＝${yearOf(y.next.hon - 1)}）、本厄は数え${y.next.hon}歳（${yearOf(y.next.hon)}）`);
  }
  return lines;
}

// ---- 年齢 ----
export const age = {
  id: 'age',
  genre: '日付',
  title: '年齢',
  kind: 'calc',
  hint: '生年月日 → 満年齢・数え年・次の誕生日まで・厄年',
  selects: [
    {
      key: 'sex',
      label: '厄年の判定（性別）',
      default: 'm',
      options: [
        { value: 'm', label: '男性', set: { sex: 'm' } },
        { value: 'f', label: '女性', set: { sex: 'f' } },
      ],
    },
  ],
  fields: [
    { key: 'birth', label: '生年月日', unit: '', type: 'date', signed: true, exact: true },
    { key: 'asOf', label: 'いつ時点か', unit: '', type: 'date', param: true, signed: true, default: today },
    { key: 'age', label: '満年齢', unit: '歳', readonly: true, integer: true, exact: true },
    { key: 'kazoe', label: '数え年', unit: '歳', readonly: true, integer: true, exact: true },
    { key: 'lived', label: '生まれてからの日数', unit: '日', readonly: true, integer: true, exact: true },
    { key: 'toNext', label: '次の誕生日まで', unit: '日', readonly: true, integer: true, exact: true },
  ],
  assumptions: [],
  compute: (key, value, values) => {
    const out = { ...values, [key]: value };
    const info = isNum(out.birth) && isNum(out.asOf) ? ageInfo(out.birth, out.asOf) : null;
    Object.assign(out, info ? { age: info.age, kazoe: info.kazoe, lived: info.lived, toNext: info.toNext } : { age: null, kazoe: null, lived: null, toNext: null });
    return out;
  },
  describe: (v, a) => {
    if (!isNum(v.birth) || !isNum(v.asOf)) return [];
    if (!isNum(v.age)) return ['「いつ時点か」が生年月日より前になっています'];
    const info = ageInfo(v.birth, v.asOf);
    const b = ymd(v.birth);
    const lines = [`${dateText(v.birth)} 生まれ（${warekiText(v.birth) ?? '明治より前'}・干支 ${eto(b.y)}）`];
    lines.push(info.toNext === 0 ? '今日が誕生日です' : `次の誕生日は ${dateText(info.nextDays)}（あと${info.toNext}日）`);
    lines.push(...describeYakudoshi(info.kazoe, a.sex, b.y));
    return lines;
  },
  note: '満年齢は誕生日がくると1つ増えます。数え年は生まれた年を1歳とし、元日ごとに1つ増えます。2月29日生まれは、うるう年でない年は3月1日に年をとるとして数えています。厄年は数え年での目安です（男性25・42・61歳、女性19・33・37・61歳。前後の年が前厄・後厄）。社寺や地域で数え方・年齢が違うことがあります。',
};

export const dateItems = [wareki, datecalc, age];
