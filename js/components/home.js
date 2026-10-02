import { h, fill } from '../dom.js';
import { ITEMS } from '../data/index.js';
import { getFavorites } from '../storage.js';
import { favButton } from './fav.js';

export function renderHome(root) {
  const list = h('div', { class: 'list' });
  let query = '';

  // 1項目＝リンクのカード＋お気に入りの星。星を押すと一覧を描き直す（お気に入り欄に反映）。
  const row = (i) =>
    h(
      'div',
      { class: 'card-row' },
      h('a', { class: 'card', href: `#/item/${i.id}` }, h('b', {}, i.title), h('small', {}, i.hint ?? '')),
      favButton(i.id, () => draw()),
    );

  function draw() {
    const needle = query.trim().toLowerCase(); // mAh・kW など英字は大文字小文字を区別しない
    const hits = ITEMS.filter((i) => `${i.genre} ${i.title} ${i.hint ?? ''}`.toLowerCase().includes(needle));
    const genres = [...new Set(hits.map((i) => i.genre))];
    // 検索していないときだけ、お気に入りを先頭に出す（並びは項目の並び順）
    const favIds = new Set(getFavorites());
    const favs = needle ? [] : ITEMS.filter((i) => favIds.has(i.id));
    fill(list,
      favs.length ? [h('h3', {}, '★ お気に入り'), favs.map(row)] : null,
      genres.flatMap((g) => [h('h3', {}, g), hits.filter((i) => i.genre === g).map(row)]),
      hits.length ? null : h('p', { class: 'notes' }, '見つかりませんでした'),
    );
  }

  draw();
  fill(root, h('input', { class: 'search', type: 'search', placeholder: '換算を検索', oninput: (e) => { query = e.target.value; draw(); } }), list);
}
