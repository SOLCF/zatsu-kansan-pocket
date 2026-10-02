import { h } from './dom.js';
import { getItem } from './data/index.js';
import { renderHome } from './components/home.js';
import { renderSettings } from './components/settings.js';
import { renderCalc } from './components/calc-view.js';
import { renderTable } from './components/table-view.js';
import { renderGuide } from './components/guide-view.js';

const VIEWS = { calc: renderCalc, table: renderTable, guide: renderGuide };
const main = document.getElementById('main');
const back = document.getElementById('back');

function route() {
  const [, page, id] = location.hash.split('/');
  back.hidden = !page;
  if (page === 'settings') return renderSettings(main);
  if (page === 'item') {
    const item = getItem(id);
    if (item) return VIEWS[item.kind](main, item);
  }
  renderHome(main);
}

addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
