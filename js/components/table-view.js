// 対照表型の共通画面（骨組み）。item = { title, columns: [名称...], rows: [[...]] }
// キッチン3項目の段階では登録項目なし。電池の追加時に使う。
import { h } from '../dom.js';

export function renderTable(root, item) {
  const body = h('tbody');
  const draw = (q) => {
    const rows = item.rows.filter((r) => r.join(' ').toLowerCase().includes(q.toLowerCase()));
    body.replaceChildren(...rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, String(c))))));
  };
  draw('');
  root.replaceChildren(
    h('h2', {}, item.title),
    h('input', { class: 'search', type: 'search', placeholder: '検索', oninput: (e) => draw(e.target.value) }),
    h('table', { class: 'ref' }, h('thead', {}, h('tr', {}, item.columns.map((c) => h('th', {}, c)))), body),
  );
}
