// 対照表型の共通画面。スマホ縦持ちで読めるよう、1行を1枚のカードで表示する。
// item = { title, tables: [{ title, columns: [列名...], rows: [[...]], note? }], notes?: [文...] }
// 先頭の列がカードの見出し。「—」や空の値は省く。検索は全表の行を絞り込む（型番・呼び名・メモのどれでも当たる）。
import { h, fill } from '../dom.js';

const hasValue = (v) => String(v).trim() !== '' && String(v).trim() !== '—';

export function renderTable(root, item) {
  const body = h('div');
  const draw = (q) => {
    const needle = q.trim().toLowerCase();
    const blocks = item.tables.flatMap((t) => {
      const rows = t.rows.filter((r) => r.join(' ').toLowerCase().includes(needle));
      if (!rows.length) return [];
      return [
        h('h3', {}, t.title),
        ...rows.map((r) =>
          h(
            'section',
            { class: 'ref-card' },
            h('b', {}, r[0]),
            h('dl', {}, r.slice(1).flatMap((v, i) => (hasValue(v) ? [h('dt', {}, t.columns[i + 1]), h('dd', {}, String(v))] : []))),
          ),
        ),
        t.note ? h('p', { class: 'small' }, t.note) : null,
      ];
    });
    fill(body, ...(blocks.length ? blocks : [h('p', { class: 'small' }, '見つかりませんでした')]));
  };
  draw('');
  fill(root,
    h('h2', {}, item.title),
    h('input', { class: 'search', type: 'search', placeholder: '型番・サイズで検索（例：LR44、単3）', oninput: (e) => draw(e.target.value) }),
    body,
    ...(item.notes ?? []).map((n) => h('p', { class: 'small' }, n)),
  );
}
