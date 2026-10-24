// Algoritmo actual de la app (copia exacta), como referencia para comparar.
var Baseline=(function(){
function orientations(w,h,g,grain){
  if(grain&&g==="w")return [[w,h,false]];
  if(grain&&g==="h")return [[h,w,true]];
  return w===h?[[w,h,false]]:[[w,h,false],[h,w,true]];
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
    // un giro elegido a mano en el plano manda sobre la elección del optimizador
    const forced=cfg.force?.[`${it.id}:${it.n}`];
    const orients=forced==null?orientations(it.w,it.h,it.g,cfg.grain):[forced?[it.h,it.w,true]:[it.w,it.h,false]];
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


return {optimize,pack,evaluate,orientations,SORTS,FITS,SPLITS};
})();
