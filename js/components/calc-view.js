// 計算型の共通画面。どの欄に入力しても他の欄が更新され、結果の下に前提値を出す。
// 前提値のタップ編集は「この画面を開いている間だけ」有効（保存しない）。
import { h } from '../dom.js';
import { defaultAssumptions } from '../calc.js';
import { roundSig, fmtNum } from '../format.js';
import { getMyValues } from '../storage.js';

const parse = (s) => {
  const t = s.trim().replace(/,/g, '');
  return t === '' ? NaN : Number(t);
};

export function renderCalc(root, item) {
  const a = defaultAssumptions(item, getMyValues());
  const sel = {};
  for (const s of item.selects ?? []) {
    sel[s.key] = s.options[0].value;
    Object.assign(a, s.options[0].set);
  }

  let values = {};
  let last = null;
  const inputs = {};
  const badges = {};
  const notes = h('div', { class: 'notes' });
  const assumpBox = h('div', { class: 'assumptions' });

  function reapply() {
    if (last && Number.isFinite(values[last])) {
      values = item.compute(last, values[last], { ...values }, a);
    }
    paint();
  }

  function onInput(key) {
    const v = parse(inputs[key].value);
    last = key;
    if (!Number.isFinite(v) || v < 0) {
      for (const f of item.fields) if (!f.param || f.key === key) values[f.key] = null;
    } else {
      values = item.compute(key, v, { ...values }, a);
    }
    paint(key);
  }

  function paint(typing) {
    for (const f of item.fields) {
      const v = values[f.key];
      const el = inputs[f.key];
      const shown = Number.isFinite(v) ? roundSig(v, 3) : null;
      if (f.key !== typing && parse(el.value) !== shown) el.value = shown === null ? '' : String(shown);
      badges[f.key].hidden = !(Number.isFinite(v) && !f.param && f.key !== last);
    }
    notes.replaceChildren(...(item.describe?.(values, a, sel) ?? []).map((t) => h('p', {}, t)));
  }

  function chip(s) {
    const btn = h(
      'button',
      {
        class: 'chip',
        type: 'button',
        onclick: () => {
          const input = h('input', { class: 'chip-input', type: 'text', inputmode: 'decimal', value: String(a[s.key]) });
          const commit = () => {
            const v = parse(input.value);
            if (Number.isFinite(v) && v > 0) a[s.key] = v;
            renderAssumptions();
            reapply();
          };
          input.addEventListener('blur', commit);
          input.addEventListener('keydown', (e) => e.key === 'Enter' && input.blur());
          btn.replaceWith(h('span', { class: 'chip editing' }, `${s.label} `, input, s.unit));
          input.focus();
          input.select();
        },
      },
      `${s.label} ${fmtNum(a[s.key])}${s.unit}`,
      s.myKey ? h('small', {}, '（マイ基準値）') : null,
    );
    return btn;
  }

  function renderAssumptions() {
    assumpBox.replaceChildren(h('div', { class: 'assump-title' }, '前提値（タップでこの画面だけ変更）'), ...item.assumptions.map(chip));
  }

  const selectEls = (item.selects ?? []).map((s) =>
    h(
      'label',
      { class: 'select-row' },
      s.label,
      h(
        'select',
        {
          onchange: (e) => {
            sel[s.key] = e.target.value;
            Object.assign(a, s.options.find((o) => o.value === e.target.value).set);
            renderAssumptions();
            reapply();
          },
        },
        s.options.map((o) => h('option', { value: o.value }, o.label)),
      ),
    ),
  );

  const rows = item.fields.map((f) => {
    inputs[f.key] = h('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      readonly: !!f.readonly,
      'aria-label': f.label,
      oninput: () => onInput(f.key),
    });
    badges[f.key] = h('span', { class: 'approx', hidden: true }, '約');
    return h('label', { class: 'field' }, h('span', { class: 'label' }, f.label), badges[f.key], inputs[f.key], h('span', { class: 'unit' }, f.unit));
  });

  renderAssumptions();
  root.replaceChildren(h('h2', {}, item.title), ...selectEls, h('div', { class: 'fields' }, rows), notes, assumpBox);
}
