// Corre las 500 instancias oficiales y compara con la literatura.
// Uso: jsc lab/official_run.js -- <algoritmo: base|pro> <ms> [clases "1,2,..."]
load("lab/baseline.js");load("lab/official.js");load("lab/validate.js");load("optimizer.js");
var args=(typeof arguments!=="undefined")?arguments:[];
var algo=args[0]||"pro",ms=+(args[1]||1000),classes=(args[2]||"1,2,3,4,5,6,7,8,9,10").split(",").map(Number);
var opts=args[3]?JSON.parse(args[3]):{schedule:[{guide:4,lbTerm:false}],lns:false};
var tot=0,totBest=0,totCH=0,inval=0,t0=preciseTime();
for(const c of classes){
  let bins=0;
  for(const inst of Official.all(c)){
    const cfg={W:inst.W,H:inst.H,kerf:0,margin:0,maxB:Infinity,grain:false,force:{}};
    let sol;
    if(algo==="base")sol=Baseline.optimize(inst.pieces.map(p=>({...p,fw:p.w,fh:p.h,e:"0000",em:0})),cfg);
    else sol=CutOptimizer.solve(inst.pieces,cfg,Object.assign({timeLimit:ms},opts));
    if(Validate.check(inst,sol).length)inval++;
    bins+=sol.boards.length;
  }
  tot+=bins;totBest+=Official.BEST[c];totCH+=Official.CHBP[c];
  print(`clase ${c}: ${bins} tableros  (récord ${Official.BEST[c]}, CHBP ${Official.CHBP[c]}, L0 ${Official.L0[c]})`);
}
print(`TOTAL ${algo}: ${tot}  récord=${totBest}  CHBP=${totCH}  inválidas=${inval}  tiempo=${(preciseTime()-t0).toFixed(0)}s`);
