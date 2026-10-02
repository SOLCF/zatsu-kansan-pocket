import { getItem } from './data/index.js';
import { renderHome } from './components/home.js';
import { renderSettings } from './components/settings.js';
import { renderCalc } from './components/calc-view.js';
import { renderTable } from './components/table-view.js';
import { renderGuide } from './components/guide-view.js';

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
    document.title = `マイ基準値 | ${APP_NAME}`;
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
