// Métodos probados que no mejoraron los resultados (se guardan como referencia).
// Para usarlos hay que cargarlos después de optimizer.js; dependen de sus funciones internas.
// ---------- un solo tablero: elegir y acomodar las piezas que más valen ----------
// Búsqueda en haz con la misma estructura de 3 etapas (+ apilado), sin abrir tableros
// nuevos. avail[t] = copias disponibles, prof[t] = valor de cada copia.
function knapsack(P,avail,prof,B,fr,deadline){
  const BW=P.BW,BH=P.BH,k=P.k,T=P.T,nT=T.length;
  const FW=fr?BH:BW,FH=fr?BW:BH;
  const OW=new Float64Array(nT*2),OH=new Float64Array(nT*2),NO=new Int8Array(nT),AR=new Float64Array(nT);
  for(let t=0;t<nT;t++){NO[t]=T[t].ors.length;AR[t]=T[t].area;for(let o=0;o<NO[t];o++){OW[t*2+o]=fr?T[t].ors[o][1]:T[t].ors[o][0];OH[t*2+o]=fr?T[t].ors[o][0]:T[t].ors[o][1]}}
  const R=new Uint32Array(nT);let seed=0x2545f491;
  for(let t=0;t<nT;t++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;R[t]=seed>>>0}
  // nodo: [x1p,x1c,y2p,y2c,x3p,x3c,y4c,placedArea,profit,hash], rem, pasos
  let level=[{f:[0,0,0,0,0,0,0],area:0,profit:0,hash:0,rem:Int32Array.from(avail),steps:null,empty:true}];
  let best={profit:0,area:0,steps:null,f:[0,0,0,0,0,0,0]};
  const total=avail.reduce((a,b)=>a+b,0);
  for(let depth=0;depth<total&&level.length;depth++){
    if((depth&3)===0&&now()>deadline)break;
    const cand=[];
    for(const s of level){
      const [x1p,x1c,y2p,y2c,x3p,x3c,y4c]=s.f;
      for(let t=0;t<nT;t++){
        if(!s.rem[t])continue;
        for(let o=0;o<NO[t];o++){
          const w=OW[t*2+o],h=OH[t*2+o];
          if(s.empty){
            if(w<=FW+EPS&&h<=FH+EPS)cand.push({s,t,o,f:[0,w,0,h,0,w,h],x:0,y:0});
            continue;
          }
          if(x3c+k+w<=FW+EPS&&y2p+h<=FH+EPS){const n3p=x3c+k,n3c=n3p+w;cand.push({s,t,o,x:n3p,y:y2p,f:[x1p,Math.max(x1c,n3c),y2p,Math.max(y2c,y2p+h),n3p,n3c,y2p+h]})}
          if(y2c+k+h<=FH+EPS&&x1p+w<=FW+EPS){const n2p=y2c+k;cand.push({s,t,o,x:x1p,y:n2p,f:[x1p,Math.max(x1c,x1p+w),n2p,n2p+h,x1p,x1p+w,n2p+h]})}
          if(x1c+k+w<=FW+EPS&&h<=FH+EPS){const n1p=x1c+k;cand.push({s,t,o,x:n1p,y:0,f:[n1p,n1p+w,0,h,n1p,n1p+w,h]})}
          if(w<=x3c-x3p+EPS&&y4c+k+h<=y2c+EPS)cand.push({s,t,o,x:x3p,y:y4c+k,f:[x1p,x1c,y2p,y2c,x3p,x3c,y4c+k+h]});
        }
      }
    }
    if(!cand.length)break;
    for(const c of cand){
      const [n1p,n1c,n2p,n2c,n3p,n3c,n4c]=c.f;
      const cov=n1p*FH+(n1c-n1p)*n2p+(n3p-n1p)*(n2c-n2p)+(n3c-n3p)*(n4c-n2p);
      c.profit=c.s.profit+prof[c.t];c.area=c.s.area+AR[c.t];
      c.g=cov/c.profit; // área comprometida por unidad de valor
    }
    cand.sort((a,b)=>a.g-b.g);
    const next=[],seen=new Set();
    for(const c of cand){
      if(next.length>=B)break;
      const hash=(c.s.hash+R[c.t])>>>0;
      const key=c.f.map(v=>Math.round(v*16)).join(",")+"|"+hash;
      if(seen.has(key))continue;seen.add(key);
      const rem=c.s.rem.slice();rem[c.t]--;
      const node={f:c.f,area:c.area,profit:c.profit,hash,rem,steps:{t:c.t,o:c.o,x:c.x,y:c.y,prev:c.s.steps},empty:false};
      next.push(node);
      if(node.profit>best.profit+1e-9||(Math.abs(node.profit-best.profit)<=1e-9&&node.f[1]<best.f[1]))best=node;
    }
    level=next;
  }
  const steps=[];for(let st=best.steps;st;st=st.prev)steps.push({t:st.t,o:st.o,x:st.x,y:st.y,fr});
  steps.reverse();
  return {steps,area:best.area,profit:best.profit};
}

// ---------- corrección secuencial de valores (SVC) ----------
// Se arman los tableros de a uno, cada uno con las piezas de más valor que entren.
// Después de cada vuelta, las piezas que terminaron en tableros con mucho desperdicio
// (las "difíciles") valen más, así la vuelta siguiente las acomoda antes.
function svc(P,prep,deadline,opts={}){
  const T=P.T,nT=T.length,BA=P.BW*P.BH;
  const demand=T.map(t=>t.count);
  let prof=T.map(t=>Math.pow(t.area,1.1));
  let best=null,iter=0;
  const Bs=opts.svcBeams||[8,16,32,64];
  while(now()<deadline){
    const B=Bs[Math.min(Bs.length-1,Math.floor(iter/2))];
    const rem=demand.slice(),bins=[],adj=new Float64Array(nT);
    let ok=true;
    while(rem.some(c=>c>0)){
      if(now()>deadline){ok=false;break}
      let pat=null;
      for(const fr of [0,1]){
        const r=knapsack(P,rem,prof,B,fr,deadline);
        if(r.steps.length&&(!pat||r.profit>pat.profit))pat=r;
      }
      if(!pat){ok=false;break}
      const used=pat.area,waste=BA-used;
      const cnt=new Map();for(const st of pat.steps){rem[st.t]--;cnt.set(st.t,(cnt.get(st.t)||0)+1)}
      for(const [t,n] of cnt)adj[t]+=n*T[t].area*(1+waste/used);
      bins.push(pat);
      if(best&&bins.length>=best.bins.length&&rem.some(c=>c>0)){ok=false;break} // ya no puede mejorar
    }
    if(ok&&(!best||bins.length<best.bins.length))best={bins,iter};
    for(let t=0;t<nT;t++)prof[t]=0.5*prof[t]+0.5*(adj[t]>0?adj[t]/demand[t]:prof[t]*1.5);
    iter++;
  }
  if(!best)return null;
  // pasos con número de tablero; el tablero menos lleno al final
  best.bins.sort((a,b)=>b.area-a.area);
  const steps=[];best.bins.forEach((b,bi)=>{for(const st of b.steps)steps.push({...st,bin:bi})});
  return {bins:best.bins.length,steps,iters:iter};
}

// ---------- fase de mejora: vaciar el tablero más vacío ----------
// Se toman el tablero menos lleno y 1–2 tableros más, se juntan sus piezas y se
// vuelven a acomodar con la búsqueda en haz. Si entran en menos tableros, se gana
// uno; si no, se acepta el reparto que deja el tablero más vacío todavía más vacío.
function improve(sol,prep,cfg,deadline,seed){
  const typeOf=new Map();
  prep.types.forEach((tp,ti)=>{for(const n of tp.ns)typeOf.set(tp.piece.id+":"+n,ti)});
  const area=b=>b.placed.reduce((s,p)=>s+p.w*p.h,0);
  let boards=sol.boards.map(b=>({placed:b.placed,area:area(b)}));
  let r=seed>>>0||1;
  const rnd=()=>{r^=r<<13;r^=r>>>17;r^=r<<5;return (r>>>0)/4294967296};
  let tries=0,gains=0;
  while(boards.length>1&&now()<deadline){
    tries++;
    const order=boards.map((b,i)=>i).sort((a,b)=>boards[a].area-boards[b].area);
    const e=order[0];
    const m=Math.min(boards.length,rnd()<0.6?2:3);
    const pickSet=new Set([e]);
    while(pickSet.size<m){
      // preferir tableros poco llenos, pero con algo de azar
      const j=order[Math.min(order.length-1,1+Math.floor(Math.pow(rnd(),1.5)*(order.length-1)))];
      pickSet.add(j);
      if(pickSet.size<m&&rnd()<0.3)pickSet.add(order[Math.floor(rnd()*order.length)]);
    }
    const picked=[...pickSet];
    // subproblema con las piezas de esos tableros
    const counts=new Map();
    for(const bi of picked)for(const p of boards[bi].placed){const ti=typeOf.get(p.item.id+":"+p.item.n);counts.set(ti,(counts.get(ti)||0)+1)}
    const tis=[...counts.keys()];
    const Psub={BW:prep.uw,BH:prep.uh,k:cfg.kerf,T:tis.map(ti=>({count:counts.get(ti),area:prep.types[ti].area,ors:prep.types[ti].ors}))};
    const nItems=tis.reduce((s,ti)=>s+counts.get(ti),0);
    const Bsub=nItems>60?32:nItems>30?64:128;
    const node=beam(Psub,Bsub,deadline,{});
    if(!node)break;
    const before=picked.map(bi=>boards[bi].area).sort((a,b)=>a-b);
    // armar los tableros nuevos reutilizando los números de copia de las piezas sacadas
    const pool=new Map();
    for(const bi of picked)for(const p of boards[bi].placed){const ti=typeOf.get(p.item.id+":"+p.item.n);if(!pool.has(ti))pool.set(ti,[]);pool.get(ti).push(p.item)}
    const nb=[];
    for(const st of node.steps){
      const ti=tis[st.t],o=Psub.T[st.t].ors[st.o];
      while(nb.length<=st.bin)nb.push({placed:[],area:0});
      let x=st.x,y=st.y;if(st.fr){[x,y]=[y,x]}
      const item=pool.get(ti).pop();
      nb[st.bin].placed.push({x,y,w:o[0],h:o[1],rot:o[2],item});
      nb[st.bin].area+=o[0]*o[1];
    }
    const after=nb.map(b=>b.area).sort((a,b)=>a-b);
    const better=nb.length<picked.length||(nb.length===picked.length&&after[0]<before[0]-1e-6);
    if(better){
      if(nb.length<picked.length)gains++;
      boards=boards.filter((b,i)=>!pickSet.has(i)).concat(nb);
    }
  }
  // el tablero más vacío al final (es el que deja el retazo)
  boards.sort((a,b)=>b.area-a.area);
  return {boards:boards.map(b=>({placed:b.placed})),unplaced:sol.unplaced.slice(),tries,gains};
}

// ---------- recombinación de tableros (experimental) ----------
// Junta los tableros de todos los planes encontrados, elige primero los más llenos
// sin repetir piezas y acomoda lo que sobra con la búsqueda en haz.
function patternOf(steps,binIdx){return steps.filter(st=>st.bin===binIdx)}
function recombine(P,pool,deadline,seed){
  const nT=P.T.length,demand=P.T.map(t=>t.count);
  const pats=[...pool.values()].sort((a,b)=>b.area-a.area);
  let r=seed>>>0||7;const rnd=()=>{r^=r<<13;r^=r>>>17;r^=r<<5;return (r>>>0)/4294967296};
  let best=null;
  for(let it=0;now()<deadline;it++){
    const rem=demand.slice(),chosen=[];
    // orden por llenado con algo de azar en las vueltas siguientes
    const order=it===0?pats:pats.map(p=>({p,k:p.area*(1-0.15*rnd())})).sort((a,b)=>b.k-a.k).map(x=>x.p);
    for(const pt of order){
      let fits=true;for(const [t,c] of pt.counts)if(rem[t]<c){fits=false;break}
      if(!fits)continue;
      for(const [t,c] of pt.counts)rem[t]-=c;
      chosen.push(pt);
    }
    const left=rem.reduce((a,b)=>a+b,0);
    let restSteps=[],restBins=0;
    if(left){
      const tis=[];for(let t=0;t<nT;t++)if(rem[t])tis.push(t);
      const Ps={BW:P.BW,BH:P.BH,k:P.k,T:tis.map(t=>({count:rem[t],area:P.T[t].area,ors:P.T[t].ors}))};
      const node=beam(Ps,left>60?16:64,deadline,{guide:4,lbTerm:false});
      if(!node||node.pruned)break;
      restBins=node.bins;restSteps=node.steps.map(st=>({...st,t:tis[st.t]}));
    }
    const total=chosen.length+restBins;
    if(!best||total<best.bins){
      const steps=[];chosen.forEach((pt,bi)=>{for(const st of pt.steps)steps.push({...st,bin:bi})});
      for(const st of restSteps)steps.push({...st,bin:st.bin+chosen.length});
      best={bins:total,steps};
    }
    if(it>200)break;
  }
  return best;
}
function addToPool(pool,node,P){
  const byBin=new Map();
  for(const st of node.steps){if(!byBin.has(st.bin))byBin.set(st.bin,[]);byBin.get(st.bin).push(st)}
  for(const steps of byBin.values()){
    const cnt=new Map();let area=0;
    for(const st of steps){cnt.set(st.t,(cnt.get(st.t)||0)+1);area+=P.T[st.t].area}
    const key=[...cnt].sort((a,b)=>a[0]-b[0]).map(x=>x.join(":")).join(",");
    const prev=pool.get(key);
    if(!prev)pool.set(key,{counts:[...cnt],area,steps:steps.map(st=>({t:st.t,o:st.o,x:st.x,y:st.y,fr:st.fr}))});
  }
}

