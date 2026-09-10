const GITHUB = {
  base: '#c9d1d9',
  comment: '#8b949e',
  punctuation: '#c9d1d9',
  keyword: '#ff7b72',
  string: '#a5d6ff',
  function: '#d2a8ff',
  variable: '#79c0ff',
  number: '#79c0ff',
  operator: '#ff7b72',
  builtin: '#ffa657',
  decorator: '#d2a8ff',
  boolean: '#79c0ff',
};

const PYTHON_KEYWORDS = /\\b(?:and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\\b/g;
const PYTHON_BUILTINS = /\\b(?:abs|all|any|bool|dict|enumerate|filter|float|int|len|list|map|max|min|open|print|range|reversed|round|set|sorted|str|sum|super|tuple|type|zip)\\b/g;
const PYTHON_CONSTANTS = /\\b(?:True|False|None|NotImplemented|Ellipsis)\\b/g;
const GENERIC_KEYWORDS = /\\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|try|catch|throw|switch|case|break|continue|default|typeof|instanceof|extends|this|true|false|null|undefined)\\b/g;

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' }[ch]));
}

function highlightPython(source) {
  const text = String(source);
  const tokens = [];
  const pattern = /(#[^\\n]*|'''[\\s\\S]*?'''|\"\"\"[\\s\\S]*?\"\"\"|'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"|@[A-Za-z_][\\w.]*|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_][\\w]*(?=\\s*\\()/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) tokens.push({ type: 'plain', value: text.slice(last, match.index) });
    const value = match[0];
    if (value.startsWith('#')) tokens.push({ type: 'comment', value });
    else if (value.startsWith('@')) tokens.push({ type: 'decorator', value });
    else if (/^['\"]/.test(value)) tokens.push({ type: 'string', value });
    else if (/^\\d/.test(value)) tokens.push({ type: 'number', value });
    else if (/\\($/.test(value)) tokens.push({ type: 'function', value });
    else tokens.push({ type: 'plain', value });
    last = match.index + value.length;
  }
  if (last < text.length) tokens.push({ type: 'plain', value: text.slice(last) });

  return tokens.map(({ type, value }) => {
    const safe = escapeHtml(value);
    if (type === 'comment') return `<span style="color:${GITHUB.comment};font-style:italic">${safe}</span>`;
    if (type === 'decorator') return `<span style="color:${GITHUB.decorator}">${safe}</span>`;
    if (type === 'string') return `<span style="color:${GITHUB.string}">${safe}</span>`;
    if (type === 'number') return `<span style="color:${GITHUB.number}">${safe}</span>`;
    if (type === 'function') return `<span style="color:${GITHUB.function}">${safe}</span>`;
    let html = safe;
    html = html.replace(PYTHON_KEYWORDS, `<span style="color:${GITHUB.keyword}">$&</span>`);
    html = html.replace(PYTHON_CONSTANTS, `<span style="color:${GITHUB.boolean}">$&</span>`);
    html = html.replace(PYTHON_BUILTINS, `<span style="color:${GITHUB.builtin}">$&</span>`);
    html = html.replace(/(==|!=|<=|>=|\+|-|\\*|\\/|%|:=|=|<|>)/g, `<span style="color:${GITHUB.operator}">$1</span>`);
    return html;
  }).join('');
}

function highlightGeneric(source) {
  let html = escapeHtml(source);
  html = html.replace(/(\\/\\/.*|#.*)$/gm, `<span style="color:${GITHUB.comment};font-style:italic">$1</span>`);
  html = html.replace(/(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;|`[^`]*?`)/g, `<span style="color:${GITHUB.string}">$1</span>`);
  html = html.replace(GENERIC_KEYWORDS, `<span style="color:${GITHUB.keyword}">$&</span>`);
  html = html.replace(/\\b\\d+(?:\\.\\d+)?\\b/g, `<span style="color:${GITHUB.number}">$&</span>`);
  return html;
}

function upgradeCodeBlocks(root = document) {
  root.querySelectorAll('.preview-code').forEach((block) => {
    const code = block.querySelector('code');
    const language = (block.querySelector('.preview-code-head span')?.textContent || '').trim().toLowerCase();
    if (!code || code.dataset.premiumHighlighted === '1') return;
    const source = code.textContent || '';
    code.innerHTML = language === 'python' || language === 'py'
      ? highlightPython(source)
      : highlightGeneric(source);
    code.dataset.premiumHighlighted = '1';
  });
}

function enableRevealAnimations(root = document) {
  const article = root.querySelector('.generated-preview-content article');
  if (!article || article.dataset.revealReady === '1') return;
  article.dataset.revealReady = '1';
  const blocks = [...article.children];
  blocks.forEach((block) => block.classList.add('note-reveal-block'));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    blocks.forEach((block) => block.classList.add('note-reveal-visible'));
    return;
  }
  const scroller = article.closest('.generated-preview-content');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('note-reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { root: scroller, threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
  blocks.forEach((block) => observer.observe(block));
}

function refine() {
  upgradeCodeBlocks(document);
  enableRevealAnimations(document);
}

if (typeof window !== 'undefined') {
  window.setTimeout(refine, 0);
  new MutationObserver(refine).observe(document.body, { childList: true, subtree: true });
}
