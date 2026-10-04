import { getItem } from './data/index.js';
import { renderHome } from './components/home.js';
import { renderSettings } from './components/settings.js';
import { renderCalc } from './components/calc-view.js';
import { renderTable } from './components/table-view.js';
import { renderGuide } from './components/guide-view.js';
import { getTheme } from './storage.js';
import { applyTheme } from './theme.js';
import { h } from './dom.js';
import { VERSION } from './version.js';

const SEEN_KEY = 'zkp.seenVersion';

applyTheme(getTheme()); // index.html の先頭でも適用済み。念のためここでも保存値に合わせる

const VIEWS = { calc: renderCalc, table: renderTable, guide: renderGuide };
const main = document.getElementById('main');
const back = document.getElementById('back');

const APP_NAME = '雑換算ポケット';

function route() {
  const [, page, id] = location.hash.split('/');
  back.hidden = !page;
  window.scrollTo(0, 0); // 画面が変わったら先頭から（ホームを下までスクロールしたあとに項目を開いても途中から始まらない）
  document.title = APP_NAME;
  if (page === 'settings') {
    document.title = `設定 | ${APP_NAME}`;
    return renderSettings(main);
  }
  if (page === 'item') {
    const item = getItem(id);
    if (item) {
      document.title = `${item.title} | ${APP_NAME}`;
      return VIEWS[item.kind](main, item);
    }
  }
  renderHome(main);
}

addEventListener('hashchange', route);
route();

// 更新は裏で取り込まれて次回の起動から使われるので、更新後の最初の起動で一度だけ知らせる
try {
  const seen = localStorage.getItem(SEEN_KEY);
  if (seen && seen !== VERSION) {
    const toast = h('div', { class: 'toast', role: 'status', onclick: () => toast.remove() }, `v${VERSION} に更新しました`);
    document.body.append(toast);
    setTimeout(() => toast.remove(), 4000);
  }
  localStorage.setItem(SEEN_KEY, VERSION);
} catch {
  // 保存できない環境（プライベートモードなど）では知らせない
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
