// Generador oficial de las clases I–X (Berkey & Wang / Martello & Vigo), portado del
// código FORTRAN de la Universidad de Bologna. Reproduce las 500 instancias publicadas.
var Official=(function(){
  const F=Math.fround;
  const CLS={
    1:{bin:10,hmax:10},2:{bin:30,hmax:10},3:{bin:40,hmax:35},4:{bin:100,hmax:35},5:{bin:100,hmax:100},6:{bin:300,hmax:100},
    7:{bin:100,p:[0.7,0.1,0.1,0.1]},8:{bin:100,p:[0.1,0.7,0.1,0.1]},9:{bin:100,p:[0.1,0.1,0.7,0.1]},10:{bin:100,p:[0.1,0.1,0.1,0.7]},
  };
  // tipos de pieza de las clases VII–X: [hmin,hmax,wmin,wmax]
  const TYPES=[[1,50,66,100],[66,100,1,50],[50,100,50,100],[1,50,1,50]];
  function instance(cls,n,j){
    let v=0;
    const r=()=>{v=(Math.trunc(v)*7141+54773)%259200;return F(v/259200)};
    const X=F(F(F(n*j)*F(31.47))+2000);
    for(let i=0;i<Math.trunc(X)+1;i++)r();
    const c=CLS[cls], items=[];
    for(let i=0;i<n;i++){
      let h,w;
      if(c.hmax){h=Math.trunc(F(c.hmax*r()))+1;w=Math.trunc(F(c.hmax*r()))+1}
      else{
        const u=r(),p=c.p;
        const t=u<p[0]?0:u<F(p[0]+p[1])?1:u<F(p[0]+p[1]+p[2])?2:3;
        const [hl,hh,wl,wh]=TYPES[t];
        h=Math.trunc(F((hh-hl+1)*r()))+hl;
        w=Math.trunc(F((wh-wl+1)*r()))+wl;
      }
      items.push({id:i,name:"P"+i,w,h,q:1,g:""});
    }
    return {name:`cl${cls}-n${n}-${j}`,W:c.bin,H:c.bin,kerf:0,margin:0,grain:false,maxB:Infinity,force:{},pieces:items};
  }
  function all(cls){const out=[];for(const n of [20,40,60,80,100])for(let j=1;j<=10;j++)out.push(instance(cls,n,j));return out}
  // mejores resultados publicados (total de tableros por clase, 2BP|R|G) y L0
  const BEST={1:972,2:124,3:675,4:119,5:860,6:109,7:753,8:757,9:2119,10:492};
  const CHBP={1:975,2:124,3:687,4:125,5:872,6:113,7:770,8:776,9:2119,10:503};
  const L0={1:927,2:124,3:629,4:119,5:786,6:108,7:719,8:721,9:1371,10:476};
  return {instance,all,BEST,CHBP,L0};
})();
