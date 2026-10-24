// Uso: jsc lab/run.js -- <suites> <algoritmos> [ms] [detalle]
//   suites: "muebles:40,clase1:20,estres:8"   algoritmos: "base,pro"
var LAB=(typeof LAB_DIR!=="undefined")?LAB_DIR:"lab/";
load(LAB+"baseline.js");load(LAB+"instances.js");load(LAB+"validate.js");
try{load("optimizer.js")}catch(e){print("(sin optimizer.js: "+e+")")}

var args=(typeof arguments!=="undefined")?arguments:[];
var suiteSpec=args[0]||"muebles:20";
var algoNames=(args[1]||"base").split(",");
var budget=+(args[2]||1000);
var detail=args[3]==="detalle";

function toApp(inst){
  const cfg={W:inst.W,H:inst.H,kerf:inst.kerf,margin:inst.margin,maxB:inst.maxB,grain:inst.grain,force:inst.force,price:{}};
  const pieces=inst.pieces.map(p=>({...p,fw:p.w,fh:p.h,e:"0000",em:0,color:"#000"}));
  return {cfg,pieces};
}
var ALGOS={
  base:inst=>{const {cfg,pieces}=toApp(inst);return Baseline.optimize(pieces,cfg)},
};
if(typeof CutOptimizer!=="undefined"){
  ALGOS.pro=inst=>{const {cfg,pieces}=toApp(inst);return CutOptimizer.solve(pieces,cfg,{timeLimit:budget})};
  ALGOS.beam=inst=>{const {cfg,pieces}=toApp(inst);return CutOptimizer.solve(pieces,cfg,{timeLimit:budget,noBaseline:true})};
  ALGOS.ns=inst=>{const {cfg,pieces}=toApp(inst);return CutOptimizer.solve(pieces,cfg,{timeLimit:budget,noBaseline:true,stack:false})};
  ALGOS.v=inst=>{const {cfg,pieces}=toApp(inst);return CutOptimizer.solve(pieces,cfg,{timeLimit:budget,noBaseline:true,frames:[0]})};
  for(let g=0;g<8;g++)ALGOS["g"+g]=inst=>{const {cfg,pieces}=toApp(inst);return CutOptimizer.solve(pieces,cfg,{timeLimit:budget,noBaseline:true,guide:g})};
}

function metrics(inst,sol){
  const uw=inst.W-2*inst.margin, uh=inst.H-2*inst.margin;
  const n=sol.boards.length;
  const last=n?sol.boards[n-1]:null;
  const free=last?Validate.largestFree(last.placed,uw,uh)/(uw*uh):0;
  const cuts=sol.boards.reduce((s,b)=>s+(b.cuts||0),0);
  return {boards:n,unplaced:(sol.unplaced||[]).length,leftover:free,cuts,algo:sol.algo||""};
}
// mejor = menos sin colocar, menos tableros, retazo más grande
function better(a,b){
  if(a.unplaced!==b.unplaced)return a.unplaced<b.unplaced?1:-1;
  if(a.boards!==b.boards)return a.boards<b.boards?1:-1;
  if(Math.abs(a.leftover-b.leftover)>0.005)return a.leftover>b.leftover?1:-1;
  return 0;
}

var suites=suiteSpec.split(",").map(s=>{const [name,c]=s.split(":");return {name,count:+(c||10)}});
var grand={};
for(const S of suites){
  const insts=Instances.suite(S.name,S.count);
  const acc={};
  for(const a of algoNames)acc[a]={boards:0,unplaced:0,leftover:0,cuts:0,ms:0,maxMs:0,errors:0,atLB:0,win:0,loss:0};
  let lb=0;
  for(const inst of insts){
    const LB=Validate.lowerBound(inst);lb+=LB;
    const res={};
    for(const a of algoNames){
      const t=preciseTime();
      let sol;
      try{sol=ALGOS[a](inst)}catch(e){print(`ERROR ${a} ${inst.name}: ${e}\n${e.stack}`);acc[a].errors++;continue}
      const ms=(preciseTime()-t)*1000;
      const errs=Validate.check(inst,sol);
      if(errs.length){acc[a].errors++;print(`INVALIDA ${a} ${inst.name}: ${errs.slice(0,3).join(" | ")}`)}
      const m=metrics(inst,sol);res[a]=m;
      const A=acc[a];A.boards+=m.boards;A.unplaced+=m.unplaced;A.leftover+=m.leftover;A.cuts+=m.cuts;A.ms+=ms;A.maxMs=Math.max(A.maxMs,ms);
      if(m.boards<=LB&&!m.unplaced)A.atLB++;
    }
    if(res.base)for(const a of algoNames){if(a==="base"||!res[a])continue;const c=better(res[a],res.base);if(c>0)acc[a].win++;else if(c<0)acc[a].loss++}
    if(detail)print(`${inst.name} LB=${LB} `+algoNames.map(a=>res[a]?`${a}:${res[a].boards}t/${(res[a].leftover*100).toFixed(0)}%[${res[a].algo}]`:a+":-").join(" "));
  }
  print(`\n== ${S.name} (${insts.length} instancias, cota mínima total ${lb})`);
  for(const a of algoNames){
    const A=acc[a];
    print(`  ${a.padEnd(6)} tableros=${A.boards} sinColocar=${A.unplaced} enCota=${A.atLB}/${insts.length} retazoProm=${(A.leftover/insts.length*100).toFixed(1)}% cortes=${A.cuts} msProm=${(A.ms/insts.length).toFixed(0)} msMax=${A.maxMs.toFixed(0)} inválidas=${A.errors}`+(a!=="base"&&acc.base?` mejor=${A.win} peor=${A.loss}`:""));
    grand[a]=grand[a]||{boards:0,win:0,loss:0,errors:0};grand[a].boards+=A.boards;grand[a].win+=A.win;grand[a].loss+=A.loss;grand[a].errors+=A.errors;
  }
}
print("\n== TOTAL "+algoNames.map(a=>`${a}: tableros=${grand[a].boards} inválidas=${grand[a].errors}`+(a!=="base"?` mejor=${grand[a].win} peor=${grand[a].loss}`:"")).join(" | "));
