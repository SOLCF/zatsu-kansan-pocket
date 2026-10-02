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
