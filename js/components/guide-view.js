// 目安表示型の共通画面（骨組み）。
// item = { title, unit, bands: [{ min, max, label, text }], disclaimer }
// 入力値が入る帯を強調表示する。風速・降水量の追加時に使う。
import { h, fill } from '../dom.js';

export function renderGuide(root, item) {
  const list = h('ul', { class: 'bands' });
  const draw = (v) => {
    fill(list,
      ...item.bands.map((b) =>
        h('li', { class: Number.isFinite(v) && v >= b.min && v < b.max ? 'hit' : '' }, h('strong', {}, b.label), h('span', {}, b.text)),
      ),
    );
  };
  draw(NaN);
  fill(root,
    h('h2', {}, item.title),
    h('label', { class: 'field' }, h('input', { type: 'text', inputmode: 'decimal', oninput: (e) => draw(Number(e.target.value)) }), h('span', { class: 'unit' }, item.unit)),
    list,
    h('p', { class: 'notes' }, item.disclaimer ?? '目安です。'),
  );
}
