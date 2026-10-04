// 設定画面: 画面の色（ライト／ダーク）と、マイ基準値。入力した時点で保存し、すぐ反映される。
// 末尾に「アプリについて」（版・最新版への更新・GitHub へのリンク）。
import { h, fill } from '../dom.js';
import { MY_VALUE_DEFS } from '../data/myvalues.js';
import { getMyValues, setMyValue, resetMyValues, getTheme, setTheme } from '../storage.js';
import { THEMES, applyTheme } from '../theme.js';
import { parseNumber } from '../calc.js';
import { VERSION, RELEASED, REPO_URL } from '../version.js';

export function renderSettings(root) {
  const themeRow = () =>
    h(
      'label',
      { class: 'field' },
      h('span', { class: 'label' }, '画面の色'),
      h(
        'select',
        {
          'aria-label': '画面の色',
          onchange: (e) => {
            setTheme(e.target.value);
            applyTheme(e.target.value);
          },
        },
        THEMES.map((t) => h('option', { value: t.value, selected: t.value === getTheme() }, t.label)),
      ),
      h('span', { class: 'unit' }),
    );

  const draw = () => {
    const my = getMyValues();
    fill(root,
      h('h2', {}, '設定'),
      themeRow(),
      h('h3', {}, 'マイ基準値'),
      h('p', { class: 'small' }, '登録すると、関係する換算の前提値に使われます。この端末の中にだけ保存されます。'),
      ...MY_VALUE_DEFS.map((d) =>
        h(
          'label',
          { class: 'field' },
          h('span', { class: 'label' }, d.label, h('small', {}, `使う換算：${d.usedBy}`)),
          d.options
            ? h(
                'select',
                {
                  onchange: (e) => {
                    setMyValue(d.key, Number(e.target.value));
                    draw();
                  },
                },
                d.options.map((o) => h('option', { value: String(o.value), selected: o.value === my[d.key] }, o.label)),
              )
            : h('input', {
                type: 'text',
                inputmode: 'decimal',
                value: String(my[d.key]),
                onchange: (e) => {
                  const v = parseNumber(e.target.value);
                  if (Number.isFinite(v) && v > 0) setMyValue(d.key, v);
                  draw();
                },
              }),
          h('span', { class: 'unit' }, d.options ? '' : d.unit),
        ),
      ),
      h('button', { class: 'chip', type: 'button', onclick: () => { resetMyValues(); draw(); } }, 'マイ基準値を初期値に戻す'),
      ...aboutRows(),
    );
  };
  draw();
}

// 公開版は github.io から配信される。それ以外（localhost など）は開発版。
const isDev = () => !location.hostname.endsWith('github.io');

// アプリについて: 版・公開日、最新版への更新、GitHub へのリンク
function aboutRows() {
  const status = h('small', {}, '通常は自動で更新されます（次回の起動時）。すぐ更新したいときに');
  return [
    h('h3', {}, 'アプリについて'),
    h('div', { class: 'about-row' },
      h('div', {}, h('b', {}, 'バージョン'), h('small', {}, `${RELEASED} 公開`)),
      h('span', { class: 'ver' }, `v${VERSION}${isDev() ? ' 開発版' : ''}`),
    ),
    h('div', { class: 'about-row' },
      h('div', {}, h('b', {}, '最新版に更新'), status),
      h('button', { class: 'chip', type: 'button', onclick: () => checkUpdate(status) }, '更新'),
    ),
    h('div', { class: 'about-row' },
      h('div', {}, h('b', {}, 'GitHub'), h('small', {}, 'ソースコード・更新内容')),
      h('a', { class: 'chip', href: REPO_URL, target: '_blank', rel: 'noopener' }, '開く'),
    ),
  ];
}

// 公開中の version.js をサーバーに直接聞いて（キャッシュを通さない）、版が違えば入れ替える。
// 通信するのはこのボタンを押したときだけで、相手はこのアプリの配信元だけ。
export async function checkUpdate(status) {
  status.textContent = '確認中…';
  try {
    const res = await fetch(`js/version.js?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) }); // 電波が弱くても8秒であきらめる
    const latest = latestVersionOf(await res.text());
    if (!latest) throw new Error('no version');
    if (latest === VERSION) {
      status.textContent = `最新版です（v${VERSION}）`;
      return;
    }
    status.textContent = `v${latest} に更新します…`;
    // キャッシュ優先の Service Worker とキャッシュを消してから読み込み直す。読み込み直した画面が新しい Service Worker を登録し、新しい版をキャッシュする。
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    location.reload();
  } catch {
    status.textContent = '通信できないため確認できません';
  }
}

// version.js の中身から VERSION を取り出す
export const latestVersionOf = (text) => /VERSION = '([^']+)'/.exec(text)?.[1] ?? null;
