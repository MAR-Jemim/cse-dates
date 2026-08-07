/* ============================================================
   Shared logic for both pages. You don't need to edit this.
   Edit config.js instead.
   ============================================================ */

/* ---------- CSV parsing (handles quoted commas and line breaks) ---------- */
function parseCSV(text){
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows=[]; let row=[], cur="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; }
      else cur+=c;
    }else{
      if(c==='"') q=true;
      else if(c===','){ row.push(cur); cur=""; }
      else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=""; }
      else cur+=c;
    }
  }
  if(cur!=="" || row.length){ row.push(cur); rows.push(row); }
  if(!rows.length) return [];
  const head = rows[0].map(h=>h.trim().toLowerCase());
  return rows.slice(1)
    .filter(r=>r.some(c=>c.trim()!==""))
    .map(r=>{
      const o={}; head.forEach((h,i)=>{ o[h]=(r[i]||"").trim(); });
      return { Batch:o.batch||"", Type:o.type||"", Topic:o.topic||"",
               Date:o.date||"",  Note:o.note||"" };
    });
}

/* ---------- dates ---------- */
function parseDate(s){
  s=(s||"").trim(); if(!s) return null;
  let m;
  if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)) return new Date(+m[1],+m[2]-1,+m[3]);
  if(m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)) return new Date(+m[3],+m[2]-1,+m[1]);
  const t=Date.parse(s); return isNaN(t)?null:new Date(t);
}
function daysUntil(dt){
  const a=new Date(); a.setHours(0,0,0,0);
  const b=new Date(dt); b.setHours(0,0,0,0);
  return Math.round((b-a)/86400000);
}
function urgency(d){ return d<0?"overdue" : d<=2?"urgent" : d<=7?"soon" : "later"; }
function countdownText(d){
  if(d<0)  return d===-1 ? "Yesterday" : `${-d} days ago`;
  if(d===0) return "Today";
  if(d===1) return "Tomorrow";
  return `${d} days left`;
}
function fmtDate(dt){
  return dt.toLocaleDateString(undefined,
    {weekday:"short", day:"numeric", month:"short", year:"numeric"});
}

/* ---------- categories ---------- */
function typeClass(t){
  t=(t||"").toLowerCase();
  if(t.includes("assign")) return "assignment";
  if(t.includes("present")||t.includes("demo")) return "presentation";
  if(t.includes("ct")||t.includes("class test")||t.includes("quiz")) return "ct";
  if(t.includes("exam")||t.includes("final")||t.includes("mid")) return "exam";
  if(t.includes("notice")||t.includes("registration")||t.includes("form")
     ||t.includes("holiday")||t.includes("fee")) return "notice";
  if(t.includes("seminar")||t.includes("workshop")||t.includes("event")
     ||t.includes("fest")||t.includes("tour")) return "event";
  return "other";
}
const TYPE_FILTERS = [
  ["all","All"], ["ct","CT"], ["assignment","Assignment"],
  ["presentation","Presentation"], ["exam","Exam"],
  ["notice","Notice"], ["event","Event"]
];

function esc(s){
  return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

/* ---------- demo data (used until you paste a sheet link) ---------- */
function demoData(pageKey){
  const d = n => { const t=new Date(); t.setDate(t.getDate()+n); return t.toISOString().slice(0,10); };
  if(pageKey==="department"){
    return [
      {Batch:"2021", Type:"Exam",         Topic:"Final Exam · 8th Semester",  Date:d(-5), Note:"Result published"},
      {Batch:"",     Type:"Notice",       Topic:"Semester registration opens", Date:d(2),  Note:"Portal closes in 2 weeks"},
      {Batch:"2023", Type:"CT",           Topic:"CT-3 · Operating Systems",    Date:d(5),  Note:"Room 401"},
      {Batch:"",     Type:"Seminar",      Topic:"Industry Talk · AI in Bangladesh", Date:d(8), Note:"Auditorium, 3:00 PM"},
      {Batch:"2022", Type:"Presentation", Topic:"Thesis Defence · Group B",    Date:d(12), Note:"Board room"},
      {Batch:"2024", Type:"Assignment",   Topic:"Lab Report · Digital Logic",  Date:d(18), Note:"Submit to Sir Rahman"},
    ];
  }
  return [
    {Batch:"", Type:"CT",           Topic:"CT-2 · Data Structures", Date:d(-3), Note:"Ch 4–5, Trees & Heaps"},
    {Batch:"", Type:"Assignment",   Topic:"Assignment 3 · OOP",     Date:d(1),  Note:"Submit on Google Classroom"},
    {Batch:"", Type:"CT",           Topic:"CT-3 · Algorithms",      Date:d(4),  Note:"Room 302, 9:00 AM"},
    {Batch:"", Type:"Presentation", Topic:"Term Project Demo",      Date:d(9),  Note:"Group 5, 12 min each"},
    {Batch:"", Type:"CT",           Topic:"CT-4 · Computer Networks", Date:d(23), Note:"Ch 3, OSI & TCP/IP"},
  ];
}

/* ============================================================
   Page setup
   ============================================================ */
function initPage(pageKey){
  const cfg = (typeof CONFIG!=="undefined" && CONFIG[pageKey]) || {};
  let items=[], typeFilter="all", batchFilter="all", showPast=false, hasBatch=false;

  const $ = id => document.getElementById(id);

  document.title = cfg.title || document.title;
  if(cfg.title)    $("title").textContent    = cfg.title;
  if(cfg.subtitle) $("subtitle").textContent = cfg.subtitle;

  /* ---- sorting: upcoming first (soonest first), past last (newest first) ---- */
  function normalize(raw){
    return raw.map(r=>{
      const dt=parseDate(r.Date);
      return dt ? Object.assign({}, r, {dt, days:daysUntil(dt)}) : null;
    }).filter(Boolean).sort((a,b)=>{
      const ap=a.days<0, bp=b.days<0;
      if(ap!==bp) return ap?1:-1;
      return ap ? b.dt-a.dt : a.dt-b.dt;
    });
  }

  function visible(){
    return items.filter(i=>
      (typeFilter==="all"  || typeClass(i.Type)===typeFilter) &&
      (batchFilter==="all" || i.Batch===batchFilter)
    );
  }

  function chipRow(label, current, defs, attr){
    return `<div class="filter-group">
      <span class="lbl">${label}</span>
      ${defs.map(([k,l,n])=>
        `<button class="chip" data-${attr}="${esc(k)}" aria-pressed="${current===k}">${esc(l)}` +
        (n==null?"":`<span class="c">${n}</span>`) + `</button>`).join("")}
    </div>`;
  }

  function renderFilters(){
    let html="";

    // type chips — counts respect the active batch filter
    const scope = items.filter(i=>batchFilter==="all" || i.Batch===batchFilter);
    const counts={all:scope.length};
    scope.forEach(i=>{ const k=typeClass(i.Type); counts[k]=(counts[k]||0)+1; });
    const typeDefs = TYPE_FILTERS
      .filter(([k])=> k==="all" || counts[k])          // hide categories you don't use
      .map(([k,l])=>[k,l,counts[k]||0]);
    html += chipRow("Type", typeFilter, typeDefs, "type");

    // batch chips — only when the sheet actually has a Batch column
    if(hasBatch){
      const inType = items.filter(i=>typeFilter==="all" || typeClass(i.Type)===typeFilter);
      const bc={};
      inType.forEach(i=>{ if(i.Batch) bc[i.Batch]=(bc[i.Batch]||0)+1; });
      const general = inType.filter(i=>!i.Batch).length;
      const defs=[["all","All batches",inType.length]]
        .concat(Object.keys(bc).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
          .map(b=>[b,b,bc[b]]));
      if(general) defs.push(["","Everyone",general]);
      html += chipRow("Batch", batchFilter, defs, "batch");
    }
    $("filters").innerHTML = html;
  }

  function renderHero(){
    const hero=$("hero");
    const next = visible().filter(i=>i.days>=0)[0];
    if(!next){
      hero.className="hero all-clear";
      hero.innerHTML=`<div>
          <div class="eyebrow">Status</div>
          <div class="next-topic">All clear 🎉</div>
          <div class="next-meta">Nothing upcoming here right now.</div>
        </div>
        <div class="countdown"><div class="num">✓</div><div class="lbl">Nothing due</div></div>`;
      return;
    }
    hero.className="hero";
    hero.innerHTML=`
      <div>
        <div class="eyebrow">Next up</div>
        <div class="next-topic">${esc(next.Topic)}</div>
        <div class="next-meta">
          ${next.Batch?`<span class="batch-tag">${esc(next.Batch)}</span>`:""}
          <span class="badge ${typeClass(next.Type)}">${esc(next.Type||"—")}</span>
          <span>${fmtDate(next.dt)}${next.Note?` · ${esc(next.Note.split("\n")[0])}`:""}</span>
        </div>
      </div>
      <div class="countdown">
        <div class="num">${next.days===0?"•":next.days}</div>
        <div class="lbl">${next.days===0?"Today":next.days===1?"Day left":"Days left"}</div>
      </div>`;
  }

  function rowHTML(i){
    return `<tr class="${i.days<0?"past":""}">
      ${hasBatch?`<td data-l="Batch">${i.Batch?`<span class="batch-tag">${esc(i.Batch)}</span>`
        :`<span class="batch-tag">Everyone</span>`}</td>`:""}
      <td data-l="Type"><span class="badge ${typeClass(i.Type)}">${esc(i.Type||"—")}</span></td>
      <td class="topic-cell"><span class="topic">${esc(i.Topic)}</span>${
        i.Note?`<span class="note">${esc(i.Note)}</span>`:""}</td>
      <td class="date-cell" data-l="Date">${fmtDate(i.dt)}</td>
      <td data-l="Countdown"><span class="pill ${urgency(i.days)}"><span class="dot"></span>${
        countdownText(i.days)}</span></td>
    </tr>`;
  }

  function renderRows(){
    const cols = hasBatch?5:4;
    $("headBatch").hidden = !hasBatch;

    const list=visible(), body=$("rows");
    if(!list.length){
      body.innerHTML=`<tr><td colspan="${cols}" class="empty">Nothing matches this filter.</td></tr>`;
      return;
    }
    const up=list.filter(i=>i.days>=0), past=list.filter(i=>i.days<0);

    let html = up.map(rowHTML).join("");
    if(!up.length && past.length){
      html += `<tr><td colspan="${cols}" class="empty">No upcoming items — everything below is past.</td></tr>`;
    }
    if(past.length){
      html += `<tr class="divider-row"><td colspan="${cols}">
        <button class="past-toggle" id="pastToggle" aria-expanded="${showPast}">
          <span class="caret">${showPast?"▾":"▸"}</span> Past &amp; done
          <span class="c">${past.length}</span>
        </button></td></tr>`;
      if(showPast) html += past.map(rowHTML).join("");
    }
    body.innerHTML=html;
  }

  function render(){ renderFilters(); renderHero(); renderRows(); }

  /* ---- reminder text for the class/department group chat ---- */
  function buildReminder(){
    const up=visible().filter(i=>i.days>=0).slice(0,10);
    const head = "📢 " + (cfg.title || "Upcoming dates");
    if(!up.length) return head + "\n\nNothing upcoming right now. ✅";
    const lines=up.map(i=>
      `• ${i.Batch?`(${i.Batch}) `:""}${i.Type?`[${i.Type}] `:""}${i.Topic} — ${fmtDate(i.dt)} (${countdownText(i.days)})`
      + (i.Note?` — ${i.Note.replace(/\n+/g,"; ")}`:"")
    );
    return head + "\n\n" + lines.join("\n") + "\n\nStay ready! 💪";
  }

  /* ---- events ---- */
  $("filters").addEventListener("click",e=>{
    const b=e.target.closest(".chip"); if(!b) return;
    if(b.dataset.type!=null)  typeFilter=b.dataset.type;
    if(b.dataset.batch!=null) batchFilter=b.dataset.batch;
    render();
  });
  $("rows").addEventListener("click",e=>{
    if(e.target.closest("#pastToggle")){ showPast=!showPast; renderRows(); }
  });
  const copyBtn = $("copyBtn");
  const copyLabel = copyBtn.textContent;   // keep the original label safe
  copyBtn.addEventListener("click", async ()=>{
    const txt = buildReminder();
    let ok = false;
    try{
      await navigator.clipboard.writeText(txt);
      ok = true;
    }catch(_){
      try{                                  // older browsers / no clipboard permission
        const ta=document.createElement("textarea");
        ta.value=txt; ta.setAttribute("readonly","");
        ta.style.position="fixed"; ta.style.top="-1000px";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      }catch(__){ ok = false; }
    }
    copyBtn.textContent = ok ? "✅ Copied!" : "⚠️ Couldn't copy";
    setTimeout(()=>{ copyBtn.textContent = copyLabel; }, 1800);
  });
  $("themeBtn").addEventListener("click",()=>{
    const root=document.documentElement;
    const cur=root.getAttribute("data-theme")
      || (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
    root.setAttribute("data-theme", cur==="dark"?"light":"dark");
  });
  $("refresh").addEventListener("click",e=>{ e.preventDefault(); load(); });

  /* ---- load ---- */
  async function load(){
    let raw=null, live=false;
    if(cfg.csv){
      try{
        const url = cfg.csv + (cfg.csv.includes("?")?"&":"?") + "t=" + Date.now();
        const res = await fetch(url);
        if(res.ok){
          const parsed = parseCSV(await res.text());
          if(parsed.length){ raw=parsed; live=true; }
        }
      }catch(_){ /* fall through to demo data */ }
    }
    if(!raw) raw = demoData(pageKey);

    $("banner").hidden = live;
    hasBatch = raw.some(r=>r.Batch);
    items = normalize(raw);
    $("updated").textContent = (live?"Live from Google Sheet · ":"Demo data · ")
      + "Loaded " + new Date().toLocaleString(undefined,
          {hour:"numeric", minute:"2-digit", day:"numeric", month:"short"});
    render();
  }

  load();
}
