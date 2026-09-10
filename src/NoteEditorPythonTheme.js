const COLORS = {
  base: '#c9d1d9',
  comment: '#8b949e',
  keyword: '#ff7b72',
  string: '#a5d6ff',
  function: '#d2a8ff',
  builtin: '#ffa657',
  number: '#79c0ff',
  operator: '#ff7b72',
  decorator: '#d2a8ff',
  constant: '#79c0ff',
};

const PY_KEYWORDS = new Set('and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield'.split(' '));
const PY_BUILTINS = new Set('abs all any bin bool bytes callable chr dict dir enumerate filter float format frozenset getattr hasattr hash help hex id input int isinstance issubclass iter len list map max min next object oct open ord pow print range repr reversed round set sorted str sum super tuple type vars zip'.split(' '));
const PY_CONSTANTS = new Set(['True', 'False', 'None', 'NotImplemented', 'Ellipsis']);

function esc(value) {
  return String(value).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' }[c]));
}

function paintPython(source) {
  const text = String(source);
  const tokenRe = /#[^\n]*|'''[\s\S]*?'''|\"\"\"[\s\S]*?\"\"\"|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|@[A-Za-z_][\w.]*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w]*\b|==|!=|<=|>=|:=|\+=|-=|\*=|\/=|%=|\*\*|//|[+\-*\/%=<>:]/g;
  let html = '';
  let cursor = 0;
  let match;
  let expectFunction = false;

  while ((match = tokenRe.exec(text))) {
    html += esc(text.slice(cursor, match.index));
    const token = match[0];
    const safe = esc(token);

    if (token.startsWith('#')) {
      html += `<span style="color:${COLORS.comment};font-style:italic">${safe}</span>`;
    } else if (token.startsWith('@')) {
      html += `<span style="color:${COLORS.decorator}">${safe}</span>`;
    } else if (/^[\"']/.test(token)) {
      html += `<span style="color:${COLORS.string}">${safe}</span>`;
    } else if (/^\d/.test(token)) {
      html += `<span style="color:${COLORS.number}">${safe}</span>`;
    } else if (PY_CONSTANTS.has(token)) {
      html += `<span style="color:${COLORS.constant}">${safe}</span>`;
    } else if (PY_KEYWORDS.has(token)) {
      html += `<span style="color:${COLORS.keyword}">${safe}</span>`;
      expectFunction = token === 'def' || token === 'class';
    } else if (PY_BUILTINS.has(token)) {
      html += `<span style="color:${COLORS.builtin}">${safe}</span>`;
      expectFunction = false;
    } else if (/^(?:[A-Za-z_]\w*)$/.test(token) && expectFunction) {
      html += `<span style="color:${COLORS.function}">${safe}</span>`;
      expectFunction = false;
    } else if (/^[+\-*\/%=<>:!]/.test(token)) {
      html += `<span style="color:${COLORS.operator}">${safe}</span>`;
    } else {
      html += safe;
    }

    cursor = match.index + token.length;
  }

  html += esc(text.slice(cursor));
  return html;
}

function upgradePythonBlocks() {
  document.querySelectorAll('.preview-code').forEach((block) => {
    const language = (block.querySelector('.preview-code-head span')?.textContent || '').trim().toLowerCase();
    if (language !== 'python' && language !== 'py') return;
    const code = block.querySelector('code');
    if (!code) return;
    const source = code.textContent || '';
    code.innerHTML = paintPython(source);
    code.dataset.pythonTheme = 'github';
  });
}

if (typeof window !== 'undefined') {
  const run = () => window.requestAnimationFrame(upgradePythonBlocks);
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
}
