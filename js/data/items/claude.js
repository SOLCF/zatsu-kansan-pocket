// ジャンル「Claude」: トークンと文章量・料金の換算。数字は「だいたい」の目安。
// 料金は Anthropic の公式料金表（https://platform.claude.com/docs/en/about-claude/pricing）を取得した値で、
// 改定されうる。外部通信はしないので、更新は PRICES_AS_OF と MODELS を書き換えて反映する。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxRange, approxYen, approxUsd, fmtNum } from '../../format.js';

export const PRICES_AS_OF = '2026-10-03';

// モデルごとの料金（USD / 100万トークン）。pRead はキャッシュ読み取り。
//   5分キャッシュ書き込みは入力の1.25倍、バッチは入力・出力とも50%引き（公式料金表）。
//   hires: 画像の高解像度ティア（Claude 4.7 以降のモデル）。ctx: コンテキストウィンドウ（トークン）。
//   n: マイ基準値「使うモデル」の識別番号（設定画面の選択式は数値で保存するため）。
export const MODELS = [
  { n: 1, id: 'fable51', label: 'Claude Fable 5.1', pIn: 10, pOut: 50, pRead: 0.25, ctx: 1_000_000, hires: true },
  { n: 2, id: 'opus55', label: 'Claude Opus 5.5', pIn: 4, pOut: 20, pRead: 0.2, ctx: 1_000_000, hires: true },
  { n: 3, id: 'opus5', label: 'Claude Opus 5', pIn: 5, pOut: 25, pRead: 0.5, ctx: 1_000_000, hires: true },
  { n: 4, id: 'sonnet55', label: 'Claude Sonnet 5.5', pIn: 2, pOut: 10, pRead: 0.2, ctx: 1_000_000, hires: true },
  { n: 5, id: 'sonnet46', label: 'Claude Sonnet 4.6', pIn: 3, pOut: 15, pRead: 0.3, ctx: 1_000_000, hires: false },
  { n: 6, id: 'haiku45', label: 'Claude Haiku 4.5', pIn: 1, pOut: 5, pRead: 0.1, ctx: 200_000, hires: false },
];
export const DEFAULT_MODEL_N = 4;

const modelOption = (m) => ({
  value: m.id,
  label: `${m.label}（$${m.pIn} / $${m.pOut}）`,
  set: { idx: m.n, pIn: m.pIn, pOut: m.pOut, pRead: m.pRead, ctx: m.ctx, hires: m.hires ? 1 : 0 },
});
// 使うモデルの選択（マイ基準値 claudeModel の値＝識別番号 n と一致する選択肢を初期選択にする）
const modelSelect = (label = 'モデル') => ({
  key: 'model',
  label,
  myKey: 'claudeModel',
  by: 'idx',
  default: MODELS.find((m) => m.n === DEFAULT_MODEL_N).id,
  options: MODELS.map(modelOption),
});
const PRICE_ASSUMPTIONS = [
  { key: 'pIn', label: '入力', unit: '$/百万トークン', value: 2 },
  { key: 'pOut', label: '出力', unit: '$/百万トークン', value: 10 },
  { key: 'pRead', label: 'キャッシュ読み取り', unit: '$/百万トークン', value: 0.2 },
];
const RATE = { key: 'usdJpy', label: '為替レート', unit: '円/ドル', value: 158, myKey: 'usdJpy' };
// 厳密な整数（上限値・回数など）は丸めずに表示する（fmtNum は有効数字3桁に丸める）
const int = (x) => Number(x).toLocaleString('ja-JP');
const PRICE_NOTE =`料金は${PRICES_AS_OF}時点の公式料金表です。改定されるので、最新は公式ページで確認してください。`;

// ---- 文章量とトークン ----
// 英語は 1トークン≒約4文字≒約0.75語（公式FAQ）→ 1語≒1.33トークン。
// 日本語は公式に数字がなく、ブログ等の実測で「1文字あたり約1〜2トークン」「1Mコンテキストで約70〜75万字」
//   → 代表値 1.4トークン/字（幅は1〜2）。Claude 4.7以降は新しいトークナイザーで同じ文章が約30%増えるが、
//   日本語は影響が小さいとの報告もある。いずれも目安。
//   出典: https://platform.claude.com/docs/en/about-claude/pricing ／ https://www.ebisuda.net/tech/2026/04/18/claude-opus-47147-claude-opus-47-costs-2030-more-per-session/
export const JA_TOK_RANGE = [1, 2];
export const BUNKO_CHARS = 100_000; // 文庫本1冊の文字数の目安（約10万字）

export const tokens = {
  id: 'tokens',
  genre: 'Claude',
  title: '文章量とトークン',
  kind: 'calc',
  hint: 'トークン ⇄ 日本語の文字数・英単語数・原稿用紙',
  selects: [modelSelect('モデル（コンテキストの大きさ用）')],
  fields: [
    { key: 'tokens', label: 'トークン', unit: 'トークン', toBase: (v) => v, fromBase: (b) => b },
    { key: 'ja', label: '日本語の文字数', unit: '字', toBase: (v, a) => v * a.tokPerJa, fromBase: (b, a) => b / a.tokPerJa },
    { key: 'en', label: '英語の単語数', unit: '語', toBase: (v, a) => v * a.tokPerWord, fromBase: (b, a) => b / a.tokPerWord },
    { key: 'page', label: '原稿用紙（400字詰め）', unit: '枚', toBase: (v, a) => v * a.pageChars * a.tokPerJa, fromBase: (b, a) => b / (a.pageChars * a.tokPerJa) },
  ],
  assumptions: [
    { key: 'tokPerJa', label: '日本語1文字', unit: 'トークン', value: 1.4 },
    { key: 'tokPerWord', label: '英語1語', unit: 'トークン', value: 1.33 },
    { key: 'pageChars', label: '原稿用紙1枚', unit: '字', value: 400 },
    { key: 'ctx', label: 'コンテキスト', unit: 'トークン', value: 1_000_000 },
  ],
  describe: (v, a) => {
    if (!isNum(v.tokens) || v.tokens <= 0) return [];
    const [lo, hi] = [v.tokens / JA_TOK_RANGE[1], v.tokens / JA_TOK_RANGE[0]];
    return [
      `日本語なら 約${fmtNum(lo, 2)}〜${fmtNum(hi, 2)}字（1文字1〜2トークンの幅）`,
      `文庫本 ${approx(v.ja / BUNKO_CHARS, '冊分', 2)}（1冊約10万字として）`,
      `コンテキスト（${int(a.ctx)}トークン）の ${approx((v.tokens / a.ctx) * 100, '%', 2)}`,
    ];
  },
  note: '日本語のトークン数は文章（漢字・かな・記号の割合）で大きく変わります。コンテキストには、入力のほか出力・思考のトークンも入ります。',
};
tokens.compute = baseCompute(tokens.fields);

// ---- トークンと料金 ----
export const KINDS = [
  { value: 'in', label: '入力', set: { kind: 'in' } },
  { value: 'out', label: '出力（思考を含む）', set: { kind: 'out' } },
  { value: 'read', label: 'キャッシュ読み取り', set: { kind: 'read' } },
  { value: 'write5', label: 'キャッシュ書き込み（5分）', set: { kind: 'write5' } },
  { value: 'batchIn', label: 'バッチ入力（50%引き）', set: { kind: 'batchIn' } },
  { value: 'batchOut', label: 'バッチ出力（50%引き）', set: { kind: 'batchOut' } },
];

// 100万トークンあたりの価格（USD）
export function pricePerMTok(a) {
  switch (a.kind) {
    case 'out': return a.pOut;
    case 'read': return a.pRead;
    case 'write5': return a.pIn * 1.25;
    case 'batchIn': return a.pIn * 0.5;
    case 'batchOut': return a.pOut * 0.5;
    default: return a.pIn;
  }
}

export const tokencost = {
  id: 'tokencost',
  genre: 'Claude',
  title: 'トークンと料金',
  kind: 'calc',
  hint: 'トークン ⇄ ドル ⇄ 円（モデル・入出力別）',
  selects: [modelSelect(), { key: 'kind', label: '種類', default: 'in', options: KINDS }],
  fields: [
    { key: 'tokens', label: 'トークン', unit: 'トークン', toBase: (v, a) => (v * pricePerMTok(a)) / 1e6, fromBase: (b, a) => (b * 1e6) / pricePerMTok(a) },
    { key: 'usd', label: '料金（ドル）', unit: '$', toBase: (v) => v, fromBase: (b) => b },
    { key: 'yen', label: '料金（円）', unit: '円', toBase: (v, a) => v / a.usdJpy, fromBase: (b, a) => b * a.usdJpy },
    { key: 'ja', label: '日本語の文字数', unit: '字', toBase: (v, a) => (v * a.tokPerJa * pricePerMTok(a)) / 1e6, fromBase: (b, a) => (b * 1e6) / (a.tokPerJa * pricePerMTok(a)) },
  ],
  assumptions: [...PRICE_ASSUMPTIONS, RATE, { key: 'tokPerJa', label: '日本語1文字', unit: 'トークン', value: 1.4 }],
  describe: (v, a) => {
    const p = pricePerMTok(a);
    if (!isNum(p) || p <= 0) return [];
    return [`1万トークン ≒ ${approxYen((p / 100) * a.usdJpy)} ／ 100万トークン ≒ ${approxYen(p * a.usdJpy)}（${approxUsd(p)}）`];
  },
  note: PRICE_NOTE,
};
tokencost.compute = baseCompute(tokencost.fields);

// ---- 1回の呼び出しの料金 ----
// API の usage の4つの数字（input_tokens / cache_creation_input_tokens / cache_read_input_tokens / output_tokens）を
// そのまま入れられる。思考（thinking）のトークンは出力として課金される。バッチは全トークン50%引き。
export function callCost(a, v) {
  const n = (x) => (isNum(x) ? x : 0);
  const usd =
    ((n(v.inTok) * a.pIn + n(v.cwTok) * a.pIn * 1.25 + n(v.crTok) * a.pRead + n(v.outTok) * a.pOut) / 1e6) * a.batch;
  return usd;
}

export const callcost = {
  id: 'callcost',
  genre: 'Claude',
  title: '1回の呼び出しの料金',
  kind: 'calc',
  hint: 'usage の4つの数字 → 1回と回数分の料金',
  selects: [
    modelSelect(),
    {
      key: 'mode',
      label: '処理方式',
      default: 'std',
      options: [
        { value: 'std', label: '通常', set: { batch: 1 } },
        { value: 'batch', label: 'Batch API（50%引き・非同期）', set: { batch: 0.5 } },
      ],
    },
  ],
  fields: [
    { key: 'inTok', label: '入力トークン（キャッシュを除く）', unit: 'トークン', param: true, optional: true },
    { key: 'cwTok', label: 'キャッシュ書き込み（5分）', unit: 'トークン', param: true, optional: true },
    { key: 'crTok', label: 'キャッシュ読み取り', unit: 'トークン', param: true, optional: true },
    { key: 'outTok', label: '出力トークン（思考を含む）', unit: 'トークン', param: true, optional: true },
    { key: 'calls', label: '呼び出し回数（空欄は1回）', unit: '回', param: true, optional: true },
    { key: 'yen1', label: '1回の料金（円）', unit: '円', readonly: true },
    { key: 'usd1', label: '1回の料金（ドル）', unit: '$', readonly: true },
    { key: 'yenN', label: '回数分の合計（円）', unit: '円', readonly: true },
  ],
  assumptions: [...PRICE_ASSUMPTIONS, RATE, { key: 'batch', label: '料金の倍率', unit: '倍', value: 1 }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    const usd = callCost(a, out);
    const n = isNum(out.calls) && out.calls > 0 ? out.calls : 1;
    if (usd > 0) Object.assign(out, { usd1: usd, yen1: usd * a.usdJpy, yenN: usd * a.usdJpy * n });
    else Object.assign(out, { usd1: null, yen1: null, yenN: null });
    return out;
  },
  describe: (v, a) => {
    if (!isNum(v.usd1)) return [];
    const n = isNum(v.calls) && v.calls > 0 ? v.calls : 1;
    const lines = [`1回 ${approxYen(v.yen1)}（${approxUsd(v.usd1)}）${n > 1 ? ` × ${int(n)}回 ＝ ${approxYen(v.yenN)}` : ''}`];
    if (a.batch === 1) lines.push(`Batch API（50%引き）なら 1回 ${approxYen(v.yen1 / 2)}`);
    return lines;
  },
  note: `${PRICE_NOTE} 画像・ツール・検索などの別料金は含みません。`,
};

// ---- 画像のトークン ----
// 画像は28×28ピクセルを1トークンとして ⌈幅/28⌉×⌈高さ/28⌉ 個。モデルごとに長辺と総トークンの上限があり、
// 超えると縮小される。高解像度ティア（Claude 4.7以降）は長辺2576px・最大4784トークン、
// 標準ティアは長辺1568px・最大1568トークン。1辺8000pxまで。
//   出典: https://platform.claude.com/docs/en/build-with-claude/vision （サイズ別の表と照合済み。縮小時は上限に近い値になる）
export const IMAGE_TIERS = {
  hires: { edge: 2576, cap: 4784 },
  standard: { edge: 1568, cap: 1568 },
};
export const MAX_IMAGE_PX = 8000;

export function imageTokens(w, h, tier) {
  const { edge, cap } = tier;
  const k = Math.min(1, edge / Math.max(w, h));
  const tokens = Math.ceil((w * k) / 28) * Math.ceil((h * k) / 28);
  return Math.min(cap, tokens);
}

export const image = {
  id: 'image',
  genre: 'Claude',
  title: '画像のトークン',
  kind: 'calc',
  hint: '縦横ピクセル → トークン数と料金',
  selects: [modelSelect()],
  fields: [
    { key: 'w', label: '画像の幅', unit: 'px', param: true },
    { key: 'h', label: '画像の高さ', unit: 'px', param: true },
    { key: 'count', label: '枚数（空欄は1枚）', unit: '枚', param: true, optional: true },
    { key: 'tokens', label: '1枚のトークン', unit: 'トークン', readonly: true, exact: true, integer: true },
    { key: 'yen1', label: '1枚の料金（円）', unit: '円', readonly: true },
    { key: 'yenN', label: '枚数分の料金（円）', unit: '円', readonly: true },
  ],
  // hires（高解像度ティアかどうか）はモデルの選択で決まる（前提値としては表示しない）
  assumptions: [{ key: 'pIn', label: '入力', unit: '$/百万トークン', value: 2 }, RATE],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (isNum(out.w) && isNum(out.h) && out.w > 0 && out.h > 0 && out.w <= MAX_IMAGE_PX && out.h <= MAX_IMAGE_PX) {
      const t = imageTokens(out.w, out.h, a.hires ? IMAGE_TIERS.hires : IMAGE_TIERS.standard);
      const n = isNum(out.count) && out.count > 0 ? out.count : 1;
      const yen1 = ((t * a.pIn) / 1e6) * a.usdJpy;
      Object.assign(out, { tokens: t, yen1, yenN: yen1 * n });
    } else {
      Object.assign(out, { tokens: null, yen1: null, yenN: null });
    }
    return out;
  },
  describe: (v, a) => {
    if (isNum(v.w) && isNum(v.h) && (v.w > MAX_IMAGE_PX || v.h > MAX_IMAGE_PX)) return [`1辺${int(MAX_IMAGE_PX)}pxを超える画像は受け付けられません`];
    if (!isNum(v.tokens)) return [];
    const tier = a.hires ? IMAGE_TIERS.hires : IMAGE_TIERS.standard;
    const lines = [];
    if (Math.max(v.w, v.h) > tier.edge || v.tokens >= tier.cap) lines.push(`大きい画像は縮小されて処理されます（長辺${int(tier.edge)}px・最大${int(tier.cap)}トークン）`);
    lines.push(`1,000枚なら ${approxYen(v.yen1 * 1000)}`);
    return lines;
  },
  note: `${PRICE_NOTE} 画像が大きいほど高く、高解像度モデルは標準モデルの最大約3倍のトークンになります。`,
};

export const claudeItems = [tokens, tokencost, callcost, image];
