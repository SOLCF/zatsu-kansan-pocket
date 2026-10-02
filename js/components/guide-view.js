// 目安表示型の共通画面。値を入れると、入る帯を結果の直下に出し、残りの帯は「他の区分」として並べる。
// item = { title, unit, bands: [{ min, max, label, range, image?, speed?, details: [[見出し, 説明]...] }],
//          below?: 最小値未満のときの説明, extra?: (v) => 追加の1行, disclaimer }
// 値を入れなくても全帯を一覧できる（帯を読み比べる使い方も想定）。
import { h, fill } from '../dom.js';
import { findBand, isNum } from '../calc.js';

const parse = (s) => {
  const t = s.trim().replace(/,/g, '');
  return t === '' ? NaN : Number(t);
};

const card = (b, hit = false) =>
  h(
    'section',
    { class: `ref-card${hit ? ' hit' : ''}` },
    h('b', {}, `${b.label}　`, h('small', {}, b.range)),
    b.image ? h('p', { class: 'image' }, `「${b.image}」`) : null,
    b.speed ? h('p', { class: 'small' }, `おおよその時速 ${b.speed}`) : null,
    h('dl', {}, b.details.flatMap(([k, t]) => [h('dt', {}, k), h('dd', {}, t)])),
  );

export function renderGuide(root, item) {
  const status = h('div', { class: 'notes' }); // 一言の結果（色付き）
  const hitBox = h('div'); // 当たった区分のカード（通常の文字色）
  const list = h('div', { class: 'bands' });

  const draw = (v) => {
    const hit = findBand(item.bands, v);
    const lines = [];
    if (isNum(v) && v >= 0 && !hit && v < item.bands[0].min && item.below) lines.push(item.below);
    if (isNum(v) && v >= 0 && item.extra) lines.push(item.extra(v));
    fill(status, lines.map((t) => h('p', {}, t)));
    fill(hitBox, hit ? card(hit, true) : null);
    fill(list, hit ? h('h3', {}, '他の区分') : null, item.bands.filter((b) => b !== hit).map((b) => card(b)));
  };
  draw(NaN);

  fill(root,
    h('h2', {}, item.title),
    h(
      'label',
      { class: 'field' },
      h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': item.title, oninput: (e) => draw(parse(e.target.value)) }),
      h('span', { class: 'unit' }, item.unit),
    ),
    status,
    hitBox,
    list,
    h('p', { class: 'small' }, item.disclaimer ?? '目安です。'),
  );
}
