(() => {
  const qs = (root, selector) => root?.querySelector(selector);
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];
  const esc = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  let timer = null;
  let timerSeconds = 25 * 60;
  let running = false;

  function close() {
    document.querySelector('.reference-interface-overlay')?.remove();
    if (timer) clearInterval(timer);
    timer = null;
    running = false;
  }

  function shell(title, eyebrow, body, active = '') {
    close();
    const overlay = document.createElement('div');
    overlay.className = 'reference-interface-overlay';
    overlay.innerHTML = `<section class="reference-interface-panel">
      <header class="reference-interface-header">
        <button class="reference-back" data-ref-close aria-label="Back">‹</button>
        <div><span class="reference-eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1></div>
        <button class="reference-header-action" data-ref-more aria-label="More">•••</button>
      </header>
      <div class="reference-interface-body">${body}</div>
      <nav class="reference-bottom-nav" aria-label="Mobile navigation">
        ${['home','courses','collections','notes','more'].map((key) => `<button data-ref-nav="${key}" class="${active === key ? 'active':''}"><span>${key==='home'?'⌂':key==='courses'?'▣':key==='collections'?'▥':key==='notes'?'▤':'•••'}</span><small>${key[0].toUpperCase()+key.slice(1)}</small></button>`).join('')}
      </nav>
    </section>`;
    document.body.appendChild(overlay);
    qs(overlay, '[data-ref-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    qsa(overlay, '[data-ref-nav]').forEach((button) => button.addEventListener('click', () => route(button.dataset.refNav)));
    qs(overlay, '[data-ref-more]')?.addEventListener('click', () => showMore());
    return overlay;
  }

  function route(key) {
    if (key === 'home') return close();
    if (key === 'courses') return showCourses();
    if (key === 'notes') return showNotes();
    if (key === 'collections') return showCourses(true);
    if (key === 'more') return showSettings();
  }

  function showCourses(collectionMode = false) {
    const dashboard = document.querySelector('.dashboard-screen');
    const cards = qsa(dashboard, '.course-dashboard-card');
    const rows = cards.map((card, index) => {
      const name = qs(card, '.course-copy h3')?.textContent?.trim() || `Course ${index + 1}`;
      const desc = qs(card, '.course-copy p')?.textContent?.trim() || 'Course workspace';
      const count = (card.textContent.match(/(\d+)\s+notes?/i) || [])[1] || '0';
      return `<button class="reference-course-row" data-open-course="${index}"><span class="reference-course-icon">▣</span><span><strong>${esc(name)}</strong><small>${esc(desc)}</small><em>${count} ${Number(count) === 1 ? 'note' : 'notes'}</em></span><b>›</b></button>`;
    }).join('') || '<div class="reference-empty">No courses yet.</div>';
    const overlay = shell('Course Folders', 'Course library', `<label class="reference-search">⌕ <input placeholder="Search courses…" /></label><div class="reference-list">${rows}</div>`, 'courses');
    qsa(overlay, '[data-open-course]').forEach((button) => button.addEventListener('click', () => {
      const target = qsa(dashboard, '.course-dashboard-card')[Number(button.dataset.openCourse)];
      close();
      qs(target, '.course-open')?.click();
    }));
  }

  function scrapeNotes() {
    const rows = qsa(document, '.course-details-screen .course-detail-list .course-detail-row');
    return rows.map((row, index) => ({
      title: qs(row, 'strong')?.textContent?.trim() || `Note ${index + 1}`,
      meta: qs(row, 'small')?.textContent?.trim() || 'Course note'
    }));
  }

  function showNotes() {
    const existing = document.querySelector('.course-details-screen');
    if (existing) return renderNotes(scrapeNotes());
    const first = qs(document, '.dashboard-screen .course-dashboard-card .course-open');
    if (first) {
      first.click();
      setTimeout(() => renderNotes(scrapeNotes()), 120);
      return;
    }
    renderNotes([]);
  }

  function renderNotes(notes) {
    const rows = notes.map((note) => `<button class="reference-note-row"><span class="reference-note-icon">▤</span><span><strong>${esc(note.title)}</strong><small>${esc(note.meta)}</small></span><b>›</b></button>`).join('');
    shell('Notes', `${notes.length} notes`, `<label class="reference-search">⌕ <input placeholder="Search notes…" /></label><div class="reference-list">${rows || '<div class="reference-empty">No notes yet.</div>'}</div>`, 'notes');
  }

  function showPomodoro() {
    const overlay = shell('Pomodoro Timer', 'Study Session', `<div class="reference-pomodoro"><div class="reference-ring"><strong data-timer>25:00</strong><small>Focus Time</small><button class="reference-play" data-play>▶</button></div><div class="reference-timer-presets">${[25,50,90].map((m)=><button data-minutes="${m}" class="${m===25?'active':''}">${m}</button>)}</div><span class="reference-minute-label">Minutes</span><section class="reference-session-card"><strong>Today's Session</strong><button>◉ Focus Time <span>25 min ›</span></button><button>☕ Short Break <span>5 min ›</span></button><button>☕ Long Break <span>15 min ›</span></button></section></div>`, '');
    const display = qs(overlay, '[data-timer]');
    const play = qs(overlay, '[data-play]');
    qsa(overlay, '[data-minutes]').forEach((button) => button.addEventListener('click', () => {
      timerSeconds = Number(button.dataset.minutes) * 60; running = false; if (timer) clearInterval(timer); timer = null;
      qsa(overlay, '[data-minutes]').forEach((b) => b.classList.remove('active')); button.classList.add('active'); updateTimer(display, play);
    }));
    play.addEventListener('click', () => {
      running = !running; play.textContent = running ? 'Ⅱ' : '▶';
      if (running) timer = setInterval(() => { if (timerSeconds <= 0) { running=false; clearInterval(timer); timer=null; play.textContent='▶'; } else timerSeconds -= 1; updateTimer(display, play); }, 1000);
      else if (timer) { clearInterval(timer); timer=null; }
    });
  }
  function updateTimer(display) { const m=String(Math.floor(timerSeconds/60)).padStart(2,'0'); const s=String(timerSeconds%60).padStart(2,'0'); display.textContent=`${m}:${s}`; }

  function showOverview() {
    const cards = qsa(document, '.dashboard-screen .course-dashboard-card');
    const courses = cards.length;
    const notes = cards.reduce((sum, card) => sum + Number((card.textContent.match(/(\d+)\s+notes?/i)||[])[1]||0), 0);
    const progress = Number((cards[0]?.textContent.match(/(\d+)%\s+complete/i)||[])[1]||0);
    shell('Overview', 'Your learning progress at a glance', `<div class="reference-overview-tabs"><button class="active">Progress</button><button>Stats</button><button>Insights</button></div><section class="reference-overview-card"><div class="reference-donut"><strong>${progress}%</strong><small>Overall Progress</small></div><div class="reference-legend"><span>● Completed <b>${progress ? Math.round(progress/12) : 0}</b></span><span>● In Progress <b>${progress ? 1 : 0}</b></span><span>● Not Started <b>${Math.max(0,courses-(progress ? 2 : 0))}</b></span></div></section><section class="reference-overview-card"><div class="reference-card-title"><strong>Recent Activity</strong><span>Live</span></div><div class="reference-activity"><span>▤</span><p>Notes available in your current course</p><em>${notes} notes</em></div><div class="reference-activity"><span>▣</span><p>${courses} course${courses===1?'':'s'} in workspace</p><em>Current</em></div></div></section><section class="reference-quick-stats"><b>${notes}<small>Total Notes</small></b><b>${courses}<small>Courses</small></b><b>${cards.reduce((n,c)=>n+(c.querySelectorAll('.folder-icon')?.length||0),0)}<small>Collections</small></b></section>`, '');
  }

  function showSettings() {
    const perf = localStorage.getItem('mobile-liquid-glass-performance') === 'ultra' ? 'Ultra' : 'High';
    const currentTheme = localStorage.getItem('mobile-liquid-glass-theme') || 'Auto';
    const overlay = shell('Settings', 'Mobile-liquid-glass', `<section class="reference-profile"><span class="reference-avatar">●</span><div><strong>Student</strong><small>${location.host || 'student@example.com'}</small></div></section><section class="reference-settings-card"><button data-theme>◌ <span>Appearance</span><em>${currentTheme} ›</em></button><button data-performance>◉ <span>Performance</span><em>${perf} ›</em></button><button>◌ <span>Notifications</span><em>Enabled ›</em></button><button>⌘ <span>Privacy & Security</span><em>›</em></button><button>?</button><button>ⓘ <span>About App</span><em>Mobile-liquid-glass v1.0 ›</em></button></section>`, 'more');
    qs(overlay, '[data-theme]').addEventListener('click', () => cycleTheme(overlay));
    qs(overlay, '[data-performance]').addEventListener('click', () => cyclePerformance(overlay));
  }
  function cycleTheme(overlay) {
    const order=['Auto','Light','Dark']; const cur=localStorage.getItem('mobile-liquid-glass-theme')||'Auto'; const next=order[(order.indexOf(cur)+1)%order.length]; localStorage.setItem('mobile-liquid-glass-theme',next); document.documentElement.dataset.liquidTheme=next.toLowerCase(); qs(overlay,'[data-theme] em').textContent=`${next} ›`;
  }
  function cyclePerformance(overlay) {
    const next=localStorage.getItem('mobile-liquid-glass-performance')==='ultra'?'high':'ultra'; localStorage.setItem('mobile-liquid-glass-performance',next); qs(overlay,'[data-performance] em').textContent=`${next==='ultra'?'Ultra':'High'} ›`;
  }

  function showMore() {
    const overlay = shell('Quick Access', 'Liquid Glass Studio', `<div class="reference-more-actions"><button data-open="notes">Notes</button><button data-open="pomodoro">Pomodoro Timer</button><button data-open="overview">Overview</button><button data-open="settings">Settings</button><button data-open="courses">Course Folders</button></div>`, 'more');
    qsa(overlay,'[data-open]').forEach((b)=>b.addEventListener('click',()=>{
      const key=b.dataset.open; if(key==='notes') showNotes(); else if(key==='pomodoro') showPomodoro(); else if(key==='overview') showOverview(); else if(key==='settings') showSettings(); else showCourses();
    }));
  }

  function showAddCourse() {
    const overlay = shell('Add New Course', 'Create a new course', `<form class="reference-add-course" data-create-course><label>Course Name<input name="name" placeholder="e.g. Computer Science" required /></label><label>Description <span>(optional)</span><textarea name="description" placeholder="Brief description of your course…" rows="4"></textarea></label><span class="reference-field-label">Accent Color</span><div class="reference-colors">${['sky','violet','amber','emerald','rose','cyan'].map(c=>`<button type="button" data-color="${c}" class="${c==='sky'?'active':''}">${c}</button>`).join('')}</div><button class="reference-primary" type="submit">Create Course →</button></form>`, '');
    qsa(overlay,'[data-color]').forEach((b)=>b.addEventListener('click',()=>{qsa(overlay,'[data-color]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
    qs(overlay,'[data-create-course]').addEventListener('submit',(e)=>{
      e.preventDefault(); const name=e.currentTarget.name.value.trim(); const desc=e.currentTarget.description.value.trim();
      close(); const trigger=qs(document,'.dashboard-screen .add-course-trigger'); trigger?.click();
      setTimeout(()=>{ const modal=qs(document,'.course-create-form'); if(!modal)return; const inputs=qsa(modal,'input,textarea'); if(inputs[0]){inputs[0].value=name;inputs[0].dispatchEvent(new Event('input',{bubbles:true}));} if(inputs[1]){inputs[1].value=desc;inputs[1].dispatchEvent(new Event('input',{bubbles:true}));} qs(modal,'button[type="submit"]')?.click(); },60);
    });
  }

  function handle(e) {
    if (e.defaultPrevented) return;
    const target = e.target.closest('button'); if(!target) return;
    const text=(target.textContent||'').trim();
    const inOverlay=target.closest('.reference-interface-overlay');
    if(inOverlay) return;
    const dashboard=target.closest('.dashboard-screen');
    if(dashboard){
      if(target.classList.contains('action-card')){
        if(text.includes('Pomodoro')){e.preventDefault();e.stopPropagation();showPomodoro();}
        else if(text.includes('Overview')){e.preventDefault();e.stopPropagation();showOverview();}
        else if(text.includes('Study Hub')){e.preventDefault();e.stopPropagation();showCourses();}
      }
      if(target.getAttribute('aria-label')==='Theme'){e.preventDefault();e.stopPropagation();showSettings();}
      if(target.getAttribute('aria-label')==='Settings'){e.preventDefault();e.stopPropagation();showSettings();}
      if(target.classList.contains('add-course-trigger')){e.preventDefault();e.stopPropagation();showAddCourse();}
      if(target.matches('.dashboard-nav-item')){const key=target.dataset.dashboardNav;e.preventDefault();e.stopPropagation(); if(key==='courses')showCourses(); else if(key==='notes')showNotes(); else if(key==='collections')showCourses(true); else if(key==='more')showMore();}
    }
    const courseScreen=target.closest('.course-details-screen');
    if(courseScreen && target.closest('.course-mobile-nav')){
      const label=(target.textContent||'').trim().toLowerCase();
      e.preventDefault(); e.stopPropagation();
      if(label.includes('more')) showMore();
      else if(label.includes('notes')) showNotes();
      else if(label.includes('collections')) { const first=qsa(courseScreen,'.course-detail-row')[0]; first?.click(); }
      else if(label.includes('courses')) showCourses();
      else if(label.includes('home')) qs(courseScreen,'.back-button')?.click();
    }
  }

  document.addEventListener('click', handle, true);
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')close();});
})();
