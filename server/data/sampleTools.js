/**
 * Sample Custom Tools for new users
 * These are pre-built, working tools that demonstrate the Custom Tools feature
 */

const SAMPLE_TOOLS = [
  {
    name: 'Weltuhr (3 Zeitzonen)',
    description: 'Zeigt die aktuelle Uhrzeit in 3 verschiedenen Zeitzonen an',
    parameters_schema: {
      tz1: 'Europe/Berlin',
      tz2: 'America/New_York',
      tz3: 'Asia/Tokyo',
      hour12: false,
      showSeconds: true,
      hue: 260
    },
    refresh_interval: 0,
    generated_code: `function render(params) {
  const p = params || {};
  const tz1 = p.tz1 || 'Europe/Berlin';
  const tz2 = p.tz2 || 'America/New_York';
  const tz3 = p.tz3 || 'Asia/Tokyo';
  const hour12 = typeof p.hour12 === 'boolean' ? p.hour12 : false;
  const showSeconds = typeof p.showSeconds === 'boolean' ? p.showSeconds : true;
  const hue = typeof p.hue === 'number' ? p.hue : 260;
  const cid = 'wc' + Math.floor(Math.random() * 1e6);
  const defaults = JSON.stringify([tz1, tz2, tz3]);
  const html = \`
<style>
  #\${cid} { font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, 'Helvetica Neue', Arial, sans-serif; color: white; }
  #\${cid} * { box-sizing: border-box; }
  #\${cid} .wrap { position: relative; border-radius: 24px; padding: 22px; overflow: hidden; background: linear-gradient(135deg, hsl(calc(var(--h) + 210) 60% 12%), hsl(calc(var(--h) + 260) 60% 9%)); box-shadow: 0 20px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04); }
  #\${cid} .wrap::before { content: ''; position: absolute; width: 520px; height: 520px; top: -220px; right: -220px; background: radial-gradient(circle at center, hsl(calc(var(--h) + 20) 85% 55% / 0.35), transparent 70%); filter: blur(40px); animation: spin-slow 30s linear infinite; }
  #\${cid} .wrap::after { content: ''; position: absolute; width: 400px; height: 400px; bottom: -160px; left: -160px; background: radial-gradient(circle at center, hsl(calc(var(--h) + 140) 85% 55% / 0.28), transparent 70%); filter: blur(36px); animation: drift 16s ease-in-out infinite; }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  @keyframes drift { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
  #\${cid} .toolbar { position: relative; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  #\${cid} .title { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: 0.2px; }
  #\${cid} .title .badge { margin-left: 6px; font-size: 12px; padding: 3px 8px; border-radius: 999px; background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08)); border: 1px solid rgba(255,255,255,0.16); color: #dbeafe; text-transform: uppercase; letter-spacing: 1px; }
  #\${cid} .live-dot { width: 8px; height: 8px; border-radius: 50%; background: hsl(calc(var(--h) + 10) 90% 60%); box-shadow: 0 0 12px hsl(calc(var(--h) + 10) 90% 60% / 0.8); margin-left: 6px; opacity: 0.6; }
  #\${cid} .live-dot.on { animation: blink 1.4s ease-in-out infinite; opacity: 1; }
  @keyframes blink { 0%,100% { transform: scale(1); box-shadow: 0 0 8px hsl(calc(var(--h) + 10) 90% 60% / 0.8); } 50% { transform: scale(1.2); box-shadow: 0 0 18px hsl(calc(var(--h) + 10) 90% 60% / 0.9); } }
  #\${cid} .controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  #\${cid} .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; height: 40px; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)); color: white; border: 1px solid rgba(255,255,255,0.16); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  #\${cid} .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
  #\${cid} .btn.active { background: linear-gradient(180deg, hsl(calc(var(--h) + 10) 95% 60% / 0.90), hsl(calc(var(--h) + 10) 95% 54% / 0.90)); border-color: hsl(calc(var(--h) + 10) 95% 52% / 0.6); color: #0b1020; text-shadow: 0 1px 0 rgba(255,255,255,0.3); }
  #\${cid} .btn .label { font-weight: 700; font-size: 13px; letter-spacing: 0.4px; }
  #\${cid} .btn.icon { width: 40px; padding: 8px; justify-content: center; }
  #\${cid} .btn.icon svg { width: 20px; height: 20px; }
  #\${cid} .btn.spin { animation: spin-slow 0.6s linear 1; }
  #\${cid} .hue { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.16); }
  #\${cid} .hue label { font-size: 12px; opacity: 0.8; }
  #\${cid} input[type=range] { appearance: none; width: 160px; height: 6px; background: linear-gradient(90deg, hsl(0 90% 55%), hsl(120 90% 55%), hsl(240 90% 60%), hsl(300 90% 55%), hsl(360 90% 55%)); border-radius: 999px; outline: none; }
  #\${cid} input[type=range]::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; background: #fff; border-radius: 50%; border: 2px solid hsl(calc(var(--h) + 10) 90% 55%); box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: pointer; }
  #\${cid} .grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  #\${cid} .card { position: relative; border-radius: 18px; padding: 16px; overflow: hidden; background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06)); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 10px 28px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  #\${cid} .card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0,0,0,0.42); }
  #\${cid} .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  #\${cid} .city { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: 0.3px; }
  #\${cid} .select { position: relative; }
  #\${cid} .select select { appearance: none; padding: 8px 30px 8px 12px; color: white; background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; outline: none; cursor: pointer; backdrop-filter: blur(6px); }
  #\${cid} .select:after { content: '▾'; position: absolute; right: 10px; top: 6px; font-size: 14px; opacity: 0.7; pointer-events: none; }
  #\${cid} .card-body { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6px; }
  #\${cid} .time { font-size: 42px; font-weight: 800; letter-spacing: 1px; font-variant-numeric: tabular-nums; text-shadow: 0 4px 24px rgba(0,0,0,0.35); }
  #\${cid} .time.tick { animation: pop 0.45s cubic-bezier(.2,.7,.2,1); }
  @keyframes pop { 0% { transform: translateY(2px) scale(0.98); opacity: 0.9; } 40% { transform: translateY(-2px) scale(1.02); opacity: 1; } 100% { transform: translateY(0) scale(1); } }
  #\${cid} .date { grid-column: 1 / span 1; font-size: 13px; opacity: 0.85; letter-spacing: 0.2px; }
  #\${cid} .ring { grid-column: 2; width: 70px; height: 70px; border-radius: 50%; background: conic-gradient(hsl(calc(var(--h) + 10) 90% 60%) var(--deg, 0deg), rgba(255,255,255,0.12) var(--deg, 0deg)); position: relative; box-shadow: 0 8px 20px hsl(calc(var(--h) + 10) 90% 60% / 0.25), inset 0 0 0 1px rgba(255,255,255,0.06); }
  #\${cid} .ring::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: rgba(0,0,0,0.35); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08); }
  @media (max-width: 520px) { #\${cid} .time { font-size: 34px; } #\${cid} .ring { width: 58px; height: 58px; } }
</style>
<div id="\${cid}" style="--h: \${hue}">
  <div class="wrap">
    <div class="toolbar">
      <div class="title">
        <span class="icon" style="display:inline-flex;color:hsl(calc(var(--h) + 10) 90% 60%);filter: drop-shadow(0 0 8px hsl(calc(var(--h) + 10) 90% 60% / 0.4));">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </span>
        <span style="font-size: 18px;">Weltuhr</span>
        <span class="badge">3 Zonen</span>
        <span class="live-dot on"></span>
      </div>
      <div class="controls">
        <button class="btn" id="\${cid}-fmt" title="12/24 Stunden umschalten"><span class="label">\${hour12 ? '12h' : '24h'}</span></button>
        <button class="btn \${showSeconds ? 'active' : ''}" id="\${cid}-sec" title="Sekunden ein-/ausblenden"><span class="label">Sekunden</span></button>
        <button class="btn icon active" id="\${cid}-pp" title="Start/Pause">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
        </button>
        <button class="btn icon" id="\${cid}-refresh" title="Jetzt aktualisieren">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
        </button>
        <div class="hue">
          <label for="\${cid}-hue">Farbe</label>
          <input type="range" id="\${cid}-hue" min="0" max="360" value="\${hue}" />
        </div>
      </div>
    </div>
    <div class="grid">
      <div class="card" id="\${cid}-card-0">
        <div class="card-head">
          <div class="city" id="\${cid}-city-0">—</div>
          <div class="select"><select id="\${cid}-sel-0" aria-label="Zeitzone wählen"></select></div>
        </div>
        <div class="card-body">
          <div class="time" id="\${cid}-time-0">--:--:--</div>
          <div class="ring" id="\${cid}-ring-0"></div>
          <div class="date" id="\${cid}-date-0">—</div>
        </div>
      </div>
      <div class="card" id="\${cid}-card-1">
        <div class="card-head">
          <div class="city" id="\${cid}-city-1">—</div>
          <div class="select"><select id="\${cid}-sel-1" aria-label="Zeitzone wählen"></select></div>
        </div>
        <div class="card-body">
          <div class="time" id="\${cid}-time-1">--:--:--</div>
          <div class="ring" id="\${cid}-ring-1"></div>
          <div class="date" id="\${cid}-date-1">—</div>
        </div>
      </div>
      <div class="card" id="\${cid}-card-2">
        <div class="card-head">
          <div class="city" id="\${cid}-city-2">—</div>
          <div class="select"><select id="\${cid}-sel-2" aria-label="Zeitzone wählen"></select></div>
        </div>
        <div class="card-body">
          <div class="time" id="\${cid}-time-2">--:--:--</div>
          <div class="ring" id="\${cid}-ring-2"></div>
          <div class="date" id="\${cid}-date-2">—</div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
  var root = document.getElementById('\${cid}');
  var PRESETS = [
    {label:'Berlin', tz:'Europe/Berlin', flag:'🇩🇪'},
    {label:'New York', tz:'America/New_York', flag:'🇺🇸'},
    {label:'Tokyo', tz:'Asia/Tokyo', flag:'🇯🇵'},
    {label:'London', tz:'Europe/London', flag:'🇬🇧'},
    {label:'Sydney', tz:'Australia/Sydney', flag:'🇦🇺'},
    {label:'Dubai', tz:'Asia/Dubai', flag:'🇦🇪'},
    {label:'Los Angeles', tz:'America/Los_Angeles', flag:'🇺🇸'},
    {label:'São Paulo', tz:'America/Sao_Paulo', flag:'🇧🇷'},
    {label:'Mumbai', tz:'Asia/Kolkata', flag:'🇮🇳'},
    {label:'Singapur', tz:'Asia/Singapore', flag:'🇸🇬'}
  ];
  var state = { hour12: \${hour12 ? 'true' : 'false'}, showSeconds: \${showSeconds ? 'true' : 'false'}, playing: true, hue: \${hue}, zones: \${defaults} };
  function findPreset(tz){ for (var i=0;i<PRESETS.length;i++){ if(PRESETS[i].tz===tz) return PRESETS[i]; } return null; }
  function cityLabel(tz){ var p = findPreset(tz); return p ? (p.flag + ' ' + p.label) : tz; }
  function fillOptions(sel){ sel.innerHTML=''; for (var i=0;i<PRESETS.length;i++){ var o=document.createElement('option'); o.value=PRESETS[i].tz; o.textContent=PRESETS[i].flag+' '+PRESETS[i].label; sel.appendChild(o); } }
  var fmtBtn = document.getElementById('\${cid}-fmt');
  var secBtn = document.getElementById('\${cid}-sec');
  var ppBtn = document.getElementById('\${cid}-pp');
  var refBtn = document.getElementById('\${cid}-refresh');
  var hueInput = document.getElementById('\${cid}-hue');
  var liveDot = root.querySelector('.live-dot');
  function syncFmt(){ fmtBtn.querySelector('.label').textContent = state.hour12 ? '12h' : '24h'; fmtBtn.classList.toggle('active', state.hour12); }
  function syncSec(){ secBtn.classList.toggle('active', state.showSeconds); }
  function syncPlay(){ ppBtn.innerHTML = state.playing ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; ppBtn.classList.toggle('active', state.playing); if(liveDot){ liveDot.classList.toggle('on', state.playing); } }
  function applyHue(){ root.style.setProperty('--h', state.hue); }
  fmtBtn.addEventListener('click', function(){ state.hour12 = !state.hour12; syncFmt(); tickAll(true); });
  secBtn.addEventListener('click', function(){ state.showSeconds = !state.showSeconds; syncSec(); tickAll(true); });
  ppBtn.addEventListener('click', function(){ state.playing = !state.playing; syncPlay(); if(state.playing){ start(); } else { stop(); } });
  refBtn.addEventListener('click', function(){ tickAll(true); refBtn.classList.add('spin'); setTimeout(function(){ refBtn.classList.remove('spin'); }, 650); });
  hueInput.addEventListener('input', function(e){ state.hue = +e.target.value; applyHue(); });
  var selects = [];
  for (var i=0;i<3;i++){
    var sel = document.getElementById('\${cid}-sel-' + i);
    fillOptions(sel);
    sel.value = state.zones[i];
    sel.addEventListener('change', (function(index){ return function(e){ state.zones[index] = e.target.value; updateCity(index); tick(index, true); }; })(i));
    selects.push(sel);
    updateCity(i);
  }
  function updateCity(i){ var cityEl = document.getElementById('\${cid}-city-' + i); cityEl.textContent = cityLabel(state.zones[i]); }
  function formatTime(d, tz, withSeconds){ var locale = state.hour12 ? 'en-US' : 'de-DE'; var opts = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: state.hour12 }; if(withSeconds){ opts.second = '2-digit'; } return d.toLocaleTimeString(locale, opts); }
  function formatDate(d, tz){ return d.toLocaleDateString('de-DE', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'long' }); }
  function secondsInTZ(d, tz){ try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, second: 'numeric' }).format(d), 10) || 0; } catch(e){ return d.getUTCSeconds(); } }
  function pulse(el){ if(!el) return; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  function tick(index, animate){ var d = new Date(); var start = 0, end = 2; if(typeof index === 'number'){ start = index; end = index; }
    for(var i=start;i<=end;i++){
      var tz = state.zones[i];
      var t = formatTime(d, tz, state.showSeconds);
      var dt = formatDate(d, tz);
      var sec = secondsInTZ(d, tz);
      var timeEl = document.getElementById('\${cid}-time-' + i);
      var dateEl = document.getElementById('\${cid}-date-' + i);
      var ringEl = document.getElementById('\${cid}-ring-' + i);
      if(timeEl) { timeEl.textContent = t; if(animate){ pulse(timeEl); } }
      if(dateEl) { dateEl.textContent = dt; }
      if(ringEl) { ringEl.style.setProperty('--deg', (sec * 6) + 'deg'); }
    }
  }
  function tickAll(animate){ tick(undefined, animate); }
  var interval = null;
  function start(){ stop(); interval = setInterval(function(){ tickAll(false); }, 1000); }
  function stop(){ if(interval){ clearInterval(interval); interval = null; } }
  syncFmt(); syncSec(); syncPlay(); applyHue(); tickAll(false); start();
})();
<\/script>
\`;
  return { type: 'html', content: html };
}`
  },
  {
    name: 'Interaktives Kanban Board',
    description: 'Ein Kanban Board zum Verwalten von Aufgaben mit Drag & Drop',
    parameters_schema: {
      project: 'Mein Projekt',
      columns: 'Backlog,In Arbeit,Review,Erledigt',
      theme: 'dark',
      accent: '#7c3aed',
      sampleData: true
    },
    refresh_interval: 0,
    generated_code: `function render(params) {
  const project = params.project || 'Mein Projekt';
  const columnsStr = params.columns || 'Backlog,In Arbeit,Review,Erledigt';
  const columns = columnsStr.split(',').map(s => s.trim()).filter(Boolean);
  const theme = params.theme === 'light' ? 'light' : 'dark';
  const accent = params.accent || '#7c3aed';
  const sampleData = params.sampleData !== false;
  const wid = 'kb_' + Math.floor(Math.random() * 1e9).toString(36);

  const html = \`
<style>
  #\${wid} { --accent: \${accent}; --radius: 16px; --gap: 14px; --card-radius: 14px; --shadow: 0 10px 30px rgba(0,0,0,0.25); }
  #\${wid}[data-theme="dark"] { --bg: #0f1224; --panel: rgba(255,255,255,0.06); --panel-2: rgba(255,255,255,0.08); --card: rgba(255,255,255,0.08); --text: #f5f7ff; --muted: #a1a5c2; --border: rgba(255,255,255,0.12); }
  #\${wid}[data-theme="light"] { --bg: #f6f7fb; --panel: rgba(255,255,255,0.9); --panel-2: rgba(255,255,255,1); --card: #ffffff; --text: #171a2b; --muted: #58607a; --border: rgba(10,10,30,0.1); }
  #\${wid} { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; color: var(--text); background: radial-gradient(1200px 600px at 10% 0%, rgba(124,58,237,0.18), transparent 60%), radial-gradient(1000px 600px at 100% 50%, rgba(34,197,94,0.12), transparent 60%), var(--bg); border-radius: 22px; padding: 22px; position: relative; overflow: hidden; }
  #\${wid} .shine { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(800px 300px at var(--mx,50%) var(--my,0%), rgba(255,255,255,0.08), transparent 60%); transition: 0.15s ease; }
  #\${wid} .header { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 18px; background: linear-gradient(135deg, color-mix(in oklab, var(--accent), #000 10%), color-mix(in oklab, var(--accent), #000 30%)); border-radius: var(--radius); box-shadow: var(--shadow); position: relative; overflow: hidden; }
  #\${wid} .header:before { content: ''; position: absolute; inset: 0; background: radial-gradient(600px 180px at -10% -20%, rgba(255,255,255,0.18), transparent 55%); }
  #\${wid} .title { display: flex; align-items: center; gap: 12px; }
  #\${wid} .title h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; font-weight: 700; }
  #\${wid} .title [contenteditable] { outline: none; padding: 2px 8px; border-radius: 8px; transition: background 0.2s; }
  #\${wid} .title [contenteditable]:focus { background: rgba(255,255,255,0.18); }
  #\${wid} .controls { display: flex; align-items: center; gap: 10px; }
  #\${wid} .btn { display: inline-flex; align-items: center; gap: 8px; border: none; padding: 10px 14px; border-radius: 12px; font-weight: 700; cursor: pointer; backdrop-filter: blur(6px); color: #fff; transition: transform .15s ease, box-shadow .2s ease, background .2s; box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
  #\${wid} .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); }
  #\${wid} .btn-primary { background: linear-gradient(135deg, color-mix(in oklab, var(--accent), #fff 10%), var(--accent)); }
  #\${wid} .btn-ghost { background: rgba(255,255,255,0.18); }
  #\${wid} .search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; color: white; }
  #\${wid}[data-theme="light"] .search { background: #fff; border: 1px solid var(--border); color: var(--text); }
  #\${wid} .search input { background: transparent; border: none; outline: none; color: inherit; width: 220px; }
  #\${wid} .board { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--gap); margin-top: 16px; }
  #\${wid} .column { display: flex; flex-direction: column; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; min-height: 220px; backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
  #\${wid} .col-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 10px; color: var(--text); background: linear-gradient(180deg, var(--panel-2), transparent); }
  #\${wid} .col-title { font-weight: 800; letter-spacing: .2px; font-size: 14px; }
  #\${wid} .col-count { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.16); color: #fff; }
  #\${wid}[data-theme="light"] .col-count { background: rgba(10,10,30,0.06); color: var(--text); }
  #\${wid} .dropzone { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 140px; padding: 4px; border-radius: 12px; transition: background .15s, outline-color .15s; }
  #\${wid} .dropzone.active { background: color-mix(in oklab, var(--accent), transparent 85%); outline: 2px dashed color-mix(in oklab, var(--accent), #000 10%); }
  #\${wid} .card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: var(--card-radius); padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); transition: transform .18s ease, box-shadow .2s ease, border-color .2s; cursor: grab; }
  #\${wid} .card:active { cursor: grabbing; }
  #\${wid} .card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.22); border-color: color-mix(in oklab, var(--accent), var(--border) 65%); }
  #\${wid} .card-title { font-weight: 800; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  #\${wid} .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px; letter-spacing: .2px; }
  #\${wid} .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  #\${wid} .prio-low { background: rgba(16,185,129,0.18); color: #34d399; }
  #\${wid} .prio-medium { background: rgba(234,179,8,0.2); color: #f59e0b; }
  #\${wid} .prio-high { background: rgba(239,68,68,0.2); color: #ef4444; }
  #\${wid} .label-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45); }
  #\${wid} .desc { color: var(--muted); font-size: 12px; line-height: 1.4; margin-bottom: 8px; }
  #\${wid} .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  #\${wid} .meta .due { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: color-mix(in oklab, var(--text), var(--muted)); }
  #\${wid} .card-actions { display: flex; align-items: center; gap: 8px; }
  #\${wid} .icon-btn { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border); background: linear-gradient(180deg, var(--panel-2), transparent); color: var(--text); cursor: pointer; transition: transform .15s, background .2s, box-shadow .2s; }
  #\${wid} .icon-btn:hover { transform: translateY(-2px); background: color-mix(in oklab, var(--accent), transparent 85%); box-shadow: 0 8px 18px rgba(0,0,0,0.18); }
  #\${wid} .footer { margin-top: 14px; display: flex; align-items: center; gap: 10px; justify-content: space-between; color: var(--muted); font-size: 12px; }
  #\${wid} .modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 9999; }
  #\${wid} .modal.open { display: flex; animation: fadeIn .15s ease; }
  #\${wid} .modal-card { width: min(560px, 92vw); background: var(--panel-2); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
  #\${wid} .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent), #000 18%)); color: white; }
  #\${wid} .modal-body { padding: 16px; display: grid; gap: 12px; }
  #\${wid} .field { display: grid; gap: 6px; }
  #\${wid} .field label { font-size: 12px; color: var(--muted); }
  #\${wid} input[type="text"], #\${wid} textarea, #\${wid} select, #\${wid} input[type="date"], #\${wid} input[type="color"] { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; outline: none; transition: border .15s; }
  #\${wid} textarea { min-height: 80px; resize: vertical; }
  #\${wid} input:focus, #\${wid} textarea:focus, #\${wid} select:focus { border-color: color-mix(in oklab, var(--accent), var(--border) 40%); }
  #\${wid} .modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; background: var(--panel); }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>
<div id="\${wid}" class="kanban" data-theme="\${theme}" data-project="\${project}">
  <div class="shine"></div>
  <div class="header">
    <div class="title">
      <div style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; background: rgba(255,255,255,0.2); color:white; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
      </div>
      <h1 id="\${wid}-project" contenteditable="true" title="Projektname bearbeiten">\${project}</h1>
    </div>
    <div class="controls">
      <div class="search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input id="\${wid}-search" type="text" placeholder="Suchen..." />
      </div>
      <button class="btn btn-ghost" id="\${wid}-theme">Theme</button>
      <button class="btn btn-primary" id="\${wid}-add">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        Aufgabe
      </button>
    </div>
  </div>
  <div class="board" id="\${wid}-board">
    \${columns.map(col => \`
      <div class="column" data-col="\${col}">
        <div class="col-head">
          <div class="col-title">\${col}</div>
          <div class="col-count" data-count="\${col}">0</div>
        </div>
        <div class="dropzone" data-drop="\${col}"></div>
      </div>\`).join('')}
  </div>
  <div class="footer">
    <div>Drag & Drop zwischen Spalten. Klick auf Karte zum Bearbeiten.</div>
    <div style="display:flex; gap:8px; align-items:center;">
      <button class="icon-btn" id="\${wid}-reset" title="Demo-Daten neu laden">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
      </button>
    </div>
  </div>
  <div class="modal" id="\${wid}-modal" aria-hidden="true">
    <div class="modal-card">
      <div class="modal-head">
        <div style="font-weight:800;">Aufgabe</div>
        <button class="icon-btn" id="\${wid}-close" title="Schließen" style="background: rgba(255,255,255,0.18); color: white; border-color: rgba(255,255,255,0.38);">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Titel</label>
          <input type="text" id="\${wid}-title" placeholder="Kurzer, prägnanter Titel" />
        </div>
        <div class="field">
          <label>Beschreibung</label>
          <textarea id="\${wid}-desc" placeholder="Details, Akzeptanzkriterien, Links..."></textarea>
        </div>
        <div class="field">
          <label>Status</label>
          <select id="\${wid}-status">
            \${columns.map(c => \`<option value="\${c}">\${c}</option>\`).join('')}
          </select>
        </div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div class="field">
            <label>Priorität</label>
            <select id="\${wid}-prio">
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
            </select>
          </div>
          <div class="field">
            <label>Fällig am</label>
            <input type="date" id="\${wid}-due" />
          </div>
          <div class="field">
            <label>Label-Farbe</label>
            <input type="color" id="\${wid}-color" value="#7c3aed" />
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="\${wid}-cancel">Abbrechen</button>
        <button class="btn btn-primary" id="\${wid}-save">Speichern</button>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
  const WID = '\${wid}';
  const root = document.getElementById(WID);
  const projectNameEl = document.getElementById(WID + '-project');
  const searchEl = document.getElementById(WID + '-search');
  const themeBtn = document.getElementById(WID + '-theme');
  const addBtn = document.getElementById(WID + '-add');
  const resetBtn = document.getElementById(WID + '-reset');
  const modal = document.getElementById(WID + '-modal');
  const closeBtn = document.getElementById(WID + '-close');
  const cancelBtn = document.getElementById(WID + '-cancel');
  const saveBtn = document.getElementById(WID + '-save');
  const titleEl = document.getElementById(WID + '-title');
  const descEl = document.getElementById(WID + '-desc');
  const statusEl = document.getElementById(WID + '-status');
  const prioEl = document.getElementById(WID + '-prio');
  const dueEl = document.getElementById(WID + '-due');
  const colorEl = document.getElementById(WID + '-color');
  const columns = \${JSON.stringify(columns)};
  const sample = \${JSON.stringify(sampleData)};
  function storageKey(){ return 'kanban:' + (projectNameEl.textContent || '\${project}'); }
  let state = { tasks: [] };
  let editingId = null;
  let filter = '';
  root.addEventListener('pointermove', function(e){ const r = root.getBoundingClientRect(); root.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100) + '%'); root.style.setProperty('--my', ((e.clientY - r.top)/r.height*100) + '%'); });
  function loadState() { try { const raw = localStorage.getItem(storageKey()); if (raw) state = JSON.parse(raw); else if (sample) { seed(); saveState(); } else { state = { tasks: [] }; } } catch(e){ state = { tasks: [] }; } }
  function saveState() { try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch(e){} }
  function seed(){ const now = Date.now(); state = { tasks: [
    { id: 't-'+(now-1), title: 'Projekt-Setup', desc: 'Repo, Branching-Strategie, Linter & CI', status: columns[0] || 'Backlog', prio: 'medium', due: '', color: '#22c55e', createdAt: now-10000, order: 0 },
    { id: 't-'+(now-2), title: 'User Stories sammeln', desc: 'Workshops mit Stakeholdern', status: columns[0] || 'Backlog', prio: 'high', due: '', color: '#f59e0b', createdAt: now-9000, order: 1 },
    { id: 't-'+(now-3), title: 'Login-Flow', desc: 'OAuth2, Fehlerfälle, UX Copy', status: columns[1] || 'In Arbeit', prio: 'high', due: '', color: '#ef4444', createdAt: now-8000, order: 0 },
    { id: 't-'+(now-4), title: 'Design Tokens', desc: 'Farben, Typo, Abstände', status: columns[2] || 'Review', prio: 'low', due: '', color: '#6366f1', createdAt: now-7000, order: 0 },
    { id: 't-'+(now-5), title: 'Projektplan', desc: 'Milestones & Roadmap', status: columns[3] || 'Erledigt', prio: 'medium', due: '', color: '#10b981', createdAt: now-6000, order: 0 }
  ]}; }
  function fmtDate(d){ if(!d) return ''; try { const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString(); } catch(e){ return d; } }
  function openModal(task){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); editingId = task ? task.id : null; if(task){ titleEl.value = task.title || ''; descEl.value = task.desc || ''; statusEl.value = task.status || columns[0]; prioEl.value = task.prio || 'medium'; dueEl.value = task.due || ''; colorEl.value = task.color || '#7c3aed'; } else { titleEl.value = ''; descEl.value = ''; statusEl.value = columns[0]; prioEl.value = 'medium'; dueEl.value=''; colorEl.value='\${accent}'; } setTimeout(()=>{ titleEl.focus(); }, 0); }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); editingId = null; }
  function createCard(task){ const el = document.createElement('div'); el.className = 'card'; el.setAttribute('draggable','true'); el.dataset.id = task.id;
    const titleRow = document.createElement('div'); titleRow.className = 'card-title';
    const dot = document.createElement('span'); dot.className = 'label-dot'; dot.style.background = task.color || 'var(--accent)';
    const title = document.createElement('span'); title.textContent = task.title || 'Unbenannt';
    titleRow.appendChild(dot); titleRow.appendChild(title);
    const badges = document.createElement('div'); badges.className = 'badges';
    const pr = document.createElement('span'); pr.className = 'badge prio-' + (task.prio || 'medium'); pr.textContent = 'Prio ' + ({low:'Niedrig', medium:'Mittel', high:'Hoch'}[task.prio||'medium']);
    badges.appendChild(pr);
    const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = task.desc || '';
    const meta = document.createElement('div'); meta.className = 'meta';
    const left = document.createElement('div'); left.className = 'due';
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const btnEdit = document.createElement('button'); btnEdit.className = 'icon-btn'; btnEdit.title = 'Bearbeiten'; btnEdit.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
    btnEdit.addEventListener('click', function(ev){ ev.stopPropagation(); openModal(task); });
    const btnDone = document.createElement('button'); btnDone.className = 'icon-btn'; btnDone.title = 'Als erledigt markieren'; btnDone.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    btnDone.addEventListener('click', function(ev){ ev.stopPropagation(); moveTo(task.id, columns[columns.length-1]); });
    const btnDelete = document.createElement('button'); btnDelete.className = 'icon-btn'; btnDelete.title = 'Löschen'; btnDelete.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
    btnDelete.addEventListener('click', function(ev){ ev.stopPropagation(); if(confirm('Aufgabe löschen?')) { state.tasks = state.tasks.filter(t => t.id !== task.id); saveState(); render(); } });
    actions.appendChild(btnEdit); actions.appendChild(btnDone); actions.appendChild(btnDelete);
    meta.appendChild(left); meta.appendChild(actions);
    el.appendChild(titleRow); el.appendChild(badges); if (task.desc) el.appendChild(desc); el.appendChild(meta);
    el.addEventListener('click', function(){ openModal(task); });
    el.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', task.id); setTimeout(()=>{ el.style.opacity = '0.6'; el.style.transform = 'scale(0.98)'; },0); });
    el.addEventListener('dragend', function(){ el.style.opacity = ''; el.style.transform = ''; document.querySelectorAll('#'+WID+' .dropzone').forEach(z=>z.classList.remove('active')); });
    return el;
  }
  function render(){ const byCol = {}; columns.forEach(c => { byCol[c] = []; }); const q = (filter||'').trim().toLowerCase(); state.tasks.forEach(t => { if (!byCol[t.status]) byCol[t.status] = []; if (!q || (t.title||'').toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q)) byCol[t.status].push(t); });
    columns.forEach(col => { const dz = root.querySelector('.dropzone[data-drop="'+col+'"]'); dz.innerHTML = ''; const list = (byCol[col]||[]).slice().sort((a,b)=> (a.order||0)-(b.order||0) || (a.createdAt||0)-(b.createdAt||0)); list.forEach((t, idx) => { if (t.order == null) t.order = idx; dz.appendChild(createCard(t)); }); const cnt = root.querySelector('[data-count="'+col+'"]'); if (cnt) cnt.textContent = String(list.length);
      dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('active'); });
      dz.addEventListener('dragleave', function(){ dz.classList.remove('active'); });
      dz.addEventListener('drop', function(e){ e.preventDefault(); dz.classList.remove('active'); const id = e.dataTransfer.getData('text/plain'); moveTo(id, col, true); });
    });
  }
  function moveTo(id, col, append){ const t = state.tasks.find(x=>x.id===id); if(!t) return; t.status = col; if (append) { const maxOrder = Math.max(-1, ...state.tasks.filter(x=>x.status===col).map(x=>x.order||0)); t.order = maxOrder + 1; } saveState(); render(); }
  function submitForm(){ const title = titleEl.value.trim(); if (!title) { alert('Bitte einen Titel eingeben.'); titleEl.focus(); return; } const payload = { title: title, desc: descEl.value.trim(), status: statusEl.value, prio: prioEl.value, due: dueEl.value, color: colorEl.value };
    if (editingId) { const t = state.tasks.find(x=>x.id===editingId); if (t){ Object.assign(t, payload); } }
    else { const id = 't-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); const order = Math.max(-1, ...state.tasks.filter(x=>x.status===payload.status).map(x=>x.order||0)) + 1; state.tasks.push(Object.assign({ id: id, createdAt: Date.now(), order: order }, payload)); }
    saveState(); closeModal(); render();
  }
  addBtn.addEventListener('click', function(){ openModal(null); });
  closeBtn.addEventListener('click', function(){ closeModal(); });
  cancelBtn.addEventListener('click', function(){ closeModal(); });
  saveBtn.addEventListener('click', submitForm);
  modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
  themeBtn.addEventListener('click', function(){ root.setAttribute('data-theme', root.getAttribute('data-theme')==='dark'?'light':'dark'); });
  resetBtn.addEventListener('click', function(){ if (confirm('Demo-Daten neu laden?')) { seed(); saveState(); render(); } });
  searchEl.addEventListener('input', function(){ filter = searchEl.value; render(); });
  loadState(); render();
})();
<\/script>
\`;
  return { type: 'html', content: html };
}`
  }
];

module.exports = { SAMPLE_TOOLS };
