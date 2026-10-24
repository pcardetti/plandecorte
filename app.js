const COLORS=["#e07a5f","#3d8eb9","#81b29a","#f2cc8f","#9c6ade","#e9a03b","#5bb5a2","#d16ba5","#7a9e3d","#c97b4a","#4f7cac","#b5838d"];
const $=id=>document.getElementById(id);
const STORE="plandecorte:v2";

const ICONS={
  print:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  ruler:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const isMobile=()=>matchMedia("(max-width:860px)").matches;

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
// Texto del CSV de importación: "T" = todos, o letras S I Z D
function parseEdges(s){
  s=String(s||"").toUpperCase().replace(/\s+/g,"");
  if(s==="T"||s==="TODOS"||s==="4")return "1111";
  return SIDES.map(x=>s.includes(x.k)?"1":"0").join("");
}
let popBtn=null;
function openEdgePop(btn){
  const pop=$("edgePop"), e=btn.dataset.e;
  popBtn=btn;
  pop.querySelectorAll("input").forEach(c=>c.checked=e[+c.dataset.i]==="1");
  syncPopGlyph();
  pop.hidden=false;
  positionPop();
  btn.setAttribute("aria-expanded","true");
  pop.querySelector("input").focus({preventScroll:true});
}
function positionPop(){
  const pop=$("edgePop");
  if(!popBtn||pop.hidden)return;
  const r=popBtn.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight;
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
function addRow(p={name:"",w:"",h:"",q:1,g:false,e:"0000"},before=null){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><span class="sw"></span></td>
    <td><input type="text" class="n" value="${esc(p.name)}" placeholder="Pieza" autocomplete="off"></td>
    <td><input type="number" class="w" value="${esc(p.w)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td><input type="number" class="h" value="${esc(p.h)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td><input type="number" class="q" value="${esc(p.q)}" min="1" inputmode="numeric" aria-describedby="rows-err"></td>
    <td class="c"><input type="checkbox" class="g" ${p.g?"checked":""}></td>
    <td class="c"><button type="button" class="edge" aria-haspopup="dialog" aria-expanded="false" aria-controls="edgePop"></button></td>
    <td><button class="x">×</button></td>`;
  tr.querySelector(".x").onclick=()=>removeRow(tr);
  const eb=tr.querySelector(".edge");
  eb.dataset.e=normEdges(p.e);
  eb.onclick=()=>popBtn===eb?closeEdgePop():openEdgePop(eb);
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
  return {name:tr.querySelector(".n").value,w:tr.querySelector(".w").value,h:tr.querySelector(".h").value,q:tr.querySelector(".q").value,g:tr.querySelector(".g").checked,e:tr.querySelector(".edge").dataset.e};
}
function refreshRows(){
  [...$("rows").children].forEach((tr,i)=>{
    const n=i+1;
    tr.querySelector(".sw").style.background=COLORS[i%COLORS.length];
    tr.querySelector(".n").setAttribute("aria-label",`Nombre de la pieza ${n}`);
    tr.querySelector(".w").setAttribute("aria-label",`Ancho de la pieza ${n} en mm`);
    tr.querySelector(".h").setAttribute("aria-label",`Alto de la pieza ${n} en mm`);
    tr.querySelector(".q").setAttribute("aria-label",`Cantidad de la pieza ${n}`);
    tr.querySelector(".g").setAttribute("aria-label",`Respetar veta en la pieza ${n}`);
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
        const fits=(c.w<=uw&&c.h<=uh)||(!(grain&&d.g)&&c.h<=uw&&c.w<=uh);
        if(!fits){wErr=hErr=true;msg=`${label} (${w}×${h}) no entra en el tablero${grain&&d.g?" respetando la veta":""}`}
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
      g:tr.querySelector(".g").checked, color:COLORS[i%COLORS.length], id:i
    };
  }).filter(p=>p.fw>0&&p.fh>0&&p.w>0&&p.h>0);
}
function readCfg(){
  return {W:+$("bw").value,H:+$("bh").value,kerf:Math.max(0,+$("kerf").value||0),
    margin:Math.max(0,+$("margin").value||0),maxB:parseInt($("maxb").value)||Infinity,grain:$("grain").checked,
    ct:Math.max(0,+$("ct").value||0),cx:Math.max(0,+$("cx").value||0),
    price:Object.fromEntries(PRICES.map(k=>[k,Math.max(0,+$(k).value||0)]))};
}
function save(){
  try{localStorage.setItem(STORE,JSON.stringify({project:$("project").value,cfg:{bw:$("bw").value,bh:$("bh").value,kerf:$("kerf").value,margin:$("margin").value,maxb:$("maxb").value,grain:$("grain").checked,ct:$("ct").value,cx:$("cx").value,...Object.fromEntries(PRICES.map(k=>[k,$(k).value]))},
    rows:[...$("rows").children].map(rowData)}))}catch(e){}
}
function load(){
  let s=null;try{s=JSON.parse(localStorage.getItem(STORE))}catch(e){}
  if(s&&typeof s==="object"){
    const cfg=s.cfg||{};
    $("project").value=s.project||"";
    for(const k of ["bw","bh","kerf","margin","maxb","ct","cx",...PRICES])if(cfg[k]!=null)$(k).value=cfg[k];
    if(PRICES.some(k=>+cfg[k]>0))$("budget").open=true;
    $("grain").checked=!!cfg.grain;
    if(Array.isArray(s.rows))s.rows.forEach(r=>addRow({name:"",w:"",h:"",q:1,g:false,e:"0000",...r}));
  }
}

// ---------- algoritmo: FFD + guillotina ----------
// Cada tablero mantiene una lista de rectángulos libres. Al colocar una pieza
// en un rectángulo libre se divide en dos (derecha y abajo) dejando el kerf.
function pack(pieces,cfg,sortFn,fitRule,splitRule){
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  const items=[];
  for(const p of pieces)for(let k=0;k<p.q;k++)items.push({...p,n:k+1});
  items.sort(sortFn);
  const boards=[], unplaced=[];
  const newBoard=()=>({free:[{x:0,y:0,w:uw,h:uh}],placed:[],cuts:0});
  for(const it of items){
    const canRot=!(cfg.grain&&it.g);
    const orients=[[it.w,it.h,false]];
    if(canRot&&it.w!==it.h)orients.push([it.h,it.w,true]);
    let best=null;
    const tryBoard=(b,bi)=>{
      b.free.forEach((f,fi)=>{
        for(const [w,h,rot] of orients){
          if(w<=f.w&&h<=f.h){
            const score=fitRule(f,w,h);
            if(!best||score<best.score)best={bi,fi,w,h,rot,score};
          }
        }
      });
    };
    boards.forEach(tryBoard);
    if(!best){
      if(boards.length>=cfg.maxB||!orients.some(([w,h])=>w<=uw&&h<=uh)){unplaced.push(it);continue}
      boards.push(newBoard());tryBoard(boards[boards.length-1],boards.length-1);
    }
    const b=boards[best.bi], f=b.free[best.fi];
    b.placed.push({x:f.x,y:f.y,w:best.w,h:best.h,rot:best.rot,item:it});
    // un corte por cada lado de la pieza que no coincide con el borde del espacio libre
    b.cuts+=(f.w>best.w)+(f.h>best.h);
    b.free.splice(best.fi,1);
    const k=cfg.kerf, rw=f.w-best.w-k, rh=f.h-best.h-k;
    // Dos formas de cortar con guillotina el sobrante en L
    const horiz=splitRule(f,best.w,best.h);
    let A,B;
    if(horiz){ // corte horizontal completo primero
      A={x:f.x+best.w+k,y:f.y,w:rw,h:best.h};
      B={x:f.x,y:f.y+best.h+k,w:f.w,h:rh};
    }else{     // corte vertical completo primero
      A={x:f.x+best.w+k,y:f.y,w:rw,h:f.h};
      B={x:f.x,y:f.y+best.h+k,w:best.w,h:rh};
    }
    for(const r of [A,B])if(r.w>0&&r.h>0)b.free.push(r);
  }
  return {boards,unplaced};
}
const SORTS={
  area:(a,b)=>b.w*b.h-a.w*a.h,
  maxSide:(a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h,
  height:(a,b)=>b.h-a.h||b.w-a.w,
  width:(a,b)=>b.w-a.w||b.h-a.h,
  perim:(a,b)=>(b.w+b.h)-(a.w+a.h),
};
const FITS={
  bssf:(f,w,h)=>Math.min(f.w-w,f.h-h)*1e6+Math.max(f.w-w,f.h-h),
  blsf:(f,w,h)=>Math.max(f.w-w,f.h-h)*1e6+Math.min(f.w-w,f.h-h),
  baf:(f,w,h)=>(f.w*f.h-w*h)*10+Math.min(f.w-w,f.h-h)/1e3,
  bl:(f,w,h)=>f.y*1e6+f.x,
};
const SPLITS={
  shorterLeftover:(f,w,h)=>(f.w-w)<(f.h-h),
  longerLeftover:(f,w,h)=>(f.w-w)>=(f.h-h),
  shorterAxis:(f,w,h)=>f.w<f.h,
  longerAxis:(f,w,h)=>f.w>=f.h,
};
function evaluate(r){
  // Menos sin colocar, menos tableros, y el último tablero lo más vacío posible
  // (concentra el sobrante en un retal aprovechable).
  const last=r.boards[r.boards.length-1];
  const lastFill=last?last.placed.reduce((s,p)=>s+p.w*p.h,0):0;
  return r.unplaced.length*1e15+r.boards.length*1e12+lastFill;
}
function optimize(pieces,cfg){
  let best=null;
  for(const s in SORTS)for(const f in FITS)for(const sp in SPLITS){
    const r=pack(pieces,cfg,SORTS[s],FITS[f],SPLITS[sp]);
    r.score=evaluate(r);r.algo=`${s}/${f}/${sp}`;
    if(!best||r.score<best.score)best=r;
  }
  return best;
}

// ---------- render ----------
let lastResult=null;
function calculate(){
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
  const t0=performance.now();
  const r=optimize(pieces,cfg);
  r.ms=performance.now()-t0;r.cfg=cfg;r.pieces=pieces;
  lastResult=r;render(r);save();
  const used=r.boards.reduce((s,b)=>s+b.placed.reduce((a,p)=>a+p.w*p.h,0),0);
  const pct=r.boards.length?used/(r.boards.length*cfg.W*cfg.H)*100:0;
  toast(`Plan listo: ${r.boards.length} tablero${r.boards.length===1?"":"s"}, ${pct.toFixed(1)}% de aprovechamiento${r.total!=null?` · total ${money(r.total)}`:""}${r.unplaced.length?` · ${r.unplaced.length} sin colocar`:""}.`,{type:r.unplaced.length?"error":"info",timeout:4000});
  // en el celular el resultado queda debajo del formulario: llevar al usuario hasta él
  // (el foco va primero y el scroll en el frame siguiente; si no, Chrome cancela el scroll suave)
  if(isMobile()){$("out").focus({preventScroll:true});requestAnimationFrame(()=>$("out").scrollIntoView({behavior:"smooth",block:"start"}))}
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
  h+=`<div class="stats">
    <div class="stat"><b>${r.boards.length}</b><span>Tableros</span></div>
    <div class="stat"><b>${nPieces}</b><span>Piezas colocadas</span></div>
    <div class="stat"><b>${pct.toFixed(1)}%</b><span>Aprovechamiento</span></div>
    <div class="stat"><b>${((total-used)/1e6).toFixed(2)} m²</b><span>Desperdicio</span></div>
    <div class="stat"><b>${(used/1e6).toFixed(2)} m²</b><span>Superficie útil</span></div>
    ${edgeTotal>0?`<div class="stat"><b>${edgeTotal.toFixed(2)} m</b><span>Tapacanto</span></div>`:""}
    <div class="stat"><b>${cuts}</b><span>Cortes</span></div>
  </div>
  ${quoteHTML(r,edgeTotal,cuts)}
  <div class="toolbar">
    <button class="edit" id="editBtn">${icon("edit")}Editar piezas</button>
    <button id="print">${icon("print")}Imprimir / PDF</button>
    <button id="exportCsv">${icon("download")}Exportar cortes (CSV)</button>
    <button id="lbl" aria-pressed="${showLabels}">${icon("ruler")}${showLabels?"Ocultar":"Mostrar"} medidas</button>
  </div>`;
  if($("project").value)h=`<h2 style="margin-top:0">${esc($("project").value)}</h2>`+h;
  r.boards.forEach((b,i)=>{
    const u=b.placed.reduce((a,p)=>a+p.w*p.h,0);
    h+=`<div class="sheet"><h3>Tablero ${i+1} <small>${cfg.W} × ${cfg.H} mm · ${b.placed.length} piezas · ${(u/boardArea*100).toFixed(1)}% aprovechado</small></h3>
      ${boardSVG(b,cfg,i)}
      <div class="tablewrap"><table class="list"><caption class="sr-only">Piezas del tablero ${i+1}</caption><thead><tr><th scope="col">#</th><th scope="col">Pieza</th><th scope="col">${anyCut?"Final":"Medida"}</th>${anyCut?'<th scope="col">Corte</th>':""}${anyEdge?'<th scope="col">Canto</th>':""}<th scope="col">Posición (x,y)</th><th scope="col">Rotada</th></tr></thead><tbody>
      ${b.placed.map((p,j)=>`<tr><td>${j+1}</td><td><span class="sw" style="background:${p.item.color}"></span>${esc(p.item.name)}</td><td>${p.item.fw} × ${p.item.fh}</td>${anyCut?`<td>${p.item.w} × ${p.item.h}</td>`:""}${anyEdge?`<td class="edges">${edgeText(p.item.e)}</td>`:""}<td>${p.x+cfg.margin}, ${p.y+cfg.margin}</td><td>${p.rot?"↻ sí":"—"}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  });
  h+=`<div class="hint">Calculado en ${r.ms.toFixed(0)} ms · mejor estrategia: ${r.algo}</div>`;
  $("out").innerHTML=h;
  $("print").onclick=()=>window.print();
  $("exportCsv").onclick=exportCSV;
  $("lbl").onclick=()=>{showLabels=!showLabels;render(r);$("lbl").focus()};
  $("editBtn").onclick=()=>{$("pieces-title").scrollIntoView({behavior:"smooth"});($("rows").querySelector(".n")||$("add")).focus({preventScroll:true})};
}
let showLabels=true;
function boardSVG(b,cfg,i){
  const pad=Math.max(cfg.W,cfg.H)*0.035, fs=Math.max(cfg.W,cfg.H)*0.018, hatch=`hatch-${i}`;
  let s=`<svg viewBox="${-pad} ${-pad} ${cfg.W+pad*2} ${cfg.H+pad*2}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,monospace" role="img" aria-label="Tablero ${i+1}: ${b.placed.length} piezas">
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
    s+=`<g><title>${esc(p.item.name)} ${p.item.w}×${p.item.h}${p.rot?" (rotada)":""}</title>
      <rect x="${x}" y="${y}" width="${p.w}" height="${p.h}" fill="${p.item.color}" fill-opacity=".85" stroke="#1d1b18" stroke-opacity=".6" stroke-width="${fs/8}"/>`;
    s+=edgeLines(p,x,y,fs);
    if(showLabels){
      const f=Math.min(fs,p.w/7,p.h/3);
      if(f>fs*0.35){
        s+=`<text x="${x+p.w/2}" y="${y+p.h/2-f*0.2}" text-anchor="middle" font-size="${f}" font-weight="700" fill="#1d1b18">${esc(p.item.name)}${p.rot?" ↻":""}</text>
            <text x="${x+p.w/2}" y="${y+p.h/2+f*1.0}" text-anchor="middle" font-size="${f*0.85}" fill="#1d1b18">${p.w}×${p.h}</text>`;
      }
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
  let csv="tablero,pieza,ancho_corte,alto_corte,ancho_final,alto_final,canto,canto_m,x,y,rotada\n";
  lastResult.boards.forEach((b,i)=>b.placed.forEach(p=>{
    const it=p.item, sides=edgeList(normEdges(it.e)).map(s=>s.k).join("");
    csv+=`${i+1},${csvCell(it.name)},${it.w},${it.h},${it.fw},${it.fh},${sides||"-"},${it.em.toFixed(3)},${p.x+m},${p.y+m},${p.rot?"si":"no"}\n`;
  }));
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download=($("project").value||"plan-de-corte").replace(/[^\w-]+/g,"_")+".csv";a.click();
}

// ---------- eventos ----------
const addAndFocus=()=>{addRow();save();$("rows").lastElementChild.querySelector(".n").focus()};
$("add").onclick=addAndFocus;
$("emptyAdd").onclick=()=>{addAndFocus();$("pieces-title").scrollIntoView({behavior:"smooth"})};
$("calc").onclick=calculate;
$("importBtn").onclick=()=>{
  const lines=$("csv").value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length){toast("Pegá al menos una línea en el cuadro de CSV.",{type:"error"});$("csv").focus();return}
  let n=0;
  for(const l of lines){
    const c=l.split(/[;,\t]/).map(s=>s.trim());
    if(c.length<3||!(+c[1]>0)||!(+c[2]>0))continue;
    addRow({name:c[0],w:+c[1],h:+c[2],q:parseInt(c[3])||1,g:/^(1|si|sí|true|v)$/i.test(c[4]||""),e:parseEdges(c[5])});n++;
  }
  const skipped=lines.length-n;
  if(!n){toast("No se encontró ninguna línea válida. Formato: nombre,ancho,alto,cantidad",{type:"error",timeout:7000});return}
  $("csv").value="";save();validate();
  toast(`Se importaron ${n} pieza${n===1?"":"s"}${skipped?` · ${skipped} línea${skipped===1?"":"s"} ignorada${skipped===1?"":"s"}`:""}.`,{type:skipped?"error":"info"});
};
["project","bw","bh","kerf","margin","maxb","grain","ct","cx",...PRICES].forEach(id=>$(id).addEventListener("input",()=>{save();validate()}));
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();closeEdgePop(false);calculate()}
  else if(e.key==="Escape"&&!$("edgePop").hidden){e.preventDefault();closeEdgePop()}
});
$("edgePop").addEventListener("change",()=>{syncPopGlyph();applyPop()});
$("edgeAll").onclick=()=>{$("edgePop").querySelectorAll("input").forEach(c=>c.checked=true);syncPopGlyph();applyPop()};
$("edgeNone").onclick=()=>{$("edgePop").querySelectorAll("input").forEach(c=>c.checked=false);syncPopGlyph();applyPop()};
$("edgeOk").onclick=()=>closeEdgePop();
// cerrar al tocar fuera o al pasar el foco a otro lado
document.addEventListener("pointerdown",e=>{if(popBtn&&!$("edgePop").contains(e.target)&&!popBtn.contains(e.target))closeEdgePop(false)});
$("edgePop").addEventListener("focusout",e=>{if(popBtn&&e.relatedTarget&&!$("edgePop").contains(e.relatedTarget)&&e.relatedTarget!==popBtn)closeEdgePop(false)});
// seguir al botón al hacer scroll o cuando el celular cambia el alto de la pantalla
addEventListener("resize",positionPop);
addEventListener("scroll",positionPop,{passive:true,capture:true});
load();validate();
