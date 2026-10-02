// お気に入りの星ボタンと、項目画面のタイトル行（タイトル＋星）。
import { h } from '../dom.js';
import { isFavorite, toggleFavorite } from '../storage.js';

// onChange は付け外しのあとに呼ばれる（ホームの一覧を描き直すのに使う）
export function favButton(id, onChange) {
  const label = (on) => `${on ? 'お気に入りから外す' : 'お気に入りに追加'}`;
  const btn = h('button', { class: 'fav', type: 'button' });
  const paint = (on) => {
    btn.textContent = on ? '★' : '☆';
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', label(on));
  };
  paint(isFavorite(id));
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const on = toggleFavorite(id);
    paint(on);
    onChange?.(on);
  });
  return btn;
}

export function titleBar(item) {
  return h('div', { class: 'title-bar' }, h('h2', {}, item.title), favButton(item.id));
}
