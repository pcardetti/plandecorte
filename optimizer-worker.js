// Corre el optimizador fuera del hilo de la pantalla y avisa cada plan mejor que encuentra.
importScripts("optimizer.js");
self.onmessage=e=>{
  const {id,pieces,cfg,timeLimit}=e.data;
  try{
    const sol=CutOptimizer.solve(pieces,cfg,{timeLimit,onImprove:s=>self.postMessage({id,type:"improve",sol:s})});
    self.postMessage({id,type:"done",sol});
  }catch(err){
    self.postMessage({id,type:"error",message:String(err&&err.message||err)});
  }
};
