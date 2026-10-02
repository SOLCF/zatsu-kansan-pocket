import { h, fill } from '../dom.js';
import { ITEMS } from '../data/index.js';
import { getFavorites, getGroupOpen, setGroupOpen, setAllGroupsOpen } from '../storage.js';
import { favButton } from './fav.js';

const FAV_GROUP = '★ お気に入り';

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

  // ジャンル1つ分の折り畳み。検索中は結果が隠れないよう必ず開き、開閉は保存しない。
  const group = (name, items, { searching, fallback = false }) =>
    h(
      'details',
      {
        class: 'genre',
        open: searching || getGroupOpen(name, fallback),
        ontoggle: (e) => {
          if (!searching) setGroupOpen(name, e.target.open);
        },
      },
      h('summary', {}, h('span', {}, name), h('small', { class: 'count' }, `${items.length}項目`)),
      h('div', { class: 'group-body' }, items.map(row)),
    );

  function draw() {
    const needle = query.trim().toLowerCase(); // mAh・kW など英字は大文字小文字を区別しない
    const searching = needle !== '';
    const hits = ITEMS.filter((i) => `${i.genre} ${i.title} ${i.hint ?? ''}`.toLowerCase().includes(needle));
    const genres = [...new Set(hits.map((i) => i.genre))];
    // 検索していないときだけ、お気に入りを先頭に出す（並びは項目の並び順）
    const favIds = new Set(getFavorites());
    const favs = searching ? [] : ITEMS.filter((i) => favIds.has(i.id));
    fill(list,
      favs.length ? group(FAV_GROUP, favs, { searching, fallback: true }) : null,
      genres.map((g) => group(g, hits.filter((i) => i.genre === g), { searching })),
      hits.length ? null : h('p', { class: 'notes' }, '見つかりませんでした'),
    );
  }

  // 全ジャンルをまとめて開く・閉じる（お気に入り欄は対象外）
  const setAll = (open) => {
    setAllGroupsOpen([...new Set(ITEMS.map((i) => i.genre))], open);
    draw();
  };
  const tools = h(
    'div',
    { class: 'group-tools' },
    h('button', { class: 'chip', type: 'button', onclick: () => setAll(true) }, 'すべて開く'),
    h('button', { class: 'chip', type: 'button', onclick: () => setAll(false) }, 'すべて閉じる'),
  );

  draw();
  fill(root, h('input', { class: 'search', type: 'search', placeholder: '換算を検索', oninput: (e) => { query = e.target.value; draw(); } }), tools, list);
}
