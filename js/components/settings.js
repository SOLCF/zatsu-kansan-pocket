// マイ基準値の設定画面。入力した時点で保存し、関係する全換算に反映される。
import { h } from '../dom.js';
import { MY_VALUE_DEFS } from '../data/myvalues.js';
import { getMyValues, setMyValue, resetMyValues } from '../storage.js';

export function renderSettings(root) {
  const draw = () => {
    const my = getMyValues();
    root.replaceChildren(
      h('h2', {}, 'マイ基準値'),
      h('p', { class: 'notes' }, '登録すると、関係する換算の前提値に使われます。この端末の中にだけ保存されます。'),
      ...MY_VALUE_DEFS.map((d) =>
        h(
          'label',
          { class: 'field' },
          h('span', { class: 'label' }, d.label, h('small', {}, `使う換算：${d.usedBy}`)),
          h('input', {
            type: 'text',
            inputmode: 'decimal',
            value: String(my[d.key]),
            onchange: (e) => {
              const v = Number(e.target.value.trim());
              if (Number.isFinite(v) && v > 0) setMyValue(d.key, v);
              draw();
            },
          }),
          h('span', { class: 'unit' }, d.unit),
        ),
      ),
      h('button', { class: 'chip', type: 'button', onclick: () => { resetMyValues(); draw(); } }, '初期値に戻す'),
    );
  };
  draw();
}
