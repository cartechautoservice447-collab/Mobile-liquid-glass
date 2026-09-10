import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bold, CheckSquare, ChevronDown, Code2, Copy, Eye, Heading1, Heading2, Heading3, Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, MoreHorizontal, Pencil, Quote, Redo2, Save, Strikethrough, Table2, Trash2, Undo2, X } from 'lucide-react';
import './MobileNoteEditor.css';

const READABILITY = {
  default: ['.92rem', '1.72'],
  good: ['.98rem', '1.8'],
  best: ['1.04rem', '1.88'],
  great: ['1.09rem', '1.96'],
};

const TOOLS = [
  ['h1', <Heading1 size={15} />, '# '],
  ['h2', <Heading2 size={15} />, '## '],
  ['h3', <Heading3 size={15} />, '### '],
  ['bullet', <List size={15} />, '- '],
  ['numbered', <ListOrdered size={15} />, '1. '],
  ['checklist', <CheckSquare size={15} />, '- [ ] '],
  ['bold', <Bold size={15} />, '**', '**'],
  ['italic', <Italic size={15} />, '_', '_'],
  ['strike', <Strikethrough size={15} />, '~~', '~~'],
  ['code', <Code2 size={15} />, '`', '`'],
  ['link', <LinkIcon size={15} />, '[text](https://)', ''],
  ['quote', <Quote size={15} />, '> '],
  ['code-block', <span className="tool-label">{'};'}</span>, '```js\n', '\n```'],
  ['divider', <span className="tool-label">—</span>, '\n---\n'],
  ['table', <Table2 size={15} />, '| Column | Column |\n| --- | --- |\n| Value | Value |\n'],
  ['image', <ImageIcon size={15} />, '![alt](https://)', ''],
];

const CALLOUTS = [
  ['NOTE', 'NOTE'],
  ['TIP', 'TIP'],
  ['WARNING', 'WARNING'],
  ['IMPORTANT', 'IMPORTANT'],
];

const OUTPUT_RE = /```(?:output|terminal-output)\n([\s\S]*?)```/gi;

function relativeDate(value) {
  const ts = typeof value === 'number' ? value : Date.parse(value || '');
  if (!Number.isFinite(ts)) return 'just now';
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function parseSegments(value = '') {
  const out = [];
  let cursor = 0;
  for (const match of value.matchAll(OUTPUT_RE)) {
    const start = match.index ?? cursor;
    const end = start + match[0].length;
    if (start > cursor) out.push({ type: 'text', content: value.slice(cursor, start), start, end: start });
    out.push({ type: 'output', content: (match[1] || '').replace(/\n$/, ''), start, end });
    cursor = end;
  }
  if (cursor < value.length || !out.length) out.push({ type: 'text', content: value.slice(cursor), start: cursor, end: value.length });
  return out;
}

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch]);
}

function highlightCode(code = '') {
  let html = escapeHtml(code);
  html = html.replace(/(\/\/.*|#.*)$/gm, '<span class="tok-comment">$1</span>');
  html = html.replace(/(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;|`[^`]*?`)/g, '<span class="tok-string">$1</span>');
  html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|try|catch|throw|true|false|null|undefined)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
  return html;
}

function inlineMarkdown(text = '') {
  let safe = escapeHtml(text);
  safe = safe.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, '<img class="preview-image" alt="$1" src="$2" />');
  safe = safe.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  safe = safe.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  safe = safe.replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?:;])/g, '$1<em>$2</em>');
  return safe;
}

function Preview({ body, readability }) {
  const [copied, setCopied] = useState('');
  const lines = useMemo(() => body.split('\n'), [body]);

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1300);
    } catch {}
  };

  if (!body.trim()) {
    return <div className="generated-empty-preview"><strong>Start writing your note...</strong><span>Your formatted content will appear here in real-time.</span></div>;
  }

  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      const start = i + 1;
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) i += 1;
      const code = lines.slice(start, i).join('\n');
      const key = `code-${start}`;
      blocks.push(<section className="preview-code" key={key}><div className="preview-code-head"><span>{language || 'code'}</span><button onClick={() => copy(code, key)}><Copy size={12} />{copied === key ? 'Copied' : 'Copy'}</button></div><pre><code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} /></pre></section>);
      i += 1;
      continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1].replace(/\|/g, ''))) {
      const table = [];
      const head = line.split('|').slice(1, -1).map(cell => cell.trim());
      i += 2;
      while (i < lines.length && /^\|/.test(lines[i])) { table.push(lines[i].split('|').slice(1, -1).map(cell => cell.trim())); i += 1; }
      blocks.push(<div className="preview-table-wrap" key={`table-${i}`}><table><thead><tr>{head.map((c, idx) => <th key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(c) }} />)}</tr></thead><tbody>{table.map((row, r) => <tr key={r}>{head.map((_, c) => <td key={c} dangerouslySetInnerHTML={{ __html: inlineMarkdown(row[c] || '') }} />)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quoted.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      blocks.push(<blockquote key={`quote-${i}`}>{quoted.map((q, idx) => <div key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(q) }} />)}</blockquote>);
      continue;
    }
    const callout = line.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
    if (callout) {
      blocks.push(<aside className={`preview-callout callout-${callout[1].toLowerCase()}`} key={`callout-${i}`}><b>{callout[1].toUpperCase()}</b><span dangerouslySetInnerHTML={{ __html: inlineMarkdown(callout[2]) }} /></aside>);
      i += 1;
      continue;
    }
    if (/^(?:---|\*\*\*)$/.test(line.trim())) { blocks.push(<hr key={`hr-${i}`} />); i += 1; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const Tag = `h${Math.min(4, heading[1].length)}`;
      blocks.push(<Tag key={`h-${i}`} dangerouslySetInnerHTML={{ __html: inlineMarkdown(heading[2]) }} />); i += 1; continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i += 1; }
      blocks.push(<ul key={`ul-${i}`}>{items.map((item, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />)}</ul>); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i += 1; }
      blocks.push(<ol key={`ol-${i}`}>{items.map((item, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />)}</ol>); continue;
    }
    if (/^\s*- \[[ xX]\]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*- \[[ xX]\]\s+/.test(lines[i])) { const match = lines[i].match(/^\s*- \[([ xX])\]\s+(.+)$/); items.push(match); i += 1; }
      blocks.push(<ul className="task-list" key={`task-${i}`}>{items.map((m, idx) => <li key={idx}><input type="checkbox" checked={m[1].toLowerCase() === 'x'} readOnly /><span dangerouslySetInnerHTML={{ __html: inlineMarkdown(m[2]) }} /></li>)}</ul>); continue;
    }
    if (!line.trim()) { blocks.push(<div className="preview-space" key={`space-${i}`} />); i += 1; continue; }
    blocks.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />);
    i += 1;
  }

  return <div className="generated-preview-content"><div className="generated-preview-mini"><span><Eye size={13} /> Preview</span><button onClick={() => copy(body, 'all')}><Copy size={12} />{copied === 'all' ? 'Copied' : 'Copy all'}</button></div><article style={{ fontSize: READABILITY[readability][0], lineHeight: READABILITY[readability][1] }}>{blocks}</article></div>;
}

export default function MobileNoteEditor({ note, notes, onBack, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...note }));
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const [mode, setMode] = useState('edit');
  const [readability, setReadability] = useState(() => localStorage.getItem('mobile-note-readability') || 'default');
  const [moreOpen, setMoreOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastSaved, setLastSaved] = useState(note.updatedAt || note.createdAt);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef(null);
  const saveTimer = useRef(null);

  const segments = useMemo(() => parseSegments(draft.content || ''), [draft.content]);

  const saveNow = useCallback(async (value = draft) => {
    try { await onSave?.(value); setLastSaved(Date.now()); } catch {}
  }, [draft, onSave]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveTimer.current = null; saveNow({ ...draft }); }, 650);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, saveNow]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const commit = useCallback(patch => {
    setDraft(current => {
      setHistory(items => [...items.slice(-80), current]);
      setRedo([]);
      return { ...current, ...patch, updatedAt: Date.now() };
    });
  }, []);

  const updateSegment = (index, next) => {
    const current = draft.content || '';
    const seg = parseSegments(current)[index];
    if (!seg) return;
    const replacement = seg.type === 'output' ? `\`\`\`output\n${next}\n\`\`\`` : next;
    commit({ content: current.slice(0, seg.start) + replacement + current.slice(seg.end) });
  };

  const insertTool = tool => {
    const el = textareaRef.current;
    const seg = segments[activeIndex];
    if (!seg || seg.type !== 'text') return;
    const local = seg.content || '';
    const start = el?.selectionStart ?? local.length;
    const end = el?.selectionEnd ?? local.length;
    const selected = local.slice(start, end);
    const open = tool[2];
    const close = tool[3] || '';
    const formatted = close ? `${open}${selected || 'text'}${close}` : `${open}${selected}`;
    updateSegment(activeIndex, local.slice(0, start) + formatted + local.slice(end));
    requestAnimationFrame(() => { el?.focus(); });
    setMoreOpen(false);
  };

  const insertCallout = label => {
    insertTool(['callout', null, `> [!${label}] `, '']);
  };

  const undo = () => {
    const previous = history.at(-1); if (!previous) return;
    setRedo(items => [...items, draft]); setDraft(previous); setHistory(items => items.slice(0, -1));
  };
  const redoEdit = () => {
    const next = redo.at(-1); if (!next) return;
    setHistory(items => [...items, draft]); setDraft(next); setRedo(items => items.slice(0, -1));
  };
  const removeOutput = index => updateSegment(index, '');

  return <section className="mobile-note-editor generated-editor-glass">
    <header className="generated-editor-topbar">
      <button className="generated-back" onClick={onBack} aria-label="Back"><ArrowLeft size={17} /></button>
      <div className="generated-title-inline"><input value={draft.title || ''} onChange={e => commit({ title: e.target.value })} placeholder="Note Title..." aria-label="Note title" /></div>
      <div className="generated-top-actions"><button onClick={() => setConfirmDelete(true)} aria-label="Delete"><Trash2 size={16} /></button><i /><button onClick={() => setMoreOpen(v => !v)} aria-label="More"><MoreHorizontal size={17} /></button></div>
      {moreOpen && <div className="generated-more-menu"><button onClick={() => { setMode(mode === 'edit' ? 'preview' : 'edit'); setMoreOpen(false); }}>{mode === 'edit' ? 'Preview' : 'Edit'}</button><button onClick={() => { setToolbarOpen(v => !v); setMoreOpen(false); }}>{toolbarOpen ? 'Hide Markdown' : 'Markdown'}</button><button onClick={() => { saveNow({ ...draft }); setMoreOpen(false); }}>Save now</button></div>}
    </header>

    {mode === 'edit' && toolbarOpen && <div className="generated-format-toolbar">{TOOLS.map(tool => <button key={tool[0]} onClick={() => insertTool(tool)} disabled={mode === 'preview'} aria-label={tool[0]} title={tool[0]}>{tool[1]}</button>)}<i />{CALLOUTS.map(([key, label]) => <button key={key} className="callout-tool" onClick={() => insertCallout(label)} aria-label={label}>{label[0]}</button>)}<button onClick={() => setToolbarOpen(false)} aria-label="Hide Markdown"><MoreHorizontal size={16} /></button></div>}

    {mode === 'edit' && <div className="generated-controls"><div className="generated-history"><button onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button onClick={redoEdit} disabled={!redo.length} aria-label="Redo"><Redo2 size={16} /></button></div><div className="generated-mode-switch"><button className="active" onClick={() => setMode('edit')}><Pencil size={13} /> Edit</button><button onClick={() => setMode('preview')}><Eye size={13} /> Preview</button></div><label className="generated-readability"><span>☼</span><select value={readability} onChange={e => { setReadability(e.target.value); localStorage.setItem('mobile-note-readability', e.target.value); }}><option value="default">Default</option><option value="good">Good</option><option value="best">Best</option><option value="great">Great</option></select><ChevronDown size={13} /></label></div>}

    <div className={`generated-workarea ${mode === 'preview' ? 'preview-mode' : ''}`}>
      {mode === 'edit' ? <div className="generated-editor-pane">{segments.map((seg, index) => seg.type === 'output' ? <section className="document-output" key={`output-${index}`}><div><span>Output</span><button onClick={() => removeOutput(index)}>Remove</button></div><textarea value={seg.content} onChange={e => updateSegment(index, e.target.value)} /></section> : <textarea key={`text-${index}`} ref={index === activeIndex ? textareaRef : null} value={seg.content} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} onChange={e => updateSegment(index, e.target.value)} placeholder={index === 0 ? 'Start writing your note...' : ''} spellCheck={false} />)}</div> : <div className="generated-preview-pane"><Preview body={draft.content || ''} readability={readability} /></div>}
    </div>

    <footer className="generated-editor-footer"><span><Save size={14} /><b>Autosaved</b> {relativeDate(lastSaved)}</span><button onClick={() => saveNow({ ...draft })}><Save size={15} /> Save</button></footer>

    {confirmDelete && <div className="delete-confirm-overlay"><div className="delete-confirm-card"><button className="delete-close" onClick={() => setConfirmDelete(false)}><X size={16} /></button><div className="delete-icon"><Trash2 size={19} /></div><h2>Delete note?</h2><p>This note will be removed from this collection.</p><div className="delete-actions"><button onClick={() => setConfirmDelete(false)}>Cancel</button><button className="danger" onClick={() => { setConfirmDelete(false); onDelete?.(draft.id); }}>Delete</button></div></div></div>}
  </section>;
}
