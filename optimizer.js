// Optimizador de corte guillotina para plandecorte.
// Funciona igual en la página, en un Web Worker y en la terminal (jsc).
//
// Método: búsqueda en haz iterativa (como PackingSolver, ROADEF/EURO 2018) sobre planes
// de corte guillotina por etapas: tiras de lado a lado → bloques → huecos → piezas
// apiladas, con kerf, márgenes, veta y giros forzados. Cada tablero elige el sentido
// de sus tiras. Compite con el método voraz anterior y gana el plan con menos
// tableros y, a igualdad, el retazo más grande en el último tablero.
// Resultado de referencia (lab/official_run.js): 7034 tableros en las 500 instancias
// clásicas (clases I–X) con 1 s por instancia y 7025 con 5 s, contra 7131 del método
// anterior (CHBP 7064, SVCRG 7035, récord publicado 6980).
(function(G){
"use strict";
const EPS=1e-7;
const now=()=>(typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();

// ---------- piezas y orientaciones ----------
function allowedOrients(p,n,cfg){
  const f=cfg.force?cfg.force[`${p.id}:${n}`]:undefined;
  if(f!=null)return [f?[p.h,p.w,true]:[p.w,p.h,false]];
  if(cfg.grain&&p.g==="w")return [[p.w,p.h,false]];
  if(cfg.grain&&p.g==="h")return [[p.h,p.w,true]];
  return p.w===p.h?[[p.w,p.h,false]]:[[p.w,p.h,false],[p.h,p.w,true]];
}
// Agrupa las copias de cada pieza en "tipos" con las mismas orientaciones permitidas.
function prepare(pieces,cfg){
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  const types=[], unplaced=[];
  for(const p of pieces){
    const groups=new Map();
    for(let n=1;n<=p.q;n++){
      const ors=allowedOrients(p,n,cfg).filter(o=>o[0]<=uw+EPS&&o[1]<=uh+EPS);
      if(!ors.length){unplaced.push({...p,n});continue}
      const key=ors.map(o=>o[2]?"r":"n").join("");
      let g=groups.get(key);
      if(!g){g={piece:p,ors,ns:[]};groups.set(key,g)}
      g.ns.push(n);
    }
    for(const g of groups.values())types.push({piece:g.piece,ors:g.ors,ns:g.ns,count:g.ns.length,area:g.piece.w*g.piece.h});
  }
  return {uw,uh,types,unplaced};
}

// ---------- búsqueda en haz sobre planes guillotina por etapas ----------
// Las piezas se agregan de a una. Cada tablero tiene un "marco" (fr): con fr=0 las tiras
// son verticales y con fr=1 horizontales (las coordenadas del marco van traspuestas).
// Estado del tablero abierto, en su marco: x1p..x1c = tira actual; y2p..y2c = bloque
// actual dentro de la tira; x3p..x3c = hueco actual dentro del bloque; y4c = tope de
// las piezas apiladas en ese hueco. Un nivel del haz = misma cantidad de piezas puestas.
function selectTop(idx,n,key,m){
  // deja en idx[0..m) los m menores según key (quickselect), sin ordenar
  let lo=0,hi=n-1;
  while(hi>lo){
    const pv=key[idx[(lo+hi)>>1]];let i=lo,j=hi;
    while(i<=j){while(key[idx[i]]<pv)i++;while(key[idx[j]]>pv)j--;if(i<=j){const t=idx[i];idx[i]=idx[j];idx[j]=t;i++;j--}}
    if(m-1<=j)hi=j;else if(m-1>=i)lo=i;else break;
  }
}
function beam(P,B,deadline,opt){
  const BW=P.BW,BH=P.BH,k=P.k,T=P.T,nT=T.length,BA=BW*BH;
  const guideId=opt.guide||0, stack=opt.stack!==false, frames=opt.frames||[0,1];
  const nFr=frames.length, lbTerm=opt.lbTerm!==false, maxBins=opt.maxBins||Infinity, dom=opt.dominance!==false, lazy=opt.lazy!==false;
  // valor guía (menor es mejor). 0: desperdicio/área colocada; 3: área consumida/área colocada;
  // 4: proporción de desperdicio / área media colocada (prioriza piezas grandes), como PackingSolver.
  const guide=(waste,cons,placed,ar,nPl)=>{
    if(guideId===2)return waste/placed-0.5*ar/BA;
    if(guideId===3)return cons/placed;
    if(guideId===4){let wr=waste/cons;if(wr<0.02)wr=0.01+wr/2;return wr/(placed/nPl)*BA}
    if(guideId===5)return (0.1+waste/cons)/(placed/nPl)*BA;
    return waste/placed;
  };
  let N=0,totalArea=0;
  for(const t of T){N+=t.count;totalArea+=t.area*t.count}
  // medidas de cada orientación (índice t*2+o) y área
  const OW=new Float64Array(nT*2),OH=new Float64Array(nT*2),NO=new Int8Array(nT),AR=new Float64Array(nT);
  for(let t=0;t<nT;t++){NO[t]=T[t].ors.length;AR[t]=T[t].area;for(let o=0;o<NO[t];o++){OW[t*2+o]=T[t].ors[o][0];OH[t*2+o]=T[t].ors[o][1]}}
  // hash de las cantidades restantes (para descartar estados repetidos)
  const R=new Uint32Array(nT);let seed=0x9e3779b9;
  for(let t=0;t<nT;t++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;R[t]=seed>>>0}
  let hash0=0;for(let t=0;t<nT;t++)hash0=(hash0+Math.imul(T[t].count,R[t]))>>>0;
  // nivel actual / siguiente (estructura de arreglos)
  function mkLevel(cap){return {n:0,par:new Int32Array(cap),tt:new Int32Array(cap),oo:new Int8Array(cap),bin:new Int32Array(cap),fr:new Int8Array(cap),
    x:new Float64Array(cap),y:new Float64Array(cap),x1p:new Float64Array(cap),x1c:new Float64Array(cap),y2p:new Float64Array(cap),y2c:new Float64Array(cap),
    x3p:new Float64Array(cap),x3c:new Float64Array(cap),y4c:new Float64Array(cap),placed:new Float64Array(cap),remA:new Float64Array(cap),
    hash:new Uint32Array(cap),rem:new Int32Array(cap*nT)}}
  let cur=mkLevel(1),nxt=mkLevel(B);
  cur.n=1;cur.par[0]=-1;cur.tt[0]=-1;cur.remA[0]=totalArea;cur.hash[0]=hash0;
  for(let t=0;t<nT;t++)cur.rem[t]=T[t].count;
  const hist=[];
  // candidatos
  let cap=4096;
  let cP=new Int32Array(cap),cT=new Int32Array(cap),cO=new Int8Array(cap),cK=new Int8Array(cap),cG=new Float64Array(cap);
  function grow(){cap*=2;let a;a=new Int32Array(cap);a.set(cP);cP=a;a=new Int32Array(cap);a.set(cT);cT=a;a=new Int8Array(cap);a.set(cO);cO=a;a=new Int8Array(cap);a.set(cK);cK=a;a=new Float64Array(cap);a.set(cG);cG=a}
  // frente resultante de una inserción (se escribe en estas variables)
  let Nb,Nfr,N1p,N1c,N2p,N2c,N3p,N3c,N4c,NX,NY;
  function apply(L,i,t,o,kind){
    Nb=L.bin[i];Nfr=L.fr[i];N1p=L.x1p[i];N1c=L.x1c[i];N2p=L.y2p[i];N2c=L.y2c[i];N3p=L.x3p[i];N3c=L.x3c[i];N4c=L.y4c[i];
    const w0=OW[t*2+o],h0=OH[t*2+o];
    if(kind>=4&&kind<=5){Nb++;Nfr=kind-4;const w=Nfr?h0:w0,h=Nfr?w0:h0;NX=0;NY=0;N1p=0;N1c=w;N2p=0;N2c=h;N3p=0;N3c=w;N4c=h;return}
    const w=Nfr?h0:w0,h=Nfr?w0:h0;
    if(kind===1){NX=N3c+k;NY=N2p;N3p=NX;N3c=NX+w;if(N3c>N1c)N1c=N3c;if(N2p+h>N2c)N2c=N2p+h;N4c=N2p+h}
    else if(kind===2){NX=N1p;NY=N2c+k;N2p=NY;N2c=NY+h;N3p=N1p;N3c=N1p+w;if(N3c>N1c)N1c=N3c;N4c=N2c}
    else if(kind===3){NX=N1c+k;NY=0;N1p=NX;N1c=NX+w;N2p=0;N2c=h;N3p=N1p;N3c=N1c;N4c=h}
    else{NX=N3p;NY=N4c+k;N4c=NY+h} // 6: apilada en el hueco actual
  }
  for(let depth=0;depth<N;depth++){
    if(now()>deadline)return null;
    let nc=0;
    const invD=1/(depth+1);
    for(let i=0;i<cur.n;i++){
      const bins=cur.bin[i],fr=cur.fr[i],x1p=cur.x1p[i],x1c=cur.x1c[i],y2p=cur.y2p[i],y2c=cur.y2c[i],x3p=cur.x3p[i],x3c=cur.x3c[i],y4c=cur.y4c[i];
      const placed0=cur.placed[i],remA0=cur.remA[i],ro=i*nT;
      const FW=fr?BH:BW,FH=fr?BW:BH;
      let fit=false;
      if(bins>0){
        // Como PackingSolver: no se abre un bloque nuevo si alguna pieza entra en el bloque
        // actual sin agrandarlo, ni una tira nueva si alguna entra en la tira sin ensancharla.
        let keepBlock=false,keepStrip=false;
        const gen=kind=>{
          for(let t=0;t<nT;t++){
            if(!cur.rem[ro+t])continue;
            const ar=AR[t],placed=placed0+ar,remA=remA0-ar;
            for(let o=0;o<NO[t];o++){
              const w=fr?OH[t*2+o]:OW[t*2+o],h=fr?OW[t*2+o]:OH[t*2+o];
              let n1p=x1p,n1c=x1c,n2p=y2p,n2c=y2c,n3p=x3p,n3c=x3c,n4c=y4c;
              if(kind===1){if(!(x3c+k+w<=FW+EPS&&y2p+h<=FH+EPS))continue;n3p=x3c+k;n3c=n3p+w;if(n3c>n1c)n1c=n3c;if(y2p+h>n2c)n2c=y2p+h;n4c=y2p+h}
              else if(kind===2){if(!(y2c+k+h<=FH+EPS&&x1p+w<=FW+EPS))continue;n2p=y2c+k;n2c=n2p+h;n3p=x1p;n3c=x1p+w;if(n3c>n1c)n1c=n3c;n4c=n2c}
              else if(kind===3){if(!(x1c+k+w<=FW+EPS&&h<=FH+EPS))continue;n1p=x1c+k;n1c=n1p+w;n2p=0;n2c=h;n3p=n1p;n3c=n1c;n4c=h}
              else{if(!(stack&&w<=x3c-x3p+EPS&&y4c+k+h<=y2c+EPS))continue;n4c=y4c+k+h}
              fit=true;
              if(kind!==3&&n1c<=x1c+EPS){keepStrip=true;if(kind!==2&&n2c<=y2c+EPS)keepBlock=true}
              const cov=n1p*FH+(n1c-n1p)*n2p+(n3p-n1p)*(n2c-n2p)+(n3c-n3p)*(n4c-n2p);
              const cons=(bins-1)*BA+cov,waste=cons-placed;
              const lb=bins-1+Math.ceil((cov+remA)/BA-1e-9);
              if(lb>maxBins)continue;
              const g=guide(waste,cons,placed,ar,depth+1);
              if(nc>=cap)grow();
              cP[nc]=i;cT[nc]=t;cO[nc]=o;cK[nc]=kind===4?6:kind;cG[nc]=(lbTerm?lb*1e6:0)+g;nc++;
            }
          }
        };
        gen(1);gen(4);
        if(!lazy||!keepBlock)gen(2);
        if(!lazy||!keepStrip)gen(3);
      }
      if(!fit){ // tablero nuevo: sólo si no entra nada más en el actual
        for(let t=0;t<nT;t++){
          if(!cur.rem[ro+t])continue;
          const ar=AR[t],placed=placed0+ar,remA=remA0-ar;
          for(let o=0;o<NO[t];o++)for(let f=0;f<nFr;f++){
            const cons=bins*BA+ar,waste=cons-placed;
            const lb=bins+Math.ceil((ar+remA)/BA-1e-9);
            if(lb>maxBins)continue;
            const g=guide(waste,cons,placed,ar,depth+1);
            if(nc>=cap)grow();
            cP[nc]=i;cT[nc]=t;cO[nc]=o;cK[nc]=4+frames[f];cG[nc]=(lbTerm?lb*1e6:0)+g;nc++;
          }
        }
      }
    }
    // elegir los B mejores sin estados repetidos
    const idx=new Int32Array(nc);for(let c=0;c<nc;c++)idx[c]=c;
    const m=Math.min(nc,B*4);
    if(nc>m)selectTop(idx,nc,cG,m);
    const sel=Array.from(idx.subarray(0,m)).sort((a,b)=>cG[a]-cG[b]);
    nxt.n=0;
    const seen=new Set(),groups=new Map();
    const take=list=>{
      for(let q=0;q<list.length&&nxt.n<B;q++){
        const c=list[q],i=cP[c],t=cT[c],o=cO[c];
        apply(cur,i,t,o,cK[c]);
        const hash=(cur.hash[i]-R[t])>>>0;
        // clave numérica del estado (frente + piezas restantes)
        let h1=Math.imul(hash^0x27d4eb2d,0x165667b1)^Nb^(Nfr<<20);
        let h2=hash;
        const vals=[N1p,N1c,N2p,N2c,N3p,N3c,N4c];
        for(let v=0;v<7;v++){const q2=Math.round(vals[v]*16);h1=Math.imul(h1^q2,0x85ebca6b)>>>0;h2=Math.imul(h2+q2+v,0xc2b2ae35)>>>0}
        const key=(h1>>>0)*2097152+(h2&0x1fffff);
        if(seen.has(key))continue;
        seen.add(key);
        if(dom){
          // dominancia: mismas piezas colocadas y un frente que ocupa a lo sumo lo mismo
          const gk=(Math.imul(hash^0x9e3779b9,0x85ebca6b)>>>0)*64+Nb*2+Nfr;
          let list=groups.get(gk),dominated=false;
          if(list){for(const f of list){if(f[0]<=N1p+EPS&&f[1]<=N1c+EPS&&f[2]<=N2p+EPS&&f[3]<=N2c+EPS&&f[4]<=N3p+EPS&&f[5]<=N3c+EPS&&f[6]<=N4c+EPS){dominated=true;break}}}
          if(dominated)continue;
          if(!list){list=[];groups.set(gk,list)}
          list.push([N1p,N1c,N2p,N2c,N3p,N3c,N4c]);
        }
        const j=nxt.n++;
        nxt.par[j]=i;nxt.tt[j]=t;nxt.oo[j]=o;nxt.bin[j]=Nb;nxt.fr[j]=Nfr;nxt.x[j]=NX;nxt.y[j]=NY;
        nxt.x1p[j]=N1p;nxt.x1c[j]=N1c;nxt.y2p[j]=N2p;nxt.y2c[j]=N2c;nxt.x3p[j]=N3p;nxt.x3c[j]=N3c;nxt.y4c[j]=N4c;
        nxt.placed[j]=cur.placed[i]+AR[t];nxt.remA[j]=cur.remA[i]-AR[t];nxt.hash[j]=hash;
        nxt.rem.set(cur.rem.subarray(i*nT,i*nT+nT),j*nT);nxt.rem[j*nT+t]--;
      }
    };
    take(sel);
    if(nxt.n<B&&m<nc)take(Array.from(idx.subarray(m,nc)).sort((a,b)=>cG[a]-cG[b]));
    if(!nxt.n)return {pruned:true};
    // guardar lo necesario para reconstruir el plan
    hist.push({par:nxt.par.slice(0,nxt.n),tt:nxt.tt.slice(0,nxt.n),oo:nxt.oo.slice(0,nxt.n),bin:nxt.bin.slice(0,nxt.n),fr:nxt.fr.slice(0,nxt.n),x:nxt.x.slice(0,nxt.n),y:nxt.y.slice(0,nxt.n)});
    const tmp=cur;cur=nxt;nxt=(depth===0)?mkLevel(B):tmp;
  }
  // mejor plan completo: menos tableros y mayor retazo (lo que queda tras la última tira)
  let bi=-1,bestLeft=-1;
  for(let i=0;i<cur.n;i++){
    const fr=cur.fr[i],FW=fr?BH:BW,FH=fr?BW:BH,left=(FW-cur.x1c[i])*FH;
    if(bi<0||cur.bin[i]<cur.bin[bi]||(cur.bin[i]===cur.bin[bi]&&left>bestLeft+EPS)){bi=i;bestLeft=left}
  }
  if(bi<0)return null;
  const steps=new Array(N);
  for(let d=N-1,i=bi;d>=0;d--){const H=hist[d];steps[d]={bin:H.bin[i]-1,t:H.tt[i],o:H.oo[i],x:H.x[i],y:H.y[i],fr:H.fr[i]};i=H.par[i]}
  return {bins:cur.bin[bi],steps};
}

// ---------- método voraz anterior (para la competencia de métodos) ----------
function greedy(pieces,cfg){
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
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  function pack(sortFn,fitRule,splitRule){
    const items=[];
    for(const p of pieces)for(let n=1;n<=p.q;n++)items.push({...p,n});
    items.sort(sortFn);
    const boards=[],unplaced=[];
    for(const it of items){
      const orients=allowedOrients(it,it.n,cfg);
      let best=null;
      const tryBoard=(b,bi)=>{
        b.free.forEach((f,fi)=>{
          for(const [w,h,rot] of orients){
            if(w<=f.w+EPS&&h<=f.h+EPS){const score=fitRule(f,w,h);if(!best||score<best.score)best={bi,fi,w,h,rot,score}}
          }
        });
      };
      boards.forEach(tryBoard);
      if(!best){
        if(!orients.some(([w,h])=>w<=uw+EPS&&h<=uh+EPS)){unplaced.push(it);continue}
        boards.push({free:[{x:0,y:0,w:uw,h:uh}],placed:[]});tryBoard(boards[boards.length-1],boards.length-1);
      }
      const b=boards[best.bi],f=b.free[best.fi];
      b.placed.push({x:f.x,y:f.y,w:best.w,h:best.h,rot:best.rot,item:it});
      b.free.splice(best.fi,1);
      const k=cfg.kerf,rw=f.w-best.w-k,rh=f.h-best.h-k;
      let A,Bf;
      if(splitRule(f,best.w,best.h)){A={x:f.x+best.w+k,y:f.y,w:rw,h:best.h};Bf={x:f.x,y:f.y+best.h+k,w:f.w,h:rh}}
      else{A={x:f.x+best.w+k,y:f.y,w:rw,h:f.h};Bf={x:f.x,y:f.y+best.h+k,w:best.w,h:rh}}
      for(const r of [A,Bf])if(r.w>EPS&&r.h>EPS)b.free.push(r);
    }
    return {boards:boards.map(b=>({placed:b.placed})),unplaced};
  }
  let best=null;
  for(const s in SORTS)for(const f in FITS)for(const sp in SPLITS){
    const r=pack(SORTS[s],FITS[f],SPLITS[sp]);
    r.algo=`voraz ${s}/${f}/${sp}`;
    if(!best||compare(score(r,cfg),score(best,cfg))<0)best=r;
  }
  return best;
}

// ---------- medidas del resultado ----------
// Rectángulo libre más grande de un tablero (el retazo aprovechable)
function largestFree(placed,uw,uh){
  let free=[{x:0,y:0,w:uw,h:uh}];
  for(const p of placed){
    const next=[];
    for(const f of free){
      if(p.x>=f.x+f.w-EPS||p.x+p.w<=f.x+EPS||p.y>=f.y+f.h-EPS||p.y+p.h<=f.y+EPS){next.push(f);continue}
      if(p.x>f.x+EPS)next.push({x:f.x,y:f.y,w:p.x-f.x,h:f.h});
      if(p.x+p.w<f.x+f.w-EPS)next.push({x:p.x+p.w,y:f.y,w:f.x+f.w-p.x-p.w,h:f.h});
      if(p.y>f.y+EPS)next.push({x:f.x,y:f.y,w:f.w,h:p.y-f.y});
      if(p.y+p.h<f.y+f.h-EPS)next.push({x:f.x,y:p.y+p.h,w:f.w,h:f.y+f.h-p.y-p.h});
    }
    free=next.filter((a,i)=>!next.some((b,j)=>j!==i&&b.x<=a.x+EPS&&b.y<=a.y+EPS&&b.x+b.w>=a.x+a.w-EPS&&b.y+b.h>=a.y+a.h-EPS&&(j<i||b.w*b.h>a.w*a.h+EPS)));
  }
  let best=null;for(const f of free)if(!best||f.w*f.h>best.w*best.h)best=f;
  return best||{x:0,y:0,w:0,h:0};
}
// Cantidad de cortes de sierra: se separa el tablero con cortes de lado a lado
// y se recorta cada pieza de su espacio.
function countCuts(placed,x0,y0,x1,y1,k,depth=0){
  if(!placed.length)return 0;
  if(placed.length===1){
    const p=placed[0];
    return (p.x>x0+EPS)+(p.x+p.w<x1-EPS)+(p.y>y0+EPS)+(p.y+p.h<y1-EPS);
  }
  if(depth>300)return 0;
  for(const axis of ["x","y"]){
    const s=axis==="x"?"w":"h";
    const ends=[...new Set(placed.map(r=>r[axis]+r[s]))].sort((a,b)=>a-b);
    for(const c of ends){
      const A=[],Bs=[];let ok=true;
      for(const r of placed){if(r[axis]+r[s]<=c+EPS)A.push(r);else if(r[axis]>=c+k-EPS)Bs.push(r);else{ok=false;break}}
      if(ok&&A.length&&Bs.length){
        return 1+(axis==="x"?countCuts(A,x0,y0,c,y1,k,depth+1)+countCuts(Bs,c+k,y0,x1,y1,k,depth+1)
                            :countCuts(A,x0,y0,x1,c,k,depth+1)+countCuts(Bs,x0,c+k,x1,y1,k,depth+1));
      }
    }
  }
  return placed.length*2;
}
function score(sol,cfg){
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  const n=sol.boards.length, last=n?sol.boards[n-1].placed:[];
  const f=n?largestFree(last,uw,uh):{w:0,h:0};
  let cuts=0;
  for(const b of sol.boards)cuts+=b.cuts!=null?b.cuts:countCuts(b.placed,0,0,uw,uh,cfg.kerf);
  return {unplaced:sol.unplaced.length,boards:n,leftover:f.w*f.h/(uw*uh),cuts};
}
// <0 si a es mejor: menos piezas sin colocar, menos tableros, un retazo claramente
// más grande (más de 3% del tablero), menos cortes de sierra y por último el retazo.
function compare(a,b){
  if(a.unplaced!==b.unplaced)return a.unplaced-b.unplaced;
  if(a.boards!==b.boards)return a.boards-b.boards;
  if(Math.abs(a.leftover-b.leftover)>0.03)return b.leftover-a.leftover;
  if(a.cuts!==b.cuts)return a.cuts-b.cuts;
  if(Math.abs(a.leftover-b.leftover)>1e-4)return b.leftover-a.leftover;
  return 0;
}

// ---------- solución de la búsqueda → formato de la app ----------
function toSolution(P,node,prep,typeMap){
  // typeMap: índice de tipo en P → índice de tipo en prep (para subproblemas)
  const steps=node.steps;
  const boards=[];
  const nsLeft=prep.types.map(t=>t.ns.slice());
  for(const st of steps){
    const ti=typeMap?typeMap[st.t]:st.t, tp=prep.types[ti], o=P.T[st.t].ors[st.o];
    while(boards.length<=st.bin)boards.push({placed:[]});
    let x=st.x,y=st.y;
    if(st.fr){[x,y]=[y,x]} // en el marco horizontal las coordenadas van traspuestas
    const n=nsLeft[ti].shift();
    boards[st.bin].placed.push({x,y,w:o[0],h:o[1],rot:o[2],item:{...tp.piece,n}});
  }
  return {boards,unplaced:prep.unplaced.slice()};
}
// Respeta el máximo de tableros: se descartan los tableros más vacíos.
function truncate(sol,maxB){
  if(!(sol.boards.length>maxB))return sol;
  const fill=b=>b.placed.reduce((s,p)=>s+p.w*p.h,0);
  const order=sol.boards.map((b,i)=>i).sort((a,b)=>fill(sol.boards[b])-fill(sol.boards[a]));
  const keep=new Set(order.slice(0,maxB));
  const boards=[],unplaced=sol.unplaced.slice();
  sol.boards.forEach((b,i)=>{if(keep.has(i))boards.push(b);else for(const p of b.placed)unplaced.push(p.item)});
  return {...sol,boards,unplaced};
}

function finish(sol,cfg){
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin;
  for(const b of sol.boards)b.cuts=countCuts(b.placed.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h})),0,0,uw,uh,cfg.kerf);
  return sol;
}

// ---------- punto de entrada ----------
// solve(piezas, cfg, opciones) → {boards:[{placed:[{x,y,w,h,rot,item}],cuts}], unplaced, algo}
//   opts.timeLimit: milisegundos (por defecto 1500). Con 0 sólo corre el método voraz.
//   opts.onImprove(sol, puntaje): se llama cada vez que aparece un plan mejor.
//   Para experimentos: opts.schedule, opts.maxBeam, opts.growth, opts.noBaseline.
function solve(pieces,cfg,opts={}){
  const t0=now(), limit=opts.timeLimit!=null?opts.timeLimit:1500, deadline=t0+limit;
  const maxB=cfg.maxB||Infinity;
  const prep=prepare(pieces,cfg);
  let best=null,bestScore=null;
  const consider=(sol,algo)=>{
    sol.algo=algo;
    const sc=score(sol,cfg);
    if(!best||compare(sc,bestScore)<0){best=sol;bestScore=sc;if(opts.onImprove)opts.onImprove(finish(truncate(sol,maxB),cfg),sc)}
  };
  if(!opts.noBaseline)consider(greedy(pieces,cfg),"voraz");
  if(prep.types.length&&(limit>0||!best)){
    const P={BW:prep.uw,BH:prep.uh,k:cfg.kerf,T:prep.types.map(t=>({count:t.count,area:t.area,ors:t.ors}))};
    // guía de PackingSolver (proporción de desperdicio / área media colocada) y cada
    // tablero puede elegir el sentido de sus tiras
    const schedule=opts.schedule||[{guide:4,lbTerm:false}];
    const growth=opts.growth||2;
    const beamDeadline=deadline;
    let stop=false;
    for(let B=1;B<=(opts.maxBeam||8192)&&!stop;B=Math.max(B+1,Math.floor(B*growth))){
      for(const sc of schedule){
        if(best&&now()>beamDeadline){stop=true;break}
        const node=beam(P,B,best?beamDeadline:Infinity,sc);
        if(!node){stop=true;break}
        if(node.pruned)continue;
        consider(toSolution(P,node,prep),`haz ${B}`);
      }
    }
  }
  if(!best)best={boards:[],unplaced:prep.unplaced,algo:"vacío"};
  const out=finish(truncate(best,maxB),cfg);
  out.ms=now()-t0;
  return out;
}

// Cota inferior de tableros: área (con y sin kerf) y piezas que no pueden compartir tablero.
function lowerBound(pieces,cfg){
  const uw=cfg.W-2*cfg.margin, uh=cfg.H-2*cfg.margin, k=cfg.kerf;
  let area=0,areaK=0,big=0;
  for(const p of pieces){
    const ors=allowedOrients(p,0,{...cfg,force:null}).filter(o=>o[0]<=uw+EPS&&o[1]<=uh+EPS);
    if(!ors.length)continue;
    area+=p.w*p.h*p.q;areaK+=(p.w+k)*(p.h+k)*p.q;
    if(ors.every(([w,h])=>w>(uw-k)/2&&h>(uh-k)/2))big+=p.q;
  }
  return Math.max(Math.ceil(area/(uw*uh)-1e-9),Math.ceil(areaK/((uw+k)*(uh+k))-1e-9),big);
}

G.CutOptimizer={solve,lowerBound,greedy,prepare,beam,score,compare,largestFree,countCuts,allowedOrients,truncate,toSolution,finish};
})(typeof globalThis!=="undefined"?globalThis:this);
