// 最小限のDOM生成ヘルパー。文字列はすべて textContent 扱い（innerHTMLは使わない）。

// 子要素の並びを整える。入れ子の配列は何段でも展開し、null / undefined / false は捨てる。
// （展開が1段だけだと、配列が文字列「[object HTMLDivElement]」として画面に出てしまう）
export function normalizeKids(kids) {
  return kids.flat(Infinity).filter((x) => x != null && x !== false);
}

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...normalizeKids(kids));
  return el;
}

// 子要素の総入れ替え。replaceChildren に null/false を直接渡すと「null」という文字が出るため、
// 条件付きの子要素（cond ? node : null）は必ずこちらを通す。
export function fill(el, ...kids) {
  el.replaceChildren(...normalizeKids(kids));
}
