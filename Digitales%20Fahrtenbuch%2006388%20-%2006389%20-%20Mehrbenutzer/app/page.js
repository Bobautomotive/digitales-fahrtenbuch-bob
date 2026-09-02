"use client";
import {useEffect,useMemo,useState} from "react";

const PLATES=["HA-06389","HA-06388"];
const TOTAL=21;
const fmtDate=v=>{if(!v)return"";const [y,m,d]=v.split("-");return `${d}.${m}.${y}`};
const normVin=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,17);

export default function Home(){
 const [plate,setPlate]=useState(PLATES[0]),[books,setBooks]=useState([]),[loading,setLoading]=useState(true);
 const [admin,setAdmin]=useState(false),[adminPassword,setAdminPassword]=useState("");
 const [showAdmin,setShowAdmin]=useState(false),[showArchive,setShowArchive]=useState(false),[archives,setArchives]=useState([]);
 const [editing,setEditing]=useState(null),[search,setSearch]=useState("");
 const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),timeFrom:"",timeTo:"",start:"Hagen",destination:"Hagen",purpose:"Probefahrt",driver:"",address:"",vin:"",brand:""});
 const current=books.find(b=>b.plate===plate);
 const used=current?.vehicles?.length||0, free=TOTAL-used;
 const vinMap=useMemo(()=>new Map((current?.vehicles||[]).map(v=>[v.vin,v.number])),[current]);
 const normalized=normVin(form.vin);
 const existingNo=vinMap.get(normalized);
 const nextNo=(()=>{const s=new Set((current?.vehicles||[]).map(v=>v.number));for(let n=2;n<=22;n++)if(!s.has(n))return n;return null})();
 const assigned=existingNo||nextNo;

 async function load(){
   setLoading(true);
   try{const r=await fetch("/api/state",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error);setBooks(j.books||[])}
   catch(e){alert("Daten konnten nicht geladen werden: "+e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);

 async function save(e){
   e.preventDefault();
   if(normalized.length!==17)return alert("Bitte eine vollständige 17-stellige FIN eingeben.");
   const r=await fetch("/api/trips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,plate,vin:normalized})});
   const j=await r.json();if(!r.ok)return alert(j.error||"Speichern fehlgeschlagen");
   setForm(v=>({...v,timeFrom:"",timeTo:"",driver:"",address:"",vin:"",brand:""}));await load();
 }
 async function adminLogin(){
   const r=await fetch("/api/admin/login",{method:"POST",headers:{"x-admin-password":adminPassword}});
   if(!r.ok)return alert("Passwort falsch");
   setAdmin(true);setShowAdmin(false);
 }
 const ah={"Content-Type":"application/json","x-admin-password":adminPassword};
 async function del(id){
   if(!confirm("Wirklich unwiderruflich löschen?\n\nDer Eintrag wird vollständig entfernt."))return;
   const r=await fetch("/api/admin/trip",{method:"DELETE",headers:ah,body:JSON.stringify({id})});const j=await r.json();
   if(!r.ok)return alert(j.error);await load();
 }
 async function saveEdit(){
   const r=await fetch("/api/admin/trip",{method:"PATCH",headers:ah,body:JSON.stringify({
     id:editing.id,date:editing.date,timeFrom:editing.time_from,timeTo:editing.time_to,start:editing.start,destination:editing.destination,
     purpose:editing.purpose,driver:editing.driver,address:editing.address,vin:editing.vin,brand:editing.brand
   })});const j=await r.json();if(!r.ok)return alert(j.error);setEditing(null);await load();
 }
 async function closeBook(){
   if(used!==TOTAL)return alert("Das Buch ist noch nicht vollständig belegt.");
   window.print();
   if(!confirm("PDF erfolgreich erstellt und gespeichert?\n\nMit JA wird das Buch abgeschlossen und archiviert."))return;
   const r=await fetch("/api/admin/close-book",{method:"POST",headers:ah,body:JSON.stringify({plate})});const j=await r.json();
   if(!r.ok)return alert(j.error);await load();
 }
 async function newBook(){
   if(!confirm("Neues Fahrtenbuch öffnen?\n\nDie Nummerierung beginnt wieder bei Nr. 2. Das alte Buch bleibt im Archiv."))return;
   const r=await fetch("/api/admin/new-book",{method:"POST",headers:ah,body:JSON.stringify({plate})});const j=await r.json();
   if(!r.ok)return alert(j.error);await load();
 }
 async function openArchive(){
   const r=await fetch("/api/admin/archives",{headers:{"x-admin-password":adminPassword}});const j=await r.json();
   if(!r.ok)return alert(j.error);setArchives(j.archives||[]);setShowArchive(true);
 }
 function printArchive(a){
   const w=window.open("","_blank");if(!w)return alert("Popup blockiert");
   const rows=(a.entries||[]).map(x=>`<tr><td>${x.number}</td><td>${fmtDate(x.date)}</td><td>${x.time_from}–${x.time_to}</td><td>${x.start} → ${x.destination}</td><td>${x.purpose}</td><td>${x.driver}<br><small>${x.address||""}</small></td><td>${x.vin}</td><td>${x.brand||""}</td></tr>`).join("");
   w.document.write(`<html><head><title>${a.plate} Buch ${a.cycle}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left}@page{size:landscape;margin:10mm}</style></head><body><h2>Fahrtenbuch ${a.plate} · Buch ${a.cycle}</h2><p>Abgeschlossen ${new Date(a.closed_at).toLocaleString("de-DE")}</p><table><tr><th>Nr.</th><th>Datum</th><th>Zeit</th><th>Route</th><th>Zweck</th><th>Fahrer</th><th>FIN</th><th>Marke</th></tr>${rows}</table><script>onload=()=>print()<\/script></body></html>`);w.document.close();
 }
 async function deleteArchive(id){
   if(!confirm("Archiviertes Buch wirklich unwiderruflich löschen?"))return;
   const r=await fetch("/api/admin/archive",{method:"DELETE",headers:ah,body:JSON.stringify({id})});if(!r.ok)return alert((await r.json()).error);await openArchive();
 }
 const rows=(current?.trips||[]).filter(x=>!search||JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
 const full=used===TOTAL;

 return <main>
   <header><div><small>BOB Automotive</small><h1>Digitales Fahrtenbuch</h1></div><div className="headerActions">{admin&&<button onClick={openArchive}>Archiv</button>}<button onClick={()=>admin?setAdmin(false):setShowAdmin(true)}>{admin?"Admin aktiv":"Admin"}</button></div></header>
   <div className="wrap">
    <div className="tabs">{PLATES.map(p=><button key={p} className={p===plate?"tab active":"tab"} onClick={()=>setPlate(p)}><b>{p}</b><span>Rotes Kennzeichen</span></button>)}</div>
    <div className="stats"><Card t="Belegte Nummern" v={`${used} / 21`}/><Card t="Noch frei" v={free}/><Card t="Fahrten gesamt" v={current?.trips?.length||0}/><Card t="Nächste neue Nr." v={nextNo||"–"}/></div>
    <div className={"status "+(full?"full":free<=2?"warn":"ok")}><b>{full?"Nr. 2–22 vollständig belegt":`${free} Nummer${free===1?"":"n"} frei`}</b><span>{full?"Neue FINs sind gesperrt. Bekannte FINs bleiben möglich.":`Nächste neue FIN erhält automatisch Nr. ${nextNo}.`}</span></div>

    <section className="panel entry">
      <div className="panelHead"><div><small>Schnelleingabe</small><h2>Neue Fahrt eintragen</h2></div>
      <div className={"vinInfo "+(existingNo?"existing":normalized?"new":"")}>{!normalized?"FIN eingeben – Nummer wird automatisch ermittelt.":existingNo?`FIN bereits vorhanden – bleibt Nr. ${existingNo}.`:`Neue FIN – erhält Nr. ${nextNo??"–"}.`}</div></div>
      <form onSubmit={save}><div className="grid">
       <Field l="Datum"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></Field>
       <Field l="Von"><input type="time" value={form.timeFrom} onChange={e=>setForm({...form,timeFrom:e.target.value})} required/></Field>
       <Field l="Bis"><input type="time" value={form.timeTo} onChange={e=>setForm({...form,timeTo:e.target.value})} required/></Field>
       <Field l="Zweck"><select value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}>{["Probefahrt","Überführungsfahrt","Werkstattfahrt","Prüfungsfahrt","Sonstiges"].map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field l="Start"><input value={form.start} onChange={e=>setForm({...form,start:e.target.value})} required/></Field>
       <Field l="Ziel"><input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} required/></Field>
       <Field l="Fahrer / Kunde"><input value={form.driver} onChange={e=>setForm({...form,driver:e.target.value})} required/></Field>
       <Field l="Adresse"><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
       <Field l="Fahrgestellnummer (17-stellig)" wide><input className="vin" maxLength="17" value={form.vin} onChange={e=>setForm({...form,vin:normVin(e.target.value)})} required/></Field>
       <Field l="Marke"><input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field>
       <Field l="Nummer"><input value={assigned||"–"} readOnly/></Field>
      </div><div className="actions"><button className="primary">Fahrt speichern</button></div></form>
    </section>

    <section className="panel">
      <div className="panelHead"><div><small>Fahrtenbuch</small><h2>{plate} · Buch {current?.cycle||1}</h2></div><div className="tools"><input placeholder="FIN, Fahrer oder Datum suchen" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>window.print()}>Drucken / PDF</button>{admin&&full&&<button className="primary" onClick={closeBook}>PDF & Buch abschließen</button>}{admin&&current?.status==="closed"&&<button className="primary" onClick={newBook}>Neues Buch öffnen</button>}</div></div>
      {loading?<div className="empty">Lade…</div>:<div className="tableWrap"><table><thead><tr><th>Nr.</th><th>Datum</th><th>Zeit</th><th>Route</th><th>Zweck</th><th>Fahrer</th><th>FIN</th><th>Marke</th>{admin&&<th>Admin</th>}</tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.number}</b></td><td>{fmtDate(x.date)}</td><td>{x.time_from} – {x.time_to}</td><td>{x.start} → {x.destination}</td><td>{x.purpose}</td><td>{x.driver}{x.address&&<><br/><small>{x.address}</small></>}</td><td><code>{x.vin}</code></td><td>{x.brand}</td>{admin&&<td><button onClick={()=>setEditing({...x})}>Bearbeiten</button> <button className="danger" onClick={()=>del(x.id)}>Löschen</button></td>}</tr>)}</tbody></table></div>}
    </section>
   </div>

   {showAdmin&&<Modal title="Adminmodus" onClose={()=>setShowAdmin(false)}><label>Admin-Passwort<input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adminLogin()}/></label><div className="actions right"><button onClick={()=>setShowAdmin(false)}>Abbrechen</button><button className="primary" onClick={adminLogin}>Freischalten</button></div></Modal>}
   {editing&&<Modal title="Eintrag bearbeiten" onClose={()=>setEditing(null)}><div className="grid two">{[
     ["Datum","date","date"],["Von","time_from","time"],["Bis","time_to","time"],["Zweck","purpose","text"],["Start","start","text"],["Ziel","destination","text"],["Fahrer","driver","text"],["Adresse","address","text"],["FIN","vin","text"],["Marke","brand","text"]
    ].map(([l,k,t])=><Field key={k} l={l}><input type={t} value={editing[k]||""} onChange={e=>setEditing({...editing,[k]:k==="vin"?normVin(e.target.value):e.target.value})}/></Field>)}</div><div className="actions right"><button onClick={()=>setEditing(null)}>Abbrechen</button><button className="primary" onClick={saveEdit}>Speichern</button></div></Modal>}
   {showArchive&&<Modal title="Archivierte Fahrtenbücher" wide onClose={()=>setShowArchive(false)}>{archives.length===0?<div className="empty">Noch keine archivierten Bücher.</div>:archives.map(a=><div className="archive" key={a.id}><div><b>{a.plate} · Buch {a.cycle}</b><span>{new Date(a.closed_at).toLocaleString("de-DE")} · {(a.entries||[]).length} Fahrten</span></div><div><button onClick={()=>printArchive(a)}>Drucken / PDF</button><button className="danger" onClick={()=>deleteArchive(a.id)}>Archiv löschen</button></div></div>)}</Modal>}
 </main>
}
function Card({t,v}){return <div className="card"><span>{t}</span><b>{v}</b></div>}
function Field({l,children,wide}){return <label className={wide?"wide":""}><span>{l}</span>{children}</label>}
function Modal({title,children,onClose,wide}){return <div className="modalBack"><div className={"modal "+(wide?"wideModal":"")}><h3>{title}</h3>{children}<button className="x" onClick={onClose}>×</button></div></div>}
