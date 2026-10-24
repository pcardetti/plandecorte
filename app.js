const COLORS=["#e07a5f","#3d8eb9","#81b29a","#f2cc8f","#9c6ade","#e9a03b","#5bb5a2","#d16ba5","#7a9e3d","#c97b4a","#4f7cac","#b5838d"];
const $=id=>document.getElementById(id);
const STORE="plandecorte:v2";

const ICONS={
  print:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  ruler:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  spark:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  alert:'<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
  reset:'<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
  rotate:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const isMobile=()=>matchMedia("(max-width:860px)").matches;

// ---------- veta ----------
// Dirección de la veta en cada pieza: "" libre (se puede girar), "w" a lo largo
// del ancho, "h" a lo largo del alto. La veta del tablero corre a lo largo de su ancho.
// Las versiones anteriores guardaban true = "no girar" (equivale a "w").
const normGrain=g=>g===true?"w":g==="w"||g==="h"?g:"";
const GRAIN_TXT={"":"libre (se puede girar)",w:"a lo largo del ancho",h:"a lo largo del alto"};
// Orientaciones posibles de una pieza: [ancho, alto, rotada] sobre el tablero
function orientations(w,h,g,grain){
  if(grain&&g==="w")return [[w,h,false]];
  if(grain&&g==="h")return [[h,w,true]];
  return w===h?[[w,h,false]]:[[w,h,false],[h,w,true]];
}

// ---------- tapacanto ----------
// Lados de una pieza, en el orden en que se guardan ("1010" = superior e izquierdo).
// Superior/inferior miden el ancho; izquierdo/derecho miden el alto.
const SIDES=[{k:"S",name:"superior"},{k:"I",name:"inferior"},{k:"Z",name:"izquierdo"},{k:"D",name:"derecho"}];
const normEdges=e=>/^[01]{4}$/.test(e)?e:"0000";
const edgeList=e=>SIDES.filter((s,i)=>e[i]==="1");
function edgeGlyph(e){
  const on=i=>e[i]==="1"?"on":"";
  return `<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="3" y="3" width="34" height="22" rx="1"/><line class="${on(0)}" x1="3" y1="3" x2="37" y2="3"/><line class="${on(1)}" x1="3" y1="25" x2="37" y2="25"/><line class="${on(2)}" x1="3" y1="3" x2="3" y2="25"/><line class="${on(3)}" x1="37" y1="3" x2="37" y2="25"/></svg>`;
}
let popBtn=null;
function openEdgePop(btn){
  const pop=$("edgePop"), e=btn.dataset.e;
  popBtn=btn;
  pop.querySelectorAll("input").forEach(c=>c.checked=e[+c.dataset.i]==="1");
  syncPopGlyph();
  pop.hidden=false;
  placePop(pop,btn);
  btn.setAttribute("aria-expanded","true");
  pop.querySelector("input").focus({preventScroll:true});
}
function positionPop(){
  if(popBtn&&!$("edgePop").hidden)placePop($("edgePop"),popBtn);
  if(!$("sharePop").hidden)placePop($("sharePop"),$("shareBtn"));
  if(!$("resetPop").hidden)placePop($("resetPop"),$("resetBtn"));
}
// Ubica un panel flotante pegado al botón que lo abrió, sin salirse de la pantalla
function placePop(pop,btn){
  const r=btn.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight;
  const left=Math.min(Math.max(8,r.right-pw),innerWidth-pw-8);
  const top=r.bottom+6+ph>innerHeight?Math.max(8,r.top-ph-6):r.bottom+6;
  pop.style.left=left+"px";pop.style.top=top+"px";
}
function closeEdgePop(refocus=true){
  const pop=$("edgePop");
  if(pop.hidden)return;
  pop.hidden=true;
  if(popBtn){popBtn.setAttribute("aria-expanded","false");if(refocus)popBtn.focus()}
  popBtn=null;
}
function syncPopGlyph(){
  $("edgePop").querySelectorAll("input").forEach(c=>$("edgePop").querySelector(`.pop-piece .s${c.dataset.i}`).classList.toggle("on",c.checked));
}
function applyPop(){
  if(!popBtn)return;
  const e=[0,1,2,3].map(i=>$("edgePop").querySelector(`input[data-i="${i}"]`).checked?"1":"0").join("");
  setEdges(popBtn,e);save();validate();
}
function setEdges(btn,e){
  btn.dataset.e=e;btn.innerHTML=edgeGlyph(e);
  const n=btn.closest("tr")?[...$("rows").children].indexOf(btn.closest("tr"))+1:"";
  const l=edgeList(e).map(s=>s.name);
  btn.setAttribute("aria-label",`Tapacanto de la pieza ${n}: ${l.length?l.join(", "):"sin canto"}`);
  btn.title=l.length?`Canto: ${l.join(", ")}`:"Sin tapacanto";
}

// ---------- avisos ----------
function toast(msg,{type="info",action=null,timeout=5000}={}){
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${esc(msg)}</span>${action?`<button class="act">${esc(action.label)}</button>`:""}<button class="close" aria-label="Cerrar aviso">×</button>`;
  const close=()=>el.remove();
  el.querySelector(".close").onclick=close;
  if(action)el.querySelector(".act").onclick=()=>{action.fn();close()};
  $("toasts").appendChild(el);
  while($("toasts").children.length>3)$("toasts").firstElementChild.remove();
  if(timeout)setTimeout(close,timeout);
  return el;
}

// ---------- piezas (UI) ----------
function addRow(p={name:"",w:"",h:"",q:1,g:"",e:"0000"},before=null){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><span class="sw"></span></td>
    <td><input type="text" class="n" value="${esc(p.name)}" placeholder="Pieza" autocomplete="off"></td>
    <td><input type="number" class="w" value="${esc(p.w)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td><input type="number" class="h" value="${esc(p.h)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td><input type="number" class="q" value="${esc(p.q)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td class="c"><select class="g">${["","w","h"].map(v=>`<option value="${v}" ${normGrain(p.g)===v?"selected":""}>${{"":"—",w:"↔",h:"↕"}[v]}</option>`).join("")}</select></td>
    <td class="c"><button type="button" class="edge" aria-haspopup="dialog" aria-expanded="false" aria-controls="edgePop"></button></td>
    <td><button class="x">×</button></td>`;
  tr.querySelector(".x").onclick=()=>removeRow(tr);
  const eb=tr.querySelector(".edge");
  eb.dataset.e=normEdges(p.e);
  eb.onclick=()=>popBtn===eb?closeEdgePop():openEdgePop(eb);
  tr.querySelector(".g").addEventListener("change",e=>{
    // elegir veta en una pieza implica que el tablero tiene veta
    if(e.target.value&&!$("grain").checked){
      $("grain").checked=true;
      toast("Activé «Tablero con veta» para que la veta de las piezas se respete.");
    }
    refreshRows();save();validate();
  });
  tr.querySelectorAll("input").forEach(i=>{
    i.addEventListener("input",()=>{save();validate()});
    // Enter salta a la pieza siguiente (o crea una nueva al final)
    if(i.type!=="checkbox")i.addEventListener("keydown",e=>{
      if(e.key!=="Enter"||e.ctrlKey||e.metaKey)return;
      e.preventDefault();
      const next=tr.nextElementSibling;
      if(next)next.querySelector(".n").focus();
      else{addRow();save();$("rows").lastElementChild.querySelector(".n").focus()}
    });
  });
  $("rows").insertBefore(tr,before);refreshRows();
  return tr;
}
function removeRow(tr){
  const rows=$("rows"), idx=[...rows.children].indexOf(tr);
  const data=rowData(tr), label=data.name.trim()||`Pieza ${idx+1}`;
  // mover el foco antes de quitar la fila para no perderlo
  const focusTo=tr.nextElementSibling||tr.previousElementSibling;
  tr.remove();refreshRows();save();validate();
  (focusTo?focusTo.querySelector(".x"):$("add")).focus();
  toast(`«${label}» eliminada`,{action:{label:"Deshacer",fn:()=>{
    const r=addRow(data,rows.children[idx]||null);save();validate();r.querySelector(".n").focus();
  }},timeout:7000});
}
function rowData(tr){
  return {name:tr.querySelector(".n").value,w:tr.querySelector(".w").value,h:tr.querySelector(".h").value,q:tr.querySelector(".q").value,g:tr.querySelector(".g").value,e:tr.querySelector(".edge").dataset.e};
}
function refreshRows(){
  [...$("rows").children].forEach((tr,i)=>{
    const n=i+1;
    tr.querySelector(".sw").style.background=COLORS[i%COLORS.length];
    tr.querySelector(".n").setAttribute("aria-label",`Nombre de la pieza ${n}`);
    tr.querySelector(".w").setAttribute("aria-label",`Ancho de la pieza ${n} en mm`);
    tr.querySelector(".h").setAttribute("aria-label",`Alto de la pieza ${n} en mm`);
    tr.querySelector(".q").setAttribute("aria-label",`Cantidad de la pieza ${n}`);
    const g=tr.querySelector(".g");
    g.setAttribute("aria-label",`Veta de la pieza ${n}: ${GRAIN_TXT[g.value]}`);
    g.title=`Veta: ${GRAIN_TXT[g.value]}`;
    tr.querySelector(".x").setAttribute("aria-label",`Quitar pieza ${n}`);
    tr.querySelector(".x").title="Quitar";
    const eb=tr.querySelector(".edge");setEdges(eb,eb.dataset.e);
  });
}

// ---------- validación ----------
// Los campos vacíos sólo se marcan después del primer intento de calcular.
let attempted=false;
function setErr(input,msg,errEl){
  input.setAttribute("aria-invalid",msg?"true":"false");
  if(errEl)errEl.textContent=msg||"";
}
function validate(){
  const errs=[];
  const num=id=>$(id).value.trim()===""?null:+$(id).value;
  const field=(id,msg)=>{setErr($(id),msg,$(id+"-err"));if(msg)errs.push($(id))};
  const W=num("bw"), H=num("bh"), kerf=num("kerf"), margin=num("margin"), maxb=num("maxb");
  field("bw",W==null?(attempted?"Indicá el ancho":""):W>0?"":"Debe ser mayor a 0");
  field("bh",H==null?(attempted?"Indicá el alto":""):H>0?"":"Debe ser mayor a 0");
  field("kerf",kerf!=null&&kerf<0?"No puede ser negativo":"");
  const mErr=margin!=null&&margin<0?"No puede ser negativo":
    margin>0&&W>0&&H>0&&(2*margin>=W||2*margin>=H)?"Es mayor que el tablero":"";
  field("margin",mErr);
  field("maxb",maxb!=null&&!(Number.isInteger(maxb)&&maxb>=1)?"Entero desde 1":"");
  const ct=num("ct"), cx=num("cx");
  field("ct",ct!=null&&ct<0?"No puede ser negativo":ct>10?"Revisá: más de 10 mm":"");
  field("cx",cx!=null&&cx<0?"No puede ser negativo":"");
  const t=ct>0?ct:0;
  for(const k of PRICES){const v=num(k);field(k,v!=null&&!(v>=0)?"No puede ser negativo":"")}

  const uw=(W||0)-2*(margin||0), uh=(H||0)-2*(margin||0), grain=$("grain").checked;
  const rowMsgs=[];
  [...$("rows").children].forEach((tr,i)=>{
    const d=rowData(tr), w=d.w===""?null:+d.w, h=d.h===""?null:+d.h, q=d.q===""?null:+d.q;
    const label=d.name.trim()||`Pieza ${i+1}`;
    const blank=w==null&&h==null&&!d.name.trim();
    let wErr=false,hErr=false,msg="";
    if(blank){}
    else if(w==null||h==null){wErr=w==null&&attempted;hErr=h==null&&attempted;if(attempted)msg=`${label}: falta ${w==null?"el ancho":"el alto"}`}
    else if(!(w>0)||!(h>0)){wErr=!(w>0);hErr=!(h>0);msg=`${label}: las medidas deben ser mayores a 0`}
    else{
      const c=cutSize(w,h,d.e,t);
      if(!(c.w>0&&c.h>0)){wErr=hErr=true;msg=`${label}: el canto es más grueso que la pieza`}
      else if(uw>0&&uh>0){
        const lock=grain&&d.g, fits=orientations(c.w,c.h,d.g,grain).some(([a,b])=>a<=uw&&b<=uh);
        if(!fits){wErr=hErr=true;msg=`${label} (${w}×${h}) no entra en el tablero${lock?" con la veta "+GRAIN_TXT[d.g]:""}`}
      }
    }
    const qErr=q!=null&&!(Number.isInteger(q)&&q>=1);
    if(qErr&&!msg)msg=`${label}: la cantidad debe ser un entero desde 1`;
    setErr(tr.querySelector(".w"),wErr?msg:"");setErr(tr.querySelector(".h"),hErr?msg:"");setErr(tr.querySelector(".q"),qErr?msg:"");
    tr.classList.toggle("bad",!!msg);
    if(msg){rowMsgs.push(msg);errs.push(tr.querySelector(wErr?".w":hErr?".h":".q"))}
  });
  $("rows-err").textContent=rowMsgs.join(" · ");
  return errs;
}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
const PRICES=["pb","pe","pc","po","pg"];
const money=v=>"$ "+v.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
// Medida de corte: la final menos el espesor del canto en cada lado que lo lleva.
// Se redondea a 0,1 mm para no arrastrar decimales de coma flotante.
function cutSize(w,h,e,t){
  e=normEdges(e);
  const r=v=>Math.round(v*10)/10;
  return {w:r(w-t*((e[2]==="1")+(e[3]==="1"))),h:r(h-t*((e[0]==="1")+(e[1]==="1")))};
}
// Metros lineales de canto de una unidad, con el sobrante por tramo
function edgeMeters(fw,fh,e,extra){
  e=normEdges(e);
  return ((e[0]==="1")*(fw+extra)+(e[1]==="1")*(fw+extra)+(e[2]==="1")*(fh+extra)+(e[3]==="1")*(fh+extra))/1000;
}
// w/h son las medidas de corte (las que usa el optimizador); fw/fh las finales.
function readPieces(){
  const cfg=readCfg();
  return [...$("rows").children].map((tr,i)=>{
    const fw=+tr.querySelector(".w").value, fh=+tr.querySelector(".h").value, e=tr.querySelector(".edge").dataset.e;
    const c=cutSize(fw,fh,e,cfg.ct);
    return {
      name:tr.querySelector(".n").value.trim()||`Pieza ${i+1}`,
      w:c.w, h:c.h, fw, fh, e, em:edgeMeters(fw,fh,e,cfg.cx),
      q:Math.max(1,parseInt(tr.querySelector(".q").value)||1),
      g:tr.querySelector(".g").value, color:COLORS[i%COLORS.length], id:i
    };
  }).filter(p=>p.fw>0&&p.fh>0&&p.w>0&&p.h>0);
}
function readCfg(){
  return {W:+$("bw").value,H:+$("bh").value,kerf:Math.max(0,+$("kerf").value||0),
    margin:Math.max(0,+$("margin").value||0),maxB:parseInt($("maxb").value)||Infinity,grain:$("grain").checked,
    ct:Math.max(0,+$("ct").value||0),cx:Math.max(0,+$("cx").value||0),
    price:Object.fromEntries(PRICES.map(k=>[k,Math.max(0,+$(k).value||0)]))};
}
// ---------- proyectos ----------
// Todos los proyectos viven en este navegador:
// {current, order:[ids], items:{id:{name,created,updated,data}}}
const PSTORE="plandecorte:projects:v1";
const CFG_KEYS=["bw","bh","kerf","margin","maxb","ct","cx",...PRICES];
const DEFAULTS={bw:"2800",bh:"2070",kerf:"4",margin:"0",maxb:"",ct:"0",cx:"0",pb:"",pe:"",pc:"",po:"",pg:""};
let db=null, storageWarned=false;
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function state(){
  return {project:$("project").value,
    cfg:{...Object.fromEntries(CFG_KEYS.map(k=>[k,$(k).value])),grain:$("grain").checked},
    rows:[...$("rows").children].map(rowData),
    // giros a mano junto con la huella de las piezas para las que se hicieron
    manual:manualCount()?{sig:forcedSig,force:{...forced}}:null};
}
const manualCount=()=>Object.keys(forced).length;
const girosTxt=n=>`${n} giro${n===1?"":"s"} hecho${n===1?"":"s"} a mano`;
// Limpia datos que vienen del almacenamiento o de un link compartido
function sanitize(s){
  if(!s||typeof s!=="object")s={};
  const str=(v,n)=>String(v??"").slice(0,n);
  const cfg=s.cfg&&typeof s.cfg==="object"?s.cfg:{};
  return {
    project:str(s.project,120),
    cfg:{...Object.fromEntries(CFG_KEYS.map(k=>[k,cfg[k]==null?DEFAULTS[k]:str(cfg[k],16)])),grain:!!cfg.grain},
    rows:(Array.isArray(s.rows)?s.rows:[]).slice(0,500).filter(r=>r&&typeof r==="object")
      .map(r=>({name:str(r.name,80),w:str(r.w,12),h:str(r.h,12),q:str(r.q??1,6),g:normGrain(r.g),e:normEdges(r.e)})),
    manual:sanitizeManual(s.manual)
  };
}
function sanitizeManual(m){
  if(!m||typeof m!=="object"||!/^[0-9a-f]{1,16}$/.test(m.sig)||!m.force||typeof m.force!=="object")return null;
  const force=Object.fromEntries(Object.entries(m.force).filter(([k,v])=>/^\d{1,4}:\d{1,5}$/.test(k)&&typeof v==="boolean").slice(0,2000));
  return Object.keys(force).length?{sig:m.sig,force}:null;
}
function applyState(s){
  s=sanitize(s);
  closeEdgePop(false);
  $("project").value=s.project;
  for(const k of CFG_KEYS)$(k).value=s.cfg[k];
  $("grain").checked=s.cfg.grain;
  $("budget").open=PRICES.some(k=>+s.cfg[k]>0);
  $("rows").innerHTML="";
  s.rows.forEach(r=>addRow(r));
  forced=s.manual?{...s.manual.force}:{};forcedSig=s.manual?s.manual.sig:"";
  attempted=false;lastResult=null;showEmpty();validate();
}
// aviso al abrir un proyecto que trae giros a mano
function noteManual(){
  if(manualCount())toast(`Este proyecto tiene ${girosTxt(manualCount())}: se aplica${manualCount()===1?"":"n"} al calcular.`,{timeout:6000});
}
function persist(){
  try{localStorage.setItem(PSTORE,JSON.stringify(db))}
  catch(e){if(!storageWarned){storageWarned=true;toast("No se pudo guardar en este navegador (¿modo privado o sin espacio?).",{type:"error",timeout:8000})}}
}
function save(){
  const p=db.items[db.current];
  p.data=state();p.name=p.data.project.trim();p.updated=Date.now();
  persist();renderProjSel();
}
function createProject(data){
  const id=newId(), now=Date.now();
  data=sanitize(data);
  db.items[id]={name:data.project.trim(),created:now,updated:now,data};
  db.order.push(id);db.current=id;persist();
  return id;
}
function load(){
  try{db=JSON.parse(localStorage.getItem(PSTORE))}catch(e){db=null}
  if(!db||typeof db!=="object"||!db.items||typeof db.items!=="object"||!Array.isArray(db.order))db=null;
  else db.order=db.order.filter(id=>db.items[id]&&typeof db.items[id]==="object");
  if(!db||!db.order.length){
    // primera vez: traer el proyecto único de la versión anterior, si existe
    let old=null;try{old=JSON.parse(localStorage.getItem(STORE))}catch(e){}
    db={current:null,order:[],items:{}};
    createProject(old||state());
  }
  if(!db.items[db.current])db.current=db.order[0];
  applyState(db.items[db.current].data);renderProjSel();noteManual();
}
function renderProjSel(){
  const sel=$("projSel");
  sel.innerHTML=db.order.map((id,i)=>`<option value="${id}">${esc(db.items[id].name||`Sin nombre (${i+1})`)}</option>`).join("");
  sel.value=db.current;
}
function switchProject(id){
  if(id===db.current||!db.items[id])return;
  save();db.current=id;persist();
  applyState(db.items[id].data);renderProjSel();noteManual();
}
function newProject(){
  save();
  // el proyecto nuevo conserva tablero, canto y precios; empieza sin piezas
  createProject({...state(),project:"",rows:[],manual:null});
  applyState(db.items[db.current].data);renderProjSel();
  $("project").focus();
  toast("Proyecto nuevo: conserva el tablero, el canto y los precios.");
}
function duplicateProject(){
  save();
  const s=state();
  createProject({...s,project:`${s.project.trim()||"Proyecto"} (copia)`});
  applyState(db.items[db.current].data);renderProjSel();
  toast("Proyecto duplicado.");
}
// Vacía el proyecto abierto (piezas, giros a mano y resultado);
// conserva nombre, tablero, canto y precios. Se puede deshacer.
// Pide confirmación en un panel junto al botón antes de vaciar el proyecto
function openResetConfirm(){
  closeEdgePop(false);closeShare(false);hideTip();
  save();
  const st=state(), n=st.rows.length, m=manualCount();
  if(!n&&!m&&!lastResult){toast("El proyecto ya está vacío.");return}
  const name=st.project.trim();
  const parts=[`${n} pieza${n===1?"":"s"}`];
  if(m)parts.push(girosTxt(m));
  if(lastResult)parts.push("el plan calculado");
  $("resetPop-desc").textContent=`Se van a borrar ${parts.join(", ").replace(/, ([^,]*)$/," y $1")}${name?` de «${name}»`:""}. Se conservan el nombre, el tablero, el canto y los precios.`;
  const pop=$("resetPop");pop.hidden=false;
  $("resetBtn").setAttribute("aria-expanded","true");
  placePop(pop,$("resetBtn"));
  $("resetCancel").focus({preventScroll:true});
}
function closeResetConfirm(refocus=true){
  if($("resetPop").hidden)return;
  $("resetPop").hidden=true;$("resetBtn").setAttribute("aria-expanded","false");
  if(refocus)$("resetBtn").focus();
}
function resetProject(){
  closeResetConfirm(false);
  const before=state();
  applyState({...before,rows:[],manual:null});save();
  $("add").focus();
  toast("Proyecto reiniciado: se vaciaron las piezas, los giros y el resultado.",{timeout:9000,action:{label:"Deshacer",fn:()=>{
    applyState(before);save();noteManual();
  }}});
}
function deleteProject(){
  const id=db.current, item=db.items[id], idx=db.order.indexOf(id);
  save();
  delete db.items[id];db.order.splice(idx,1);
  if(!db.order.length)createProject({...state(),project:"",rows:[],manual:null});
  else db.current=db.order[Math.min(idx,db.order.length-1)];
  persist();applyState(db.items[db.current].data);renderProjSel();
  $("projSel").focus();
  toast(`«${item.name||"Sin nombre"}» eliminado`,{timeout:8000,action:{label:"Deshacer",fn:()=>{
    save();db.items[id]=item;db.order.splice(Math.min(idx,db.order.length),0,id);db.current=id;
    persist();applyState(item.data);renderProjSel();
  }}});
}

// ---------- compartir por link ----------
// El proyecto viaja comprimido en el #hash: nunca llega al servidor.
const SHARE_MAX=60000;
function b64enc(u8){let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode(...u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64dec(s){return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))}
// Pasa bytes por un (de)compresor cortando si el resultado supera el límite
async function pipe(u8,ts,limit=2e6){
  const r=new Blob([u8]).stream().pipeThrough(ts).getReader(), parts=[];let n=0;
  for(;;){
    const {done,value}=await r.read();if(done)break;
    n+=value.length;if(n>limit){r.cancel();throw new Error("demasiado grande")}
    parts.push(value);
  }
  const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}
  return out;
}
async function encodeShare(obj){
  const raw=new TextEncoder().encode(JSON.stringify(obj));
  if("CompressionStream" in window)return "z"+b64enc(await pipe(raw,new CompressionStream("deflate-raw")));
  return "j"+b64enc(raw);
}
async function decodeShare(code){
  const bytes=b64dec(code.slice(1));
  const raw=code[0]==="z"?await pipe(bytes,new DecompressionStream("deflate-raw")):code[0]==="j"?bytes:null;
  if(!raw||raw.length>2e6)throw new Error("formato");
  return JSON.parse(new TextDecoder().decode(raw));
}
async function shareUrl(){
  const s=sanitize(state());
  if(!$("shareP").checked)for(const k of PRICES)s.cfg[k]="";
  const url=`${location.origin}${location.pathname}#p=${await encodeShare(s)}`;
  if(url.length>SHARE_MAX)throw new Error("largo");
  return url;
}
async function refreshShare(){
  try{$("shareUrl").value=await shareUrl();$("shareCopy").disabled=false}
  catch(e){$("shareUrl").value="";$("shareCopy").disabled=true;toast("El proyecto es demasiado grande para compartirlo por link.",{type:"error"})}
}
function openShare(){
  save();
  const pop=$("sharePop");pop.hidden=false;
  $("shareBtn").setAttribute("aria-expanded","true");
  $("shareNative").hidden=!navigator.share;
  $("shareManual").hidden=!manualCount();
  $("shareManual").textContent=`Ojo: este link incluye ${girosTxt(manualCount())}. Quien lo abra verá el aviso de plan modificado.`;
  placePop(pop,$("shareBtn"));
  refreshShare();
  $("shareCopy").focus({preventScroll:true});
}
function closeShare(refocus=true){
  if($("sharePop").hidden)return;
  $("sharePop").hidden=true;$("shareBtn").setAttribute("aria-expanded","false");
  if(refocus)$("shareBtn").focus();
}
async function copyShare(){
  const url=$("shareUrl").value;if(!url)return;
  let ok=false;
  try{await navigator.clipboard.writeText(url);ok=true}
  catch(e){
    // navegadores sin permiso de portapapeles: método clásico con el texto seleccionado
    $("shareUrl").focus();$("shareUrl").select();
    try{ok=document.execCommand("copy")}catch(e2){}
  }
  if(ok)toast("Link copiado. Pegalo donde quieras compartirlo.");
  else toast("No se pudo copiar solo: el link quedó seleccionado para copiarlo a mano.",{type:"error"});
}
async function openShared(){
  if(!location.hash.startsWith("#p="))return;
  const code=location.hash.slice(3);
  history.replaceState(null,"",location.pathname+location.search);
  if(!/^[zj][A-Za-z0-9_-]{1,60000}$/.test(code)){toast("El link compartido no es válido.",{type:"error"});return}
  try{
    const data=sanitize(await decodeShare(code)), json=JSON.stringify(data);
    save();
    // si ya se abrió este mismo link antes, no duplicar el proyecto
    const dup=db.order.find(id=>JSON.stringify(sanitize(db.items[id].data))===json);
    if(dup){db.current=dup;persist()}
    else{
      // quien abre el link por primera vez tiene un único proyecto vacío: reemplazarlo
      const cur=db.items[db.current].data, blank=db.order.length===1&&!cur.project.trim()&&!cur.rows.length;
      const old=db.current;
      createProject(data);
      if(blank){delete db.items[old];db.order=db.order.filter(id=>id!==old);persist()}
    }
    applyState(db.items[db.current].data);renderProjSel();
    toast(dup?`«${data.project||"Plan compartido"}» ya estaba en tus proyectos.`:`Abriste «${data.project||"un plan compartido"}». Quedó guardado en tus proyectos.${data.manual?` Trae ${girosTxt(Object.keys(data.manual.force).length)}.`:""}`,{timeout:7000});
    if(readPieces().length)calculate();
  }catch(e){toast("No se pudo abrir el link compartido: está incompleto o dañado.",{type:"error",timeout:7000})}
}

// ---------- optimizador ----------
// El método rápido da un plan al instante; después un Web Worker (optimizer-worker.js)
// sigue buscando sin trabar la pantalla y, si encuentra un plan mejor, se redibuja.
const OPT_MS=1500, DEEP_MS=12000;
let worker=null, job=null, jobSeq=0, opt={state:"idle"}, deepTimer=0;
function stopWorker(){if(worker){worker.terminate();worker=null}clearInterval(deepTimer)}
function startOptimize(pieces,cfg,ms,deep){
  stopWorker();
  try{worker=new Worker("optimizer-worker.js")}catch(e){worker=null}
  job={id:++jobSeq,pieces,cfg,deep,t0:performance.now(),ms,from:lastResult?{boards:lastResult.boards.length,pct:usedPct(lastResult)}:null,better:false};
  if(!worker){ // sin Worker: búsqueda corta en el hilo principal
    const sol=CutOptimizer.solve(pieces,cfg,{timeLimit:deep?3000:400});
    adopt(sol,job);finishOpt(job);return;
  }
  const my=job;
  worker.onmessage=e=>{
    const m=e.data;if(!job||m.id!==my.id)return;
    if(m.type==="improve"||m.type==="done")adopt(m.sol,my);
    if(m.type==="done"||m.type==="error")finishOpt(my,m.type==="error");
  };
  worker.onerror=()=>{if(job===my)finishOpt(my,true)};
  worker.postMessage({id:my.id,pieces,cfg,timeLimit:ms});
  opt={state:deep?"deep":"working",t0:my.t0,ms};
  if(deep)deepTimer=setInterval(paintOptStatus,500);
  paintOptStatus();
}
function usedPct(r){
  const used=r.boards.reduce((s,b)=>s+b.placed.reduce((a,p)=>a+p.w*p.h,0),0);
  return r.boards.length?used/(r.boards.length*r.cfg.W*r.cfg.H)*100:0;
}
// usar el plan del Worker si es mejor que el que se muestra
function adopt(sol,my){
  if(job!==my||!lastResult)return;
  const cur=CutOptimizer.score(lastResult,my.cfg),nw=CutOptimizer.score(sol,my.cfg);
  if(CutOptimizer.compare(nw,cur)>=0)return;
  sol.cfg=my.cfg;sol.pieces=my.pieces;sol.ms=performance.now()-my.t0;
  my.better=true;
  lastResult=sol;render(sol);
}
function finishOpt(my,failed,stopped){
  if(job!==my)return;
  clearInterval(deepTimer);
  if(worker){worker.terminate();worker=null}
  job=null;
  const r=lastResult;
  opt={state:failed?"failed":"done",deep:my.deep,better:my.better,stopped};
  if(r&&my.better&&my.from){
    const nb=r.boards.length;
    if(nb<my.from.boards)toast(`Encontré un plan mejor: ${nb} tablero${nb===1?"":"s"} (antes ${my.from.boards}), ${usedPct(r).toFixed(1)}% de aprovechamiento.`,{timeout:6000});
    else if(my.deep)toast("La búsqueda a fondo mejoró el acomodo: el último tablero deja un retazo más grande.",{timeout:6000});
  }else if(r&&my.deep&&!failed)toast(stopped?"Búsqueda detenida: queda el mejor plan encontrado hasta ahora.":"Búsqueda a fondo terminada: no hay un plan mejor que este.",{timeout:5000});
  paintOptStatus();
}
function paintOptStatus(){
  const el=$("optStatus");if(!el)return;
  const deepBtn=$("deepBtn");
  if(opt.state==="working"||opt.state==="deep"){
    const left=Math.max(0,Math.ceil((opt.t0+opt.ms-performance.now())/1000));
    el.innerHTML=`<span class="spin" aria-hidden="true"></span>${opt.state==="deep"?`Optimizando a fondo… ${left} s`:"Buscando un plan mejor…"}`+(opt.state==="deep"?` <button type="button" class="link" id="deepStop">Detener</button>`:"");
    el.className="opt-status busy";
    if($("deepStop"))$("deepStop").onclick=()=>{const my=job;stopWorker();if(my)finishOpt(my,false,true)};
    if(deepBtn)deepBtn.disabled=true;
  }else{
    el.innerHTML=opt.state==="failed"?"No se pudo optimizar más: se muestra el plan rápido.":(opt.state==="done"?`${icon("check")}${opt.stopped?"Búsqueda detenida":opt.deep?"Búsqueda a fondo terminada":"Plan optimizado"}`:"");
    el.className="opt-status";
    if(deepBtn)deepBtn.disabled=false;
  }
}

// ---------- render ----------
let lastResult=null;
// Giros elegidos a mano en el plano: {"fila:copia": true=rotada/false=normal}.
// Se descartan solos cuando cambian las piezas o el tablero.
let forced={}, forcedSig="";
// huella corta (FNV-1a) de las piezas y el tablero para saber si los giros siguen valiendo
function hashSig(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(16)}
function calculate(opts={}){
  attempted=true;
  const errs=validate();
  if(errs.length){
    toast(errs.length===1?"Revisá el campo marcado.":`Revisá los ${errs.length} campos marcados.`,{type:"error"});
    errs[0].focus();return;
  }
  const cfg=readCfg(), pieces=readPieces();
  if(!pieces.length){
    toast("Añadí al menos una pieza con ancho y alto.",{type:"error"});
    if(!$("rows").children.length)addRow();
    $("rows").lastElementChild.querySelector(".n").focus();return;
  }
  const sig=hashSig(JSON.stringify([pieces.map(({color,...p})=>p),{...cfg,price:null}]));
  if(sig!==forcedSig){
    const n=manualCount();
    forced={};forcedSig=sig;
    if(n)toast(`Se descart${n===1?"ó":"aron"} ${girosTxt(n)} porque cambiaron las piezas o el tablero. El plan volvió a ser automático.`,{type:"error",timeout:8000});
  }
  cfg.force=forced;
  const t0=performance.now();
  const r=CutOptimizer.solve(pieces,cfg,{timeLimit:0}); // plan rápido, al instante
  r.ms=performance.now()-t0;r.cfg=cfg;r.pieces=pieces;
  lastResult=r;opt={state:"idle"};render(r);save();
  startOptimize(pieces,cfg,OPT_MS,false);
  const used=r.boards.reduce((s,b)=>s+b.placed.reduce((a,p)=>a+p.w*p.h,0),0);
  const pct=r.boards.length?used/(r.boards.length*cfg.W*cfg.H)*100:0;
  toast(`${opts.msg?opts.msg+" · ":""}Plan listo: ${r.boards.length} tablero${r.boards.length===1?"":"s"}, ${pct.toFixed(1)}% de aprovechamiento${r.total!=null?` · total ${money(r.total)}`:""}${r.unplaced.length?` · ${r.unplaced.length} sin colocar`:""}.`,{type:r.unplaced.length?"error":"info",timeout:4000});
  // en el celular el resultado queda debajo del formulario: llevar al usuario hasta él
  // (el foco va primero y el scroll en el frame siguiente; si no, Chrome cancela el scroll suave)
  if(isMobile()&&!opts.noScroll){$("out").focus({preventScroll:true});requestAnimationFrame(()=>$("out").scrollIntoView({behavior:"smooth",block:"start"}))}
}
// Aviso flotante junto a la pieza tocada (los avisos de abajo pasaban desapercibidos)
let tipTimer=0, tipKey=null;
function pieceTip(key,msg,type="error"){
  const g=$("out").querySelector(`.piece[data-key="${key}"]`), tip=$("pieceTip");
  if(!g)return toast(msg,{type});
  tipKey=key;
  tip.className=`tip ${type}`;tip.textContent=msg;tip.hidden=false;
  placeTip();
  g.classList.remove("nope");void g.getBBox();g.classList.add("nope");
  clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,6000);
}
function placeTip(){
  const tip=$("pieceTip");
  if(tip.hidden||!tipKey)return;
  const g=$("out").querySelector(`.piece[data-key="${tipKey}"]`);
  if(!g)return hideTip();
  const r=g.getBoundingClientRect(), tw=tip.offsetWidth, th=tip.offsetHeight;
  const left=Math.min(Math.max(8,r.left+r.width/2-tw/2),innerWidth-tw-8);
  const above=r.top-th-10>=8;
  tip.style.left=left+"px";tip.style.top=(above?r.top-th-10:Math.min(r.bottom+10,innerHeight-th-8))+"px";
  tip.classList.toggle("below",!above);
  tip.style.setProperty("--arrow",`${Math.min(Math.max(14,r.left+r.width/2-left),tw-14)}px`);
}
function hideTip(){
  $("pieceTip").hidden=true;
  const g=tipKey&&$("out").querySelector(`.piece[data-key="${tipKey}"]`);
  if(g)g.classList.remove("nope");
  tipKey=null;
}
function rotatePiece(key){
  hideTip();
  const r=lastResult;if(!r)return;
  let p=null;
  for(const b of r.boards)for(const q of b.placed)if(`${q.item.id}:${q.item.n}`===key)p=q;
  if(!p)return;
  const it=p.item, cfg=r.cfg, uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  if(cfg.grain&&it.g){pieceTip(key,`«${it.name}» tiene la veta ${GRAIN_TXT[it.g]}: no se puede girar sin cruzarla. Cambiá la veta a «—» para girarla.`);return}
  if(it.w===it.h){pieceTip(key,`«${it.name}» es cuadrada: girarla no cambia nada.`,"info");return}
  const [w,h]=p.rot?[it.w,it.h]:[it.h,it.w];
  // p.rot = cómo está ahora; el aviso habla de la posición a la que se quiere pasar
  if(w>uw||h>uh){pieceTip(key,`«${it.name}» (${it.w}×${it.h}) no entra ${p.rot?"sin girar":"girada"} en el tablero: necesita ${w}×${h} y el espacio útil es ${uw}×${uh}.`);return}
  forced[key]=!p.rot;
  calculate({noScroll:true,msg:`«${it.name}» girada`});
  // mantener el foco en la misma pieza para seguir usando el teclado
  const g=$("out").querySelector(`.piece[data-key="${key}"]`);
  if(g)g.focus({preventScroll:true});
}
function render(r){
  const {cfg}=r, boardArea=cfg.W*cfg.H;
  const used=r.boards.reduce((s,b)=>s+b.placed.reduce((a,p)=>a+p.w*p.h,0),0);
  const total=r.boards.length*boardArea;
  const nPieces=r.boards.reduce((s,b)=>s+b.placed.length,0);
  const pct=total?used/total*100:0;
  const edgeTotal=r.boards.reduce((s,b)=>s+b.placed.reduce((a,p)=>a+p.item.em,0),0);
  const cuts=r.boards.reduce((s,b)=>s+b.cuts,0);
  const anyEdge=edgeTotal>0, anyCut=r.boards.some(b=>b.placed.some(p=>p.item.w!==p.item.fw||p.item.h!==p.item.fh));
  let h="";
  if(r.unplaced.length){
    const names=[...new Set(r.unplaced.map(u=>`${u.name} (${u.w}×${u.h})`))].join(", ");
    h+=`<div class="warn"><b>${r.unplaced.length} pieza(s) sin colocar:</b> ${esc(names)}. ${cfg.maxB<Infinity?"Se alcanzó el máximo de tableros o ":""}la pieza no cabe en el tablero.</div>`;
  }
  if(manualCount())h+=`<div class="manual" role="note">${icon("alert")}<div class="manual-txt"><strong>Plan modificado a mano</strong><span>${girosTxt(manualCount())}. Esas piezas tienen borde punteado amarillo y negro; el resto lo acomodó el optimizador.</span></div><button id="resetRot2">${icon("rotate")}Volver al plan automático</button></div>`;
  const lb=CutOptimizer.lowerBound(r.pieces,cfg);
  h+=`<div class="opt-bar"><div class="opt-status" id="optStatus" role="status" aria-live="polite"></div><button type="button" id="deepBtn" title="Busca durante unos ${DEEP_MS/1000} segundos un plan con menos tableros o mejor retazo">${icon("spark")}Optimizar a fondo</button></div>`;
  h+=`<div class="stats">
    <div class="stat"><b>${r.boards.length}</b><span>Tableros</span></div>
    <div class="stat"><b>${nPieces}</b><span>Piezas colocadas</span></div>
    <div class="stat"><b>${pct.toFixed(1)}%</b><span>Aprovechamiento</span></div>
    <div class="stat"><b>${((total-used)/1e6).toFixed(2)} m²</b><span>Desperdicio</span></div>
    <div class="stat"><b>${(used/1e6).toFixed(2)} m²</b><span>Superficie útil</span></div>
    ${edgeTotal>0?`<div class="stat"><b>${edgeTotal.toFixed(2)} m</b><span>Tapacanto</span></div>`:""}
    <div class="stat"><b>${cuts}</b><span>Cortes</span></div>
  </div>
  ${!r.unplaced.length&&r.boards.length?`<div class="hint lb-hint">${r.boards.length<=lb?`${icon("check")}Usa la menor cantidad de tableros posible: el mínimo teórico para estas piezas es ${lb}.`:`Mínimo teórico: ${lb} tablero${lb===1?"":"s"}. No siempre se puede alcanzar: depende de cómo combinan las medidas.`}</div>`:""}
  ${quoteHTML(r,edgeTotal,cuts)}
  <div class="toolbar">
    <button class="edit" id="editBtn">${icon("edit")}Editar piezas</button>
    <button id="print">${icon("print")}Imprimir / PDF</button>
    <button id="exportCsv">${icon("download")}Exportar cortes (CSV)</button>
    <button id="lbl" aria-pressed="${showLabels}">${icon("ruler")}${showLabels?"Ocultar":"Mostrar"} medidas</button>
    ${Object.keys(forced).length?`<button id="resetRot">${icon("rotate")}Deshacer giros (${Object.keys(forced).length})</button>`:""}
  </div>
  <div class="hint rotate-hint">Tocá una pieza del plano para girarla 90°: el plan se reacomoda solo.${cfg.grain?" Las piezas con veta ↔ o ↕ no se giran.":""}</div>`;
  if($("project").value)h=`<h2 style="margin-top:0">${esc($("project").value)}</h2>`+h;
  r.boards.forEach((b,i)=>{
    const u=b.placed.reduce((a,p)=>a+p.w*p.h,0);
    const manualHere=b.placed.filter(p=>forced[`${p.item.id}:${p.item.n}`]!=null).length;
    h+=`<div class="sheet${manualHere?" has-manual":""}"><h3><span>Tablero ${i+1}${manualHere?` <span class="badge-manual">${icon("alert")}${manualHere} a mano</span>`:""}</span> <small>${cfg.W} × ${cfg.H} mm · ${b.placed.length} piezas · ${(u/boardArea*100).toFixed(1)}% aprovechado</small></h3>
      ${boardSVG(b,cfg,i)}
      <div class="tablewrap"><table class="list"><caption class="sr-only">Piezas del tablero ${i+1}</caption><thead><tr><th scope="col">#</th><th scope="col">Pieza</th><th scope="col">${anyCut?"Final":"Medida"}</th>${anyCut?'<th scope="col">Corte</th>':""}${anyEdge?'<th scope="col">Canto</th>':""}<th scope="col">Posición (x,y)</th><th scope="col">Rotada</th></tr></thead><tbody>
      ${b.placed.map((p,j)=>`<tr><td>${j+1}</td><td><span class="sw" style="background:${p.item.color}"></span>${esc(p.item.name)}</td><td>${p.item.fw} × ${p.item.fh}</td>${anyCut?`<td>${p.item.w} × ${p.item.h}</td>`:""}${anyEdge?`<td class="edges">${edgeText(p.item.e)}</td>`:""}<td>${p.x+cfg.margin}, ${p.y+cfg.margin}</td><td>${p.rot?"↻ sí":"—"}${forced[`${p.item.id}:${p.item.n}`]!=null?" · a mano":""}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  });
  h+=`<div class="hint">Calculado en ${(r.ms/1000).toFixed(1).replace(".",",")} s</div>`;
  $("out").innerHTML=h;
  paintOptStatus();
  $("deepBtn").onclick=()=>{if(lastResult)startOptimize(lastResult.pieces,lastResult.cfg,DEEP_MS,true)};
  $("print").onclick=()=>window.print();
  $("exportCsv").onclick=exportCSV;
  $("lbl").onclick=()=>{showLabels=!showLabels;render(r);$("lbl").focus()};
  const reset=()=>{forced={};calculate({noScroll:true,msg:"Plan automático de nuevo"});$("lbl").focus()};
  if($("resetRot"))$("resetRot").onclick=reset;
  if($("resetRot2"))$("resetRot2").onclick=reset;
  $("editBtn").onclick=()=>{$("pieces-title").scrollIntoView({behavior:"smooth"});($("rows").querySelector(".n")||$("add")).focus({preventScroll:true})};
}
let showLabels=true;
function boardSVG(b,cfg,i){
  const pad=Math.max(cfg.W,cfg.H)*0.035, fs=Math.max(cfg.W,cfg.H)*0.018, hatch=`hatch-${i}`;
  // mm por píxel en pantalla, para que el ícono de giro mida ~22 px sea cual sea el tablero
  const mmPerPx=(cfg.W+pad*2)/Math.max(200,$("out").clientWidth-60);
  let s=`<svg viewBox="${-pad} ${-pad} ${cfg.W+pad*2} ${cfg.H+pad*2}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,monospace" role="group" aria-label="Tablero ${i+1}: ${b.placed.length} piezas">
    <defs><pattern id="${hatch}" width="${fs}" height="${fs}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="${fs}" stroke="var(--board-edge)" stroke-opacity=".25" stroke-width="${fs/4}"/></pattern></defs>
    <rect x="0" y="0" width="${cfg.W}" height="${cfg.H}" fill="var(--board)" stroke="var(--board-edge)" stroke-width="${fs/5}"/>
    <rect x="0" y="0" width="${cfg.W}" height="${cfg.H}" fill="url(#${hatch})"/>`;
  if(cfg.grain){
    for(let y=cfg.H/12;y<cfg.H;y+=cfg.H/12)s+=`<line x1="0" x2="${cfg.W}" y1="${y}" y2="${y}" stroke="var(--board-edge)" stroke-opacity=".15" stroke-width="${fs/6}"/>`;
  }
  if(cfg.margin)s+=`<rect x="${cfg.margin}" y="${cfg.margin}" width="${cfg.W-2*cfg.margin}" height="${cfg.H-2*cfg.margin}" fill="none" stroke="var(--board-edge)" stroke-dasharray="${fs/2}" stroke-width="${fs/8}"/>`;
  s+=`<text x="${cfg.W/2}" y="${-pad*0.3}" text-anchor="middle" font-size="${fs*1.1}" fill="var(--muted)">${cfg.W}</text>
      <text x="${-pad*0.3}" y="${cfg.H/2}" text-anchor="middle" font-size="${fs*1.1}" fill="var(--muted)" transform="rotate(-90 ${-pad*0.3} ${cfg.H/2})">${cfg.H}</text>`;
  for(const p of b.placed){
    const x=p.x+cfg.margin,y=p.y+cfg.margin;
    const it=p.item, key=`${it.id}:${it.n}`, locked=cfg.grain&&it.g;
    const desc=`${it.name} ${it.w}×${it.h}${p.rot?", rotada":""}${forced[key]!=null?", girada a mano":""}${locked?`, veta ${GRAIN_TXT[it.g]}`:""}`;
    s+=`<g class="piece${locked?" locked":""}" data-key="${key}" role="button" tabindex="0" aria-label="${esc(desc)}. ${locked?"No se puede girar por la veta":"Girar 90°"}">
      <title>${esc(desc)}${locked?"":" · clic para girar"}</title>
      <rect class="body" x="${x}" y="${y}" width="${p.w}" height="${p.h}" fill="${it.color}" fill-opacity=".85" stroke="#1d1b18" stroke-opacity=".6" stroke-width="${fs/8}"/>`;
    // la veta del tablero (horizontal) también se ve sobre cada pieza
    if(cfg.grain)for(let gy=y+fs*0.9;gy<y+p.h-fs*0.3;gy+=fs*0.9)s+=`<line x1="${x+fs*0.2}" x2="${x+p.w-fs*0.2}" y1="${gy}" y2="${gy}" stroke="#1d1b18" stroke-opacity=".14" stroke-width="${fs/7}" pointer-events="none"/>`;
    s+=edgeLines(p,x,y,fs);
    if(forced[key]!=null){
      const ox=x+fs*0.3, oy=y+fs*0.3, ow=Math.max(0,p.w-fs*0.6), oh=Math.max(0,p.h-fs*0.6);
      s+=`<rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="none" stroke="#1d1b18" stroke-width="${fs/2.5}" pointer-events="none"/>
        <rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="none" stroke="#f5b301" stroke-width="${fs/2.5}" stroke-dasharray="${fs*0.8} ${fs*0.5}" pointer-events="none"/>`;
    }
    // Etiqueta (nombre y medida de la pieza, sin importar el giro) e ícono de giro.
    // En piezas grandes el ícono va al centro, grande, con la etiqueta debajo;
    // en las chicas, en la esquina. La etiqueta va a lo largo del lado más largo.
    const cx=x+p.w/2, cy=y+p.h/2, canRotate=!locked&&it.w!==it.h;
    const vertical=p.h>p.w*1.15, len=vertical?p.h:p.w, thick=vertical?p.w:p.h;
    const chars=Math.max(it.name.length,`${it.w}×${it.h}`.length,6);
    const f=Math.min(fs,len*0.85/(chars*0.62),thick/3), hasLabel=showLabels&&f>fs*0.3;
    // alto que ocupa la etiqueta en pantalla (horizontal: 2 renglones; vertical: el texto)
    const labelExt=hasLabel?(vertical?chars*0.62*f:2.3*f):0;
    const bigSz=Math.min(48*mmPerPx,Math.max(30*mmPerPx,Math.min(p.w,p.h)*0.22));
    const gap=hasLabel?bigSz*0.25:0;
    const big=canRotate&&bigSz<=p.w*0.8&&bigSz+gap+labelExt<=p.h*0.9;
    const top=cy-(bigSz+gap+labelExt)/2;
    const labelCy=big?top+bigSz+gap+labelExt/2:cy;
    if(hasLabel){
      const tr=vertical?` transform="rotate(-90 ${cx} ${labelCy})"`:"";
      s+=`<g pointer-events="none"${tr}><text x="${cx}" y="${labelCy-f*0.2}" text-anchor="middle" font-size="${f}" font-weight="700" fill="#1d1b18">${esc(it.name)}</text>
            <text x="${cx}" y="${labelCy+f*1.0}" text-anchor="middle" font-size="${f*0.85}" fill="#1d1b18">${it.w}×${it.h}</text></g>`;
    }
    if(canRotate){
      let sz,ix,iy;
      if(big){sz=bigSz;ix=cx-sz/2;iy=top}
      else{sz=Math.min(22*mmPerPx,p.w*0.45,p.h*0.45);const ip=Math.min(5*mmPerPx,sz*0.25);ix=x+p.w-sz-ip;iy=y+ip}
      if(sz>=12*mmPerPx)s+=`<svg class="rot-ico${big?" big":""}" x="${ix}" y="${iy}" width="${sz}" height="${sz}" viewBox="0 0 24 24" pointer-events="none" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#fff" fill-opacity=".9"/><circle cx="12" cy="12" r="11.2" fill="none" stroke="#1d1b18" stroke-opacity=".35" stroke-width="1"/><path d="M18.5 12a6.5 6.5 0 1 1-1.9-4.6" fill="none" stroke="#1d1b18" stroke-width="2.4" stroke-linecap="round"/><path d="M17.6 3.8v4.3h-4.3" fill="none" stroke="#1d1b18" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    s+=`</g>`;
  }
  return s+"</svg>";
}
// Desglose del presupuesto; sólo aparece si se cargó algún precio
function quote(r,edgeTotal,cuts){
  const p=r.cfg.price;
  const lines=[
    {k:"pb",label:"Tableros",d:`${r.boards.length} × ${money(p.pb)}`,v:r.boards.length*p.pb},
    {k:"pe",label:"Tapacanto",d:`${edgeTotal.toFixed(2)} m × ${money(p.pe)}`,v:edgeTotal*p.pe},
    {k:"pc",label:"Cortes",d:`${cuts} × ${money(p.pc)}`,v:cuts*p.pc},
    {k:"po",label:"Otros costos",d:"",v:p.po},
  ].filter(l=>p[l.k]>0);
  const sub=lines.reduce((s,l)=>s+l.v,0), gain=sub*p.pg/100;
  return {lines,sub,gain,total:sub+gain,pct:p.pg};
}
function quoteHTML(r,edgeTotal,cuts){
  const q=quote(r,edgeTotal,cuts);
  r.total=q.lines.length?q.total:null;
  if(!q.lines.length)return "";
  return `<section class="quote" aria-labelledby="quote-title"><h3 id="quote-title">Presupuesto</h3>
    <table><thead class="sr-only"><tr><th scope="col">Concepto</th><th scope="col">Detalle</th><th scope="col" class="n">Importe</th></tr></thead><tbody>
    ${q.lines.map(l=>`<tr><td>${l.label}</td><td class="d">${l.d}</td><td class="n">${money(l.v)}</td></tr>`).join("")}
    ${q.pct>0?`<tr class="sub"><td>Subtotal</td><td></td><td class="n">${money(q.sub)}</td></tr><tr><td>Ganancia</td><td class="d">${q.pct}%</td><td class="n">${money(q.gain)}</td></tr>`:""}
    <tr class="total"><td>Total</td><td></td><td class="n">${money(q.total)}</td></tr>
    </tbody></table>
    ${r.unplaced.length?`<div class="hint">No incluye las ${r.unplaced.length} pieza(s) sin colocar.</div>`:""}</section>`;
}
// Lados con canto tal como quedan en el tablero: al rotar la pieza 90°,
// superior/inferior pasan a izquierda/derecha y viceversa.
function edgeLines(p,x,y,fs){
  const e=normEdges(p.item.e);
  if(e==="0000")return "";
  const on=i=>e[p.rot?[2,3,0,1][i]:i]==="1";
  const sw=fs/2.5, o=sw/2, L=[];
  if(on(0))L.push([x,y+o,x+p.w,y+o]);
  if(on(1))L.push([x,y+p.h-o,x+p.w,y+p.h-o]);
  if(on(2))L.push([x+o,y,x+o,y+p.h]);
  if(on(3))L.push([x+p.w-o,y,x+p.w-o,y+p.h]);
  return L.map(([a,b,c,d])=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#1d1b18" stroke-width="${sw}"/>`).join("");
}
const edgeText=e=>{const l=edgeList(normEdges(e));return l.length===4?"Todos":l.length?l.map(s=>s.name.slice(0,3)).join(", "):"—"};
// Evita que Excel/Sheets interprete un nombre como fórmula (CSV injection)
function csvCell(v){
  let s=String(v);
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return `"${s.replace(/"/g,'""')}"`;
}
function exportCSV(){
  if(!lastResult)return;
  const m=lastResult.cfg.margin;
  let csv="tablero,pieza,ancho_corte,alto_corte,ancho_final,alto_final,canto,canto_m,x,y,rotada,giro_manual\n";
  lastResult.boards.forEach((b,i)=>b.placed.forEach(p=>{
    const it=p.item, sides=edgeList(normEdges(it.e)).map(s=>s.k).join("");
    csv+=`${i+1},${csvCell(it.name)},${it.w},${it.h},${it.fw},${it.fh},${sides||"-"},${it.em.toFixed(3)},${p.x+m},${p.y+m},${p.rot?"si":"no"},${lastResult.cfg.force?.[`${it.id}:${it.n}`]!=null?"si":"no"}\n`;
  }));
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download=($("project").value||"plan-de-corte").replace(/[^\w-]+/g,"_")+".csv";a.click();
}

// ---------- eventos ----------
const EMPTY_HTML=$("out").innerHTML;
$("out").addEventListener("click",e=>{const g=e.target.closest(".piece");if(g)rotatePiece(g.dataset.key)});
$("out").addEventListener("keydown",e=>{
  const g=e.target.closest(".piece");
  if(g&&(e.key==="Enter"||e.key===" ")){e.preventDefault();rotatePiece(g.dataset.key)}
});
function showEmpty(){
  if(job){const my=job;job=null;stopWorker()}
  opt={state:"idle"};
  $("out").innerHTML=EMPTY_HTML;
  $("emptyAdd").onclick=()=>{addAndFocus();$("pieces-title").scrollIntoView({behavior:"smooth"})};
}
const addAndFocus=()=>{addRow();save();$("rows").lastElementChild.querySelector(".n").focus()};
$("add").onclick=addAndFocus;
$("projNew").innerHTML=icon("plus");$("projDup").innerHTML=icon("copy");$("projDel").innerHTML=icon("trash");
$("shareBtn").insertAdjacentHTML("afterbegin",icon("share"));
$("projSel").onchange=e=>switchProject(e.target.value);
$("projNew").onclick=newProject;
$("projDup").onclick=duplicateProject;
$("projDel").onclick=deleteProject;
$("resetBtn").onclick=()=>$("resetPop").hidden?openResetConfirm():closeResetConfirm();
$("resetCancel").onclick=()=>closeResetConfirm();
$("resetYes").onclick=resetProject;
$("resetBtn").insertAdjacentHTML("afterbegin",icon("reset"));
$("shareBtn").onclick=()=>$("sharePop").hidden?openShare():closeShare();
$("shareP").onchange=refreshShare;
$("shareCopy").onclick=copyShare;
$("shareClose").onclick=()=>closeShare();
$("shareNative").onclick=async()=>{
  try{await navigator.share({title:$("project").value||"Plan de corte",url:$("shareUrl").value})}catch(e){}
};
$("shareUrl").onfocus=e=>e.target.select();
$("calc").onclick=calculate;
["project","bw","bh","kerf","margin","maxb","grain","ct","cx",...PRICES].forEach(id=>$(id).addEventListener("input",()=>{save();validate()}));
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();closeEdgePop(false);calculate()}
  else if(e.key==="Escape"&&!$("edgePop").hidden){e.preventDefault();closeEdgePop()}
  else if(e.key==="Escape"&&!$("sharePop").hidden){e.preventDefault();closeShare()}
  else if(e.key==="Escape"&&!$("pieceTip").hidden){e.preventDefault();hideTip()}
  else if(e.key==="Escape"&&!$("resetPop").hidden){e.preventDefault();closeResetConfirm()}
});
$("edgePop").addEventListener("change",()=>{syncPopGlyph();applyPop()});
$("edgeAll").onclick=()=>{$("edgePop").querySelectorAll("input").forEach(c=>c.checked=true);syncPopGlyph();applyPop()};
$("edgeNone").onclick=()=>{$("edgePop").querySelectorAll("input").forEach(c=>c.checked=false);syncPopGlyph();applyPop()};
$("edgeOk").onclick=()=>closeEdgePop();
// cerrar al tocar fuera o al pasar el foco a otro lado
document.addEventListener("pointerdown",e=>{
  if(popBtn&&!$("edgePop").contains(e.target)&&!popBtn.contains(e.target))closeEdgePop(false);
  if(!$("sharePop").hidden&&!$("sharePop").contains(e.target)&&!$("shareBtn").contains(e.target))closeShare(false);
  if(!$("resetPop").hidden&&!$("resetPop").contains(e.target)&&!$("resetBtn").contains(e.target))closeResetConfirm(false);
});
$("edgePop").addEventListener("focusout",e=>{if(popBtn&&e.relatedTarget&&!$("edgePop").contains(e.relatedTarget)&&e.relatedTarget!==popBtn)closeEdgePop(false)});
// seguir al botón al hacer scroll o cuando el celular cambia el alto de la pantalla
addEventListener("resize",positionPop);
addEventListener("resize",placeTip);
addEventListener("scroll",placeTip,{passive:true,capture:true});
document.addEventListener("pointerdown",e=>{if(!$("pieceTip").hidden&&!e.target.closest(".piece"))hideTip()});
addEventListener("scroll",positionPop,{passive:true,capture:true});
load();
openShared();
addEventListener("hashchange",openShared);
