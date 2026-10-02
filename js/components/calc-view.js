// 計算型の共通画面。どの欄に入力しても他の欄が更新され、結果の下に前提値を出す。
// 前提値のタップ編集は「この画面を開いている間だけ」有効（保存しない）。
import { h, fill } from '../dom.js';
import { defaultAssumptions, parseNumber as parse, shouldWrite } from '../calc.js';
import { roundSig, fmtNum } from '../format.js';
import { getMyValues } from '../storage.js';
import { cardsFor } from './table-view.js';

export function renderCalc(root, item) {
  const my = getMyValues();
  const a = defaultAssumptions(item, my);
  const sel = {};
  for (const s of item.selects ?? []) {
    // 初期の選択肢: マイ基準値（s.myKey の値が option.set[s.by] と一致するもの）→ s.default → 先頭
    const byMy = s.myKey ? s.options.find((o) => o.set?.[s.by] === my[s.myKey]) : null;
    const initial = byMy ?? s.options.find((o) => o.value === s.default) ?? s.options[0];
    sel[s.key] = initial.value;
    Object.assign(a, initial.set);
  }

  let values = {};
  let last = null;
  const ctl = {}; // key -> { read(): number, write(v|null) }  欄の種類（数値・時間）の違いをここで吸収
  const badges = {};
  const notes = h('div', { class: 'notes' });
  const assumpBox = h('div', { class: 'assumptions' });

  // 再計算の基準にする欄。通常は直前に触った欄。item.anchorMain が真の項目（フィラメントなど）は、
  // 任意の条件欄を触ったあとでも、直前に入力した「主な欄」（param でない欄）を基準にする。
  let lastMain = null;
  const anchor = () => (item.anchorMain && lastMain && Number.isFinite(values[lastMain]) ? lastMain : last);

  function reapply() {
    const key = anchor();
    if (key && Number.isFinite(values[key])) {
      values = item.compute(key, values[key], { ...values }, a);
    }
    paint();
  }

  function onInput(key) {
    const field = item.fields.find((f) => f.key === key);
    const raw = ctl[key].read();
    // 任意の欄は空欄でも計算を続ける。空欄の値は既定で0、blankValue で変えられる（気温のように0が意味を持つ欄は null）。
    const blank = field.optional && Number.isNaN(raw);
    const v = blank ? (field.blankValue === undefined ? 0 : field.blankValue) : raw;
    const valid = blank || (Number.isFinite(raw) && (raw >= 0 || field.signed)); // signed: マイナスを許す欄（気温）
    last = key;
    if (!field.param) lastMain = key;
    if (!valid) {
      for (const f of item.fields) if (!f.param || f.key === key) values[f.key] = null;
    } else {
      values = item.compute(key, v, { ...values }, a);
    }
    paint(key);
  }

  function paint(typing) {
    for (const f of item.fields) {
      const v = values[f.key];
      const shown = Number.isFinite(v) ? (f.type === 'time' ? Math.round(v) : roundSig(v, 3)) : null;
      const cur = ctl[f.key].read();
      const blankOptional = f.optional && shown === 0 && Number.isNaN(cur); // 任意欄の空欄は「0」で埋めない
      if (f.key !== typing && !blankOptional && shouldWrite(cur, v, shown)) ctl[f.key].write(shown);
      badges[f.key].hidden = !(Number.isFinite(v) && !f.param && !f.exact && f.key !== anchor()); // exact: 切り上げの個数など「約」を付けない欄
    }
    fill(notes, ...(item.describe?.(values, a, sel) ?? []).map((t) => h('p', {}, t)));
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
    if (!item.assumptions.length) return; // 前提値が無い項目（エアコンなど）は見出しも出さない
    fill(assumpBox, h('div', { class: 'assump-title' }, '前提値（タップでこの画面だけ変更）'), ...item.assumptions.map(chip));
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
        s.options.map((o) => h('option', { value: o.value, selected: o.value === sel[s.key] }, o.label)),
      ),
    ),
  );

  const numInput = (f, label, inputmode) =>
    h('input', { type: 'text', inputmode, autocomplete: 'off', readonly: !!f.readonly, 'aria-label': label, oninput: () => onInput(f.key) });

  const rows = item.fields.map((f) => {
    badges[f.key] = h('span', { class: 'approx', hidden: true }, '約');
    const label = h('span', { class: 'label' }, f.label);
    if (f.type === 'time') {
      // ◯分◯秒の2欄入力。値は秒に直して扱う（90秒と入れても1分30秒と同じ）。
      const min = numInput(f, `${f.label}（分）`, 'numeric');
      const sec = numInput(f, `${f.label}（秒）`, 'numeric');
      ctl[f.key] = {
        read: () => {
          const m = min.value.trim() === '' ? 0 : parse(min.value);
          const s = sec.value.trim() === '' ? 0 : parse(sec.value);
          return min.value.trim() === '' && sec.value.trim() === '' ? NaN : m * 60 + s;
        },
        write: (v) => {
          min.value = v === null ? '' : String(Math.floor(v / 60));
          sec.value = v === null ? '' : String(v % 60);
        },
      };
      return h('div', { class: 'field time' }, label, badges[f.key], min, h('span', { class: 'unit' }, '分'), sec, h('span', { class: 'unit' }, '秒'));
    }
    const input = numInput(f, f.label, 'decimal');
    ctl[f.key] = { read: () => parse(input.value), write: (v) => (input.value = v === null ? '' : String(v)) };
    return h('label', { class: 'field' }, label, badges[f.key], input, h('span', { class: 'unit' }, f.unit));
  });

  renderAssumptions();
  fill(root, h('h2', {}, item.title), ...selectEls, h('div', { class: 'fields' }, rows), notes, item.note ? h('p', { class: 'small' }, item.note) : null, assumpBox, item.reference ? h('div', { class: 'reference' }, cardsFor(item.reference)) : null);
}
