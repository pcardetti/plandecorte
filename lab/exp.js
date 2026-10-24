// Compara estrategias completas (opciones de solve) con el mismo tiempo.
// Uso: jsc lab/exp.js -- <ms> <conjunto>
load("lab/instances.js");load("lab/official.js");load("lab/validate.js");load("optimizer.js");
var args=(typeof arguments!=="undefined")?arguments:[];
var ms=+(args[0]||1000), setName=args[1]||"mix";
function testSet(){
  if(setName==="mix")return [].concat(Instances.suite("muebles",40),Instances.suite("muebles-grandes",10),Instances.suite("estres",8),
    Instances.suite("clase3",5),Instances.suite("clase5",5),Instances.suite("clase7",5),Instances.suite("clase8",5),Instances.suite("clase9",5),Instances.suite("clase1",5));
  if(setName==="muebles-todo")return [].concat(Instances.suite("muebles",60),Instances.suite("muebles-grandes",20));
  if(setName==="oficial-muestra"){const out=[];for(let c=1;c<=10;c++)for(const n of [40,80,100])for(const j of [1,6])out.push(Official.instance(c,n,j));return out}
  if(setName.startsWith("oficial")){const c=+setName.split(":")[1];return Official.all(c)}
  return Instances.suite(setName.split(":")[0],+(setName.split(":")[1]||20));
}
var STRATS={
  g4lns:{schedule:[{guide:4,lbTerm:false}],lnsShare:0.3},
  g4mix:{schedule:[{guide:4,lbTerm:false},{guide:0}],lns:false},
  svc:{svc:true,beamEnd:0,lns:false,svcEnd:1},
  bsvc:{svc:true,beamEnd:0.5,lns:false,svcEnd:1,schedule:[{guide:4,lbTerm:false}]},
  g4nd:{schedule:[{guide:4,lbTerm:false,dominance:false}],lns:false},
  g0nd:{schedule:[{guide:0,dominance:false}],lns:false},
  g0:{schedule:[{guide:0}],lns:false},
  g3:{schedule:[{guide:3,lbTerm:false}],lns:false},
  g4:{schedule:[{guide:4,lbTerm:false}],lns:false},
  g4lb:{schedule:[{guide:4}],lns:false},
  g5:{schedule:[{guide:5,lbTerm:false}],lns:false},
  ps:{schedule:[{guide:3,lbTerm:false,frames:[0]},{guide:4,lbTerm:false,frames:[0]},{guide:3,lbTerm:false,frames:[1]},{guide:4,lbTerm:false,frames:[1]}],lns:false,growth:1.5,prune:true},
  ps2:{schedule:[{guide:3,lbTerm:false},{guide:4,lbTerm:false}],lns:false,growth:1.5,prune:true},
  s0:{schedule:[{guide:0}],lns:false},
  s1:{schedule:[{guide:0}]},
  s2:{schedule:[{guide:0},{guide:2}],lns:false},
  s3:{schedule:[{guide:0},{guide:2,frames:[0]},{guide:0,frames:[1]}],lns:false},
  s4:{schedule:[{guide:0},{guide:2}],lnsShare:0.25},
  s5:{schedule:[{guide:0,frames:[0]},{guide:0,frames:[1]}],lns:false},
};
var names=(args[2]||"s0,s1,s2,s3,s4,s5").split(",");
var insts=testSet();
var tot={};for(const n of names)tot[n]={boards:0,left:0,inval:0,best:0};
var lbTot=0;
for(const inst of insts){
  const cfg={W:inst.W,H:inst.H,kerf:inst.kerf,margin:inst.margin,maxB:inst.maxB,grain:inst.grain,force:inst.force};
  lbTot+=Validate.lowerBound(inst);
  const res={};
  for(const n of names){
    const sol=CutOptimizer.solve(inst.pieces,cfg,Object.assign({timeLimit:ms},STRATS[n]));
    if(Validate.check(inst,sol).length)tot[n].inval++;
    const sc=CutOptimizer.score(sol,cfg);res[n]=sc;
    tot[n].boards+=sc.boards;tot[n].left+=sc.leftover;
  }
  let bestB=Math.min(...names.map(n=>res[n].boards));
  for(const n of names)if(res[n].boards===bestB)tot[n].best++;
}
print(`conjunto=${setName} instancias=${insts.length} cota=${lbTot} ms=${ms}`);
for(const n of names)print(`  ${n}: tableros=${tot[n].boards} mejorEnTableros=${tot[n].best}/${insts.length} retazoProm=${(tot[n].left/insts.length*100).toFixed(1)}% inválidas=${tot[n].inval}  ${JSON.stringify(STRATS[n])}`);
