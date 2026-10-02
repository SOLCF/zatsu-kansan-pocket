import { h, fill } from '../dom.js';
import { ITEMS } from '../data/index.js';

export function renderHome(root) {
  const list = h('div', { class: 'list' });
  const draw = (q) => {
    const needle = q.trim().toLowerCase(); // mAh・kW など英字は大文字小文字を区別しない
    const hits = ITEMS.filter((i) => `${i.genre} ${i.title} ${i.hint ?? ''}`.toLowerCase().includes(needle));
    const genres = [...new Set(hits.map((i) => i.genre))];
    fill(list,
      ...genres.flatMap((g) => [
        h('h3', {}, g),
        ...hits.filter((i) => i.genre === g).map((i) => h('a', { class: 'card', href: `#/item/${i.id}` }, h('b', {}, i.title), h('small', {}, i.hint ?? ''))),
      ]),
      hits.length ? null : h('p', { class: 'notes' }, '見つかりませんでした'),
    );
  };
  draw('');
  fill(root, h('input', { class: 'search', type: 'search', placeholder: '換算を検索', oninput: (e) => draw(e.target.value) }), list);
}
