// Generadores de instancias de prueba (deterministas por semilla).
// Formato de instancia: {name, W, H, kerf, margin, grain, maxB, force:{}, pieces:[{id,name,w,h,q,g}]}
var Instances=(function(){
  function rng(seed){ // mulberry32
    let a=seed>>>0;
    return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
  }
  const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
  const int=(r,a,b)=>a+Math.floor(r()*(b-a+1));

  // ---------- muebles reales (melamina 18 mm) ----------
  // Cada módulo agrega piezas con medidas típicas de carpintería.
  function furniture(seed,opts={}){
    const r=rng(seed);
    const board=opts.board||pick(r,[[2750,1830],[2750,1830],[2600,1830],[2440,1830]]);
    const grain=opts.grain!=null?opts.grain:r()<0.4;
    const parts=[];
    const add=(name,w,h,q,g="")=>{w=Math.round(w);h=Math.round(h);if(w>0&&h>0&&q>0)parts.push({name,w,h,q,g})};
    const nMod=opts.modules||int(r,1,4);
    for(let m=0;m<nMod;m++){
      const t=pick(r,["bajo","bajo","alacena","placard","biblioteca","cajonera","escritorio","rack"]);
      const Wm=pick(r,[400,450,500,600,700,800,900,1000,1200,1500]);
      const T=18;
      if(t==="bajo"){
        const H=720,D=560;
        add("Lateral bajo",D,H,2,"h");add("Piso bajo",Wm-2*T,D,1,"w");
        add("Travesaño",Wm-2*T,100,2,"w");add("Estante bajo",Wm-2*T,D-20,int(r,0,2),"w");
        if(r()<0.5){add("Puerta bajo",Wm/2-3,H-4,2,"h")}
        else{const k=int(r,2,4);add("Frente cajón",Wm-4,(H-4)/k-3,k,"w");add("Lateral cajón",500,(H-4)/k-60,2*k,"");add("Contrafrente",Wm-2*T-50,(H-4)/k-60,2*k,"")}
      }else if(t==="alacena"){
        const H=pick(r,[600,700,800,900]),D=pick(r,[300,320,350]);
        add("Lateral alacena",D,H,2,"h");add("Techo/piso alacena",Wm-2*T,D,2,"w");
        add("Estante alacena",Wm-2*T,D-20,int(r,1,2),"w");add("Puerta alacena",Wm/2-3,H-4,2,"h");
      }else if(t==="placard"){
        const H=pick(r,[1800,2000,2200,2400,2600]),D=560;
        add("Lateral placard",D,H,2,"h");add("Techo/piso placard",Wm-2*T,D,2,"w");
        add("Estante placard",Wm-2*T,D-20,int(r,1,3),"w");add("División",D-20,int(r,400,900),int(r,0,2),"h");
        add("Puerta placard",Wm/2-3,H-4,2,"h");add("Barral soporte",Wm-2*T,80,1,"");
      }else if(t==="biblioteca"){
        const H=pick(r,[900,1200,1600,1800,2000]),D=pick(r,[250,300,350]);
        add("Lateral biblioteca",D,H,2,"h");add("Techo/piso bib.",Wm-2*T,D,2,"w");add("Estante bib.",Wm-2*T,D-10,int(r,2,6),"w");
      }else if(t==="cajonera"){
        const H=pick(r,[500,700,900]),D=pick(r,[400,450,500]),k=int(r,3,5);
        add("Lateral cajonera",D,H,2,"h");add("Techo/piso cajonera",Wm-2*T,D,2,"w");
        add("Frente cajón",Wm-4,H/k-4,k,"w");add("Lateral cajón",D-50,H/k-50,2*k,"");add("Contrafrente",Wm-2*T-50,H/k-50,2*k,"");add("Fondo cajón",Wm-2*T-40,D-60,k,"");
      }else if(t==="escritorio"){
        const L=pick(r,[1000,1200,1400,1600]),D=pick(r,[500,600,700]);
        add("Tapa escritorio",L,D,1,"w");add("Lateral escritorio",D,720,2,"h");add("Faldón",L-2*T,300,1,"w");
      }else{ // rack / mueble TV
        const L=pick(r,[1200,1500,1800]),D=pick(r,[350,400,450]);
        add("Tapa rack",L,D,2,"w");add("Lateral rack",D,int(r,400,550),2,"h");add("División rack",D-20,int(r,350,500),int(r,1,3),"h");add("Estante rack",int(r,300,600),D-20,int(r,1,3),"w");
      }
    }
    // juntar piezas iguales
    const map=new Map();
    for(const p of parts){const k=`${p.name}|${p.w}|${p.h}|${p.g}`;if(map.has(k))map.get(k).q+=p.q;else map.set(k,{...p})}
    const pieces=[...map.values()].map((p,i)=>({id:i,name:p.name,w:p.w,h:p.h,q:p.q,g:grain?p.g:""}));
    return {name:`mueble-${seed}`,W:board[0],H:board[1],kerf:opts.kerf!=null?opts.kerf:pick(r,[3,4,4,4.4]),margin:opts.margin!=null?opts.margin:pick(r,[0,5,10,10]),grain,maxB:Infinity,force:{},pieces};
  }

  // ---------- clases clásicas I–X (Berkey & Wang, Martello & Vigo) ----------
  // Giro permitido, sin kerf ni márgenes, medidas enteras.
  function classic(cls,n,seed){
    const r=rng(seed*131+cls*7919+n);
    let W,H,gen;
    const U=(a,b)=>int(r,a,b);
    switch(cls){
      case 1:W=H=10;gen=()=>[U(1,10),U(1,10)];break;
      case 2:W=H=30;gen=()=>[U(1,10),U(1,10)];break;
      case 3:W=H=40;gen=()=>[U(1,35),U(1,35)];break;
      case 4:W=H=100;gen=()=>[U(1,35),U(1,35)];break;
      case 5:W=H=100;gen=()=>[U(1,100),U(1,100)];break;
      case 6:W=H=300;gen=()=>[U(1,100),U(1,100)];break;
      default:{
        W=H=100;
        const types=[()=>[U(66,100),U(1,50)],()=>[U(1,50),U(66,100)],()=>[U(50,100),U(50,100)],()=>[U(1,50),U(1,50)]];
        const main={7:0,8:1,9:2,10:3}[cls];
        gen=()=>{const x=r();let t;if(x<0.7)t=main;else{const o=[0,1,2,3].filter(i=>i!==main);t=o[Math.min(2,Math.floor((x-0.7)/0.1))]}return types[t]()};
      }
    }
    const pieces=[];
    for(let i=0;i<n;i++){const [w,h]=gen();pieces.push({id:i,name:"P"+i,w,h,q:1,g:""})}
    return {name:`clase${cls}-n${n}-s${seed}`,W,H,kerf:0,margin:0,grain:false,maxB:Infinity,force:{},pieces};
  }

  // ---------- casos de estrés ----------
  function stress(seed){
    const r=rng(seed+999);
    const kind=seed%4;
    const pieces=[];
    if(kind===0){pieces.push({id:0,name:"Estante",w:int(r,300,900),h:int(r,200,400),q:int(r,60,200),g:""})}
    else if(kind===1){for(let i=0;i<int(r,30,60);i++)pieces.push({id:i,name:"P"+i,w:int(r,50,400),h:int(r,50,400),q:int(r,1,3),g:""})}
    else if(kind===2){for(let i=0;i<int(r,8,15);i++)pieces.push({id:i,name:"G"+i,w:int(r,900,2600),h:int(r,600,1700),q:int(r,1,2),g:""})}
    else{for(let i=0;i<int(r,15,25);i++)pieces.push({id:i,name:"M"+i,w:int(r,100,1800),h:int(r,80,900),q:int(r,1,6),g:pick(r,["","","w","h"])})}
    return {name:`estres${kind}-${seed}`,W:2750,H:1830,kerf:4,margin:10,grain:kind===3,maxB:Infinity,force:{},pieces};
  }

  function suite(name,count,offset=0){
    const out=[];
    if(name==="muebles")for(let i=0;i<count;i++)out.push(furniture(1000+offset+i));
    else if(name==="muebles-grandes")for(let i=0;i<count;i++)out.push(furniture(5000+offset+i,{modules:6+(i%5)}));
    else if(name==="estres")for(let i=0;i<count;i++)out.push(stress(offset+i));
    else if(name.startsWith("clase")){
      const cls=+name.slice(5);
      const ns=[20,40,60,80,100];
      for(let i=0;i<count;i++)out.push(classic(cls,ns[i%5],offset+Math.floor(i/5)+1));
    }
    return out;
  }
  return {rng,furniture,classic,stress,suite};
})();
