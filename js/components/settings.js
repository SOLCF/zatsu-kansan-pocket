// 設定画面: 画面の色（ライト／ダーク）と、マイ基準値。入力した時点で保存し、すぐ反映される。
import { h, fill } from '../dom.js';
import { MY_VALUE_DEFS } from '../data/myvalues.js';
import { getMyValues, setMyValue, resetMyValues, getTheme, setTheme } from '../storage.js';
import { THEMES, applyTheme } from '../theme.js';
import { parseNumber } from '../calc.js';

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
    );
  };
  draw();
}
