// ...existing code...
const LS = 'simple_flashcards_v1';
let cards = load();
let i = 0;
let showingBack = false;

const cardEl = document.getElementById('card');
const faceEl = document.getElementById('face');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const addBtn = document.getElementById('add');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');
const importFile = document.getElementById('importFile');

render();

prevBtn.addEventListener('click', () => {
  if (!cards.length) return;
  i = (i - 1 + cards.length) % cards.length;
  showingBack = false;
  render();
});

nextBtn.addEventListener('click', () => {
  if (!cards.length) return;
  i = (i + 1) % cards.length;
  showingBack = false;
  render();
});

flipBtn.addEventListener('click', () => {
  if (!cards.length) return;
  showingBack = !showingBack;
  render();
});

addBtn.addEventListener('click', () => {
  const front = prompt('Front (question/prompt):');
  if (!front) return;
  const back = prompt('Back (answer):') || '';
  cards.push({ id: uid(), front, back });
  i = cards.length - 1;
  save();
  showingBack = false;
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      const added = [];
      const existing = new Set(cards.map(c => c.id));
      data.forEach(c => {
        const front = c.front || '';
        if (!front) return;
        const back = c.back || '';
        let id = c.id || uid();
        while (existing.has(id)) id = uid();
        existing.add(id);
        cards.push({ id, front, back });
        added.push(id);
      });
      save();
      render();
      alert(`Imported ${added.length} card(s)`);
    } catch {
      alert('Import failed');
    }
  };
  r.readAsText(f);
  importFile.value = '';
});

function render() {
  if (!cards.length) {
    faceEl.textContent = 'No cards — add one';
    statusEl.textContent = '0 / 0';
    return;
  }
  const c = cards[i];
  faceEl.textContent = showingBack ? (c.back || '(no answer)') : c.front;
  statusEl.textContent = `${i + 1} / ${cards.length}`;
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(LS, JSON.stringify(cards));
  } catch {}
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

window.addEventListener('beforeunload', save);