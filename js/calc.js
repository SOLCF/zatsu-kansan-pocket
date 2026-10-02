// 計算型の共通ロジック（DOMに依存しない純関数。単体テスト対象）。
//
// 項目定義の形:
//   fields:      入力欄。{ key, label, unit, param?, readonly? }
//                param は計算の「条件」として入力する欄（他の欄の入力で消えない）
//   assumptions: 前提値。{ key, label, unit, value, myKey? }  myKey があればマイ基準値を初期値に使う
//   compute(changedKey, value, values, assumptions) -> 全欄の値（求まらない欄は null）

export function defaultAssumptions(item, myValues = {}) {
  const a = {};
  for (const s of item.assumptions ?? []) {
    a[s.key] = s.myKey && Number.isFinite(myValues[s.myKey]) ? myValues[s.myKey] : s.value;
  }
  return a;
}

// 「共通の基準量」を介して全欄を相互換算する項目用のヘルパー。
// 各欄に toBase(v, a) / fromBase(b, a) を持たせるだけで、どの欄に入力しても他が更新される。
export function baseCompute(fields) {
  return (key, value, values, a) => {
    const src = fields.find((f) => f.key === key);
    const base = src.toBase(value, a);
    const out = { ...values };
    for (const f of fields) out[f.key] = f.key === key ? value : f.fromBase(base, a);
    return out;
  };
}

export const isNum = (x) => Number.isFinite(x);

// 入力欄の文字を数値にする。全角数字・全角記号（日本語キーボード）、桁区切りのカンマ、空白を許す。
// 数値として読めない文字（空欄を含む）は NaN。「0x10」のような16進などは受け付けない。
const FULLWIDTH = { '．': '.', '，': ',', '－': '-', '−': '-', '＋': '+' };
export function parseNumber(s) {
  const t = String(s)
    .replace(/[０-９．，－−＋]/g, (c) => FULLWIDTH[c] ?? String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,\s]/g, '');
  return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t) ? Number(t) : NaN;
}

// 計算結果を欄に書き戻すか。欄の文字が「厳密な値」または「表示用に丸めた値」と同じなら、そのまま残す。
// （ユーザーが入れた 1234 を、別の欄を触ったときに 1230 へ丸めてしまわないため）
export function shouldWrite(cur, exact, shown) {
  const c = Number.isFinite(cur) ? cur : null;
  return c !== shown && c !== exact;
}

// 目安表示型: 値が入る帯（min以上max未満）を返す。どれにも入らなければ null。
// 帯の定義: { min, max, label, range, details: [[見出し, 説明]...], ... }（max は最後だけ Infinity）
export function findBand(bands, v) {
  if (!isNum(v) || v < 0) return null;
  return bands.find((b) => v >= b.min && v < b.max) ?? null;
}
