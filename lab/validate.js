// Verificador independiente de soluciones.
// Devuelve [] si la solución es válida, o una lista de errores.
var Validate=(function(){
  const EPS=1e-6;
  function allowedRot(inst,piece,n){
    const f=inst.force&&inst.force[`${piece.id}:${n}`];
    if(f!=null)return [f];
    if(inst.grain&&piece.g==="w")return [false];
    if(inst.grain&&piece.g==="h")return [true];
    return piece.w===piece.h?[false,true]:[false,true];
  }
  // ¿Se puede separar este grupo de piezas con cortes de lado a lado (con kerf)?
  function guillotine(rects,k,depth=0){
    if(rects.length<=1)return true;
    if(depth>400)return false;
    for(const axis of ["x","y"]){
      const s=axis==="x"?"w":"h";
      const ends=[...new Set(rects.map(r=>r[axis]+r[s]))].sort((a,b)=>a-b);
      for(const c of ends){
        const A=[],B=[];let ok=true;
        for(const r of rects){
          if(r[axis]+r[s]<=c+EPS)A.push(r);
          else if(r[axis]>=c+k-EPS)B.push(r);
          else{ok=false;break}
        }
        if(ok&&A.length&&B.length)return guillotine(A,k,depth+1)&&guillotine(B,k,depth+1);
      }
    }
    return false;
  }
  function check(inst,sol){
    const errs=[];
    const uw=inst.W-2*inst.margin, uh=inst.H-2*inst.margin, k=inst.kerf;
    const byId=new Map(inst.pieces.map(p=>[p.id,p]));
    const seen=new Map();
    const note=(id,n,where)=>{const key=`${id}:${n}`;if(seen.has(key))errs.push(`pieza ${key} repetida (${where})`);seen.set(key,where)};
    if(inst.maxB<Infinity&&sol.boards.length>inst.maxB)errs.push(`usa ${sol.boards.length} tableros > máximo ${inst.maxB}`);
    sol.boards.forEach((b,bi)=>{
      if(!b.placed.length)errs.push(`tablero ${bi+1} vacío`);
      for(const p of b.placed){
        const it=p.item, pc=byId.get(it.id);
        if(!pc){errs.push(`pieza desconocida ${it.id}`);continue}
        if(!(it.n>=1&&it.n<=pc.q))errs.push(`copia fuera de rango ${it.id}:${it.n}`);
        note(it.id,it.n,`tablero ${bi+1}`);
        const ew=p.rot?pc.h:pc.w, eh=p.rot?pc.w:pc.h;
        if(Math.abs(p.w-ew)>EPS||Math.abs(p.h-eh)>EPS)errs.push(`medidas ${it.id}:${it.n} ${p.w}x${p.h} no coinciden con ${ew}x${eh}`);
        if(!allowedRot(inst,pc,it.n).includes(!!p.rot))errs.push(`orientación prohibida ${it.id}:${it.n} rot=${p.rot}`);
        if(p.x<-EPS||p.y<-EPS||p.x+p.w>uw+EPS||p.y+p.h>uh+EPS)errs.push(`fuera del tablero ${it.id}:${it.n} en (${p.x},${p.y}) ${p.w}x${p.h} [${uw}x${uh}]`);
      }
      const P=b.placed;
      for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
        const a=P[i],c=P[j];
        const sep=a.x+a.w+k<=c.x+EPS||c.x+c.w+k<=a.x+EPS||a.y+a.h+k<=c.y+EPS||c.y+c.h+k<=a.y+EPS;
        if(!sep)errs.push(`superposición o sin kerf en tablero ${bi+1}: ${a.item.id}:${a.item.n} y ${c.item.id}:${c.item.n}`);
      }
      if(!guillotine(P.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h})),k))errs.push(`tablero ${bi+1} no es cortable con guillotina`);
    });
    for(const u of sol.unplaced||[])note(u.id,u.n,"sin colocar");
    for(const pc of inst.pieces)for(let n=1;n<=pc.q;n++)if(!seen.has(`${pc.id}:${n}`))errs.push(`falta la pieza ${pc.id}:${n}`);
    // una pieza sin colocar sólo se acepta si no entra en el tablero o si se llegó al máximo
    for(const u of sol.unplaced||[]){
      const pc=byId.get(u.id);if(!pc)continue;
      const fits=allowedRot(inst,pc,u.n).some(rot=>{const w=rot?pc.h:pc.w,h=rot?pc.w:pc.h;return w<=uw+EPS&&h<=uh+EPS});
      if(fits&&!(inst.maxB<Infinity&&sol.boards.length>=inst.maxB))errs.push(`pieza ${u.id}:${u.n} sin colocar aunque entra`);
    }
    return errs;
  }
  // Cotas inferiores de tableros: área y piezas "grandes" que no pueden compartir tablero.
  function lowerBound(inst){
    const uw=inst.W-2*inst.margin, uh=inst.H-2*inst.margin, k=inst.kerf;
    let area=0,areaK=0,big=0;
    for(const pc of inst.pieces){
      const ors=allowedRot(inst,pc,0).map(rot=>rot?[pc.h,pc.w]:[pc.w,pc.h]).filter(([w,h])=>w<=uw&&h<=uh);
      if(!ors.length)continue;
      area+=pc.w*pc.h*pc.q;
      areaK+=(pc.w+k)*(pc.h+k)*pc.q; // cada pieza "ocupa" también medio kerf alrededor
      if(ors.every(([w,h])=>w>(uw-k)/2&&h>(uh-k)/2))big+=pc.q;
    }
    return Math.max(Math.ceil(area/(uw*uh)-1e-9),Math.ceil(areaK/((uw+k)*(uh+k))-1e-9),big);
  }
  // Rectángulo libre más grande de un tablero (rectángulos maximales), para medir el retazo.
  function largestFree(placed,uw,uh){
    let free=[{x:0,y:0,w:uw,h:uh}];
    for(const p of placed){
      const next=[];
      for(const f of free){
        if(p.x>=f.x+f.w||p.x+p.w<=f.x||p.y>=f.y+f.h||p.y+p.h<=f.y){next.push(f);continue}
        if(p.x>f.x)next.push({x:f.x,y:f.y,w:p.x-f.x,h:f.h});
        if(p.x+p.w<f.x+f.w)next.push({x:p.x+p.w,y:f.y,w:f.x+f.w-p.x-p.w,h:f.h});
        if(p.y>f.y)next.push({x:f.x,y:f.y,w:f.w,h:p.y-f.y});
        if(p.y+p.h<f.y+f.h)next.push({x:f.x,y:p.y+p.h,w:f.w,h:f.y+f.h-p.y-p.h});
      }
      free=next.filter((a,i)=>!next.some((b,j)=>j!==i&&b.x<=a.x&&b.y<=a.y&&b.x+b.w>=a.x+a.w&&b.y+b.h>=a.y+a.h&&(j<i||b.w*b.h>a.w*a.h)));
    }
    let best=0;for(const f of free)best=Math.max(best,f.w*f.h);
    return best;
  }
  return {check,lowerBound,guillotine,largestFree};
})();
