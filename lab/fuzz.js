// Pruebas al azar de robustez: cada plan debe pasar el verificador.
// Uso: jsc lab/fuzz.js -- <cantidad> <ms por caso> [semilla]
load("lab/instances.js");load("lab/validate.js");load("optimizer.js");
var args=(typeof arguments!=="undefined")?arguments:[];
var count=+(args[0]||500),ms=+(args[1]||60),seed0=+(args[2]||1);
var r=Instances.rng(seed0);
const int=(a,b)=>a+Math.floor(r()*(b-a+1));
const pick=a=>a[Math.floor(r()*a.length)];
function randomInstance(i){
  const W=pick([2750,2600,2440,1830,1220,600,100,10]),H=pick([1830,1220,2750,600,300,100,10]);
  const kerf=pick([0,0,3,4,4.4,2.5,1]),margin=pick([0,0,5,10,12.5]);
  const grain=r()<0.4,mode=i%6;
  const uw=W-2*margin,uh=H-2*margin;
  const pieces=[];const nT=mode===0?1:int(1,mode===5?40:12);
  for(let t=0;t<nT;t++){
    let w,h;
    if(mode===1){w=uw;h=uh}                                   // pieza del tamaño exacto del tablero
    else if(mode===2){w=int(1,uw+50);h=int(1,uh+50)}          // algunas no entran
    else if(mode===3){w=Math.round(r()*uw*10)/10+0.1;h=Math.round(r()*uh*10)/10+0.1} // decimales
    else if(mode===4){w=int(1,Math.max(1,Math.floor(uw/20)));h=int(1,Math.max(1,Math.floor(uh/20)))} // diminutas
    else{w=int(Math.max(1,Math.floor(uw/10)),Math.max(1,Math.floor(uw*0.9)));h=int(Math.max(1,Math.floor(uh/10)),Math.max(1,Math.floor(uh*0.9)))}
    if(r()<0.1)h=w; // cuadradas
    const q=mode===0?int(1,150):mode===4?int(1,30):int(1,6);
    pieces.push({id:t,name:"P"+t,w,h,q,g:grain?pick(["","w","h"]):""});
  }
  const force={};
  for(const p of pieces)for(let n=1;n<=p.q;n++)if(r()<0.08&&!(grain&&p.g))force[`${p.id}:${n}`]=r()<0.5;
  const maxB=r()<0.15?int(1,3):Infinity;
  return {name:`azar-${seed0}-${i}`,W,H,kerf,margin,grain,maxB,force,pieces};
}
let bad=0,crashes=0,t0=preciseTime(),boards=0;
for(let i=0;i<count;i++){
  const inst=randomInstance(i);
  if(inst.W-2*inst.margin<=0||inst.H-2*inst.margin<=0)continue;
  const cfg={W:inst.W,H:inst.H,kerf:inst.kerf,margin:inst.margin,maxB:inst.maxB,grain:inst.grain,force:inst.force};
  let sol;
  try{sol=CutOptimizer.solve(inst.pieces,cfg,{timeLimit:ms})}catch(e){crashes++;print(`ERROR ${inst.name}: ${e}\n${e.stack}`);continue}
  const errs=Validate.check(inst,sol);
  boards+=sol.boards.length;
  if(errs.length){bad++;if(bad<=10)print(`INVALIDA ${inst.name} (W=${inst.W} H=${inst.H} k=${inst.kerf} m=${inst.margin} maxB=${inst.maxB}): ${errs.slice(0,3).join(" | ")}`)}
  // el voraz (plan rápido) también debe ser válido
  const q=CutOptimizer.solve(inst.pieces,cfg,{timeLimit:0});
  const e2=Validate.check(inst,q);
  if(e2.length){bad++;if(bad<=10)print(`INVALIDA rápida ${inst.name}: ${e2.slice(0,3).join(" | ")}`)}
}
print(`casos=${count} inválidas=${bad} errores=${crashes} tableros=${boards} tiempo=${(preciseTime()-t0).toFixed(0)}s`);
