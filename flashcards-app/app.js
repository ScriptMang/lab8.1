const LS = 'simple_flashcards_v1';
const DECKS_LS = 'simple_flashcards_decks_v1';

let cards = loadCards();
let decks = loadDecks();

// state for main cards
let i = 0, showingBack = false;
// state for deck study
let currentDeckId = null, deckIndex = 0, deckShowingBack = false;

// DOM — views
const cardsView = document.getElementById('cardsView');
const decksView = document.getElementById('decksView');
const deckStudyView = document.getElementById('deckStudyView');

// DOM — cards view
const faceEl = document.getElementById('face');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const addBtn = document.getElementById('add');
const deleteBtn = document.getElementById('delete');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');
const importFile = document.getElementById('importFile');
const saveToDeckBtn = document.getElementById('saveToDeck');
const viewDecksBtn = document.getElementById('viewDecks');
const viewCardsBtn = document.getElementById('viewCards');

// DOM — decks view
const deckList = document.getElementById('deckList');
const newDeckBtn = document.getElementById('newDeck');
const backToCardsBtn = document.getElementById('backToCards');
const deckModal = document.getElementById('deckModal');
const deckName = document.getElementById('deckName');
const createDeckBtn = document.getElementById('createDeck');
const cancelDeckBtn = document.getElementById('cancelDeck');

// DOM — deck study
const deckTitle = document.getElementById('deckTitle');
const deckFace = document.getElementById('deckFace');
const dPrev = document.getElementById('dPrev');
const dNext = document.getElementById('dNext');
const dFlip = document.getElementById('dFlip');
const dDelete = document.getElementById('dDelete');
const dBack = document.getElementById('dBack');
const dStatus = document.getElementById('dStatus');

bind();
renderCards();
renderDeckList();

function bind(){
  viewDecksBtn.addEventListener('click', ()=> showView('decks'));
  viewCardsBtn.addEventListener('click', ()=> showView('cards'));

  prevBtn.addEventListener('click', ()=> { if(!cards.length) return; i=(i-1+cards.length)%cards.length; showingBack=false; renderCards(); });
  nextBtn.addEventListener('click', ()=> { if(!cards.length) return; i=(i+1)%cards.length; showingBack=false; renderCards(); });
  flipBtn.addEventListener('click', ()=> { if(!cards.length) return; showingBack=!showingBack; renderCards(); });

  addBtn.addEventListener('click', ()=>{
    const front = prompt('Front (question/prompt):'); if(!front) return;
    const back = prompt('Back (answer):') || '';
    const card = { id: uid(), front, back };
    cards.push(card); i = cards.length-1; saveCards(); renderCards(); renderDeckList();
  });

  deleteBtn.addEventListener('click', ()=>{
    if(!cards.length) return;
    if(!confirm('Delete this card?')) return;
    const removed = cards.splice(i,1)[0];
    decks.forEach(d => { d.cards = (d.cards||[]).filter(c => c.id !== removed.id); });
    if(cards.length===0) i=0; else i = Math.max(0, i-1);
    saveAll(); renderCards(); renderDeckList();
  });

  saveToDeckBtn.addEventListener('click', ()=>{
    if(!cards.length) return alert('No cards to save');
    if(!decks.length) return alert('Create a deck first');
    const list = decks.map((d,idx)=>`${idx}: ${d.name}`).join('\n');
    const input = prompt(`Select deck (enter number):\n${list}`);
    if(input===null) return;
    const idx = parseInt(input);
    if(isNaN(idx) || idx<0 || idx>=decks.length) return alert('Invalid deck');
    const card = cards[i];
    const deck = decks[idx];
    if((deck.cards||[]).find(c=>c.id===card.id)) return alert('Card already in deck');
    deck.cards = deck.cards || [];
    deck.cards.push(JSON.parse(JSON.stringify(card)));
    saveDecks(); alert('Saved to deck');
    renderDeckList();
  });

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(cards, null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='flashcards.json'; document.body.appendChild(a); a.click(); a.remove();
  });

  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev=>{
      try{
        const data = JSON.parse(ev.target.result);
        if(!Array.isArray(data)) throw new Error('Invalid');
        const existing = new Set(cards.map(c=>c.id));
        data.forEach(c=>{
          const front = c.front||''; if(!front) return;
          let id = c.id || uid(); while(existing.has(id)) id = uid();
          existing.add(id); cards.push({id, front, back: c.back||''});
        });
        saveAll(); renderCards(); renderDeckList();
        alert('Imported');
      }catch{ alert('Import failed'); }
    };
    r.readAsText(f); importFile.value='';
  });

  // decks view
  newDeckBtn.addEventListener('click', ()=> { 
    deckModal.classList.remove('hidden'); 
    deckModal.setAttribute('aria-hidden','false'); 
    deckName.value=''; 
    deckName.focus(); 
  });
  
  cancelDeckBtn.addEventListener('click', ()=> { 
    deckModal.classList.add('hidden'); 
    deckModal.setAttribute('aria-hidden','true'); 
  });
  
  createDeckBtn.addEventListener('click', ()=>{
    const name = deckName.value.trim(); 
    if(!name) {
      alert('Enter deck name');
      return;
    }
    decks.push({ id: uid(), name, cards: [] }); 
    saveDecks(); 
    deckModal.classList.add('hidden'); 
    deckModal.setAttribute('aria-hidden','true');
    deckName.value = '';
    renderDeckList();
  });

  backToCardsBtn.addEventListener('click', ()=> showView('cards'));

  deckList.addEventListener('click', e=>{
    const btn = e.target;
    if(btn.classList.contains('view-deck')){
      currentDeckId = btn.dataset.id; 
      startDeckStudy(currentDeckId);
    }
    if(btn.classList.contains('delete-deck')){
      if(!confirm('Delete deck?')) return;
      decks = decks.filter(d=>d.id !== btn.dataset.id); 
      saveDecks(); 
      renderDeckList();
    }
  });

  // deck study
  dPrev.addEventListener('click', ()=> { 
    if(!getDeckCards().length) return; 
    deckIndex=(deckIndex-1+getDeckCards().length)%getDeckCards().length; 
    deckShowingBack=false; 
    renderDeck(); 
  });
  
  dNext.addEventListener('click', ()=> { 
    if(!getDeckCards().length) return; 
    deckIndex=(deckIndex+1)%getDeckCards().length; 
    deckShowingBack=false; 
    renderDeck(); 
  });
  
  dFlip.addEventListener('click', ()=> { 
    if(!getDeckCards().length) return; 
    deckShowingBack=!deckShowingBack; 
    renderDeck(); 
  });
  
  dDelete.addEventListener('click', ()=>{
    const list = getDeckCards();
    if(!list.length) return;
    if(!confirm('Delete this card from deck?')) return;
    list.splice(deckIndex,1);
    const deck = decks.find(d=>d.id===currentDeckId);
    deck.cards = list;
    if(list.length===0) deckIndex=0; else deckIndex = Math.max(0, deckIndex-1);
    saveDecks(); 
    renderDeck();
    renderDeckList();
  });
  
  dBack.addEventListener('click', ()=> { 
    currentDeckId=null; 
    showView('decks'); 
  });
}

function showView(v){
  cardsView.classList.toggle('hidden', v!=='cards');
  decksView.classList.toggle('hidden', v!=='decks');
  deckStudyView.classList.toggle('hidden', v!=='study');
  cardsView.setAttribute('aria-hidden', v!=='cards');
  decksView.setAttribute('aria-hidden', v!=='decks');
  deckStudyView.setAttribute('aria-hidden', v!=='study');
}

function renderCards(){
  if(!cards.length){ 
    faceEl.textContent = 'No cards — add one'; 
    statusEl.textContent = '0 / 0'; 
    return; 
  }
  const c = cards[i];
  faceEl.textContent = showingBack ? (c.back||'(no answer)') : c.front;
  statusEl.textContent = `${i+1} / ${cards.length}`;
}

function renderDeckList(){
  deckList.innerHTML = '';
  if(!decks.length){ 
    deckList.innerHTML = '<p style="color:#999">No decks</p>'; 
    return; 
  }
  decks.forEach(d=>{
    const el = document.createElement('div'); 
    el.className='deck-item';
    el.innerHTML = `<div class="deck-info"><strong>${escapeHtml(d.name)}</strong><div style="font-size:12px;color:#999">${(d.cards||[]).length} cards</div></div>
                    <div class="deck-controls">
                      <button class="small-btn view-deck" data-id="${d.id}" aria-label="Study ${escapeHtml(d.name)}">Study</button>
                      <button class="small-btn delete-deck" data-id="${d.id}" aria-label="Delete ${escapeHtml(d.name)}">Delete</button>
                    </div>`;
    deckList.appendChild(el);
  });
}

function startDeckStudy(id){
  currentDeckId = id;
  deckIndex = 0;
  deckShowingBack = false;
  showView('study');
  renderDeck();
  const deck = decks.find(d=>d.id===id);
  deckTitle.textContent = deck ? deck.name : 'Deck';
}

function getDeckCards(){
  const deck = decks.find(d=>d.id===currentDeckId);
  return deck ? deck.cards || [] : [];
}

function renderDeck(){
  const list = getDeckCards();
  if(!list.length){ 
    deckFace.textContent='No cards in deck'; 
    dStatus.textContent='0 / 0'; 
    return; 
  }
  const c = list[deckIndex];
  deckFace.textContent = deckShowingBack ? (c.back||'(no answer)') : c.front;
  dStatus.textContent = `${deckIndex+1} / ${list.length}`;
}

function loadCards(){ 
  try{ 
    return JSON.parse(localStorage.getItem(LS)) || []; 
  }catch{
    return [];
  } 
}

function saveCards(){ 
  try{ 
    localStorage.setItem(LS, JSON.stringify(cards)); 
  }catch{} 
}

function loadDecks(){ 
  try{ 
    return JSON.parse(localStorage.getItem(DECKS_LS)) || []; 
  }catch{
    return [];
  } 
}

function saveDecks(){ 
  try{ 
    localStorage.setItem(DECKS_LS, JSON.stringify(decks)); 
  }catch{} 
}

function saveAll(){ 
  saveCards(); 
  saveDecks(); 
}

function uid(){ 
  return Math.random().toString(36).slice(2,10); 
}

function escapeHtml(s){ 
  return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); 
}

window.addEventListener('beforeunload', saveAll);