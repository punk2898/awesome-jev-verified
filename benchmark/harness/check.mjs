import { experimental_evaluate as evaluate } from 'ai';
let ok=0,fail=0; const lats=[];
await Promise.all(Array.from({length:20},async(_,i)=>{ try{const t=performance.now(); await evaluate({model:'typesafe-ai/jev',state:'Hello',questions:{g:{type:'boolean',instructions:'Is this a greeting?'}},maxRetries:0}); lats.push(Math.round(performance.now()-t)); ok++;}catch(e){fail++; console.log(e.message.slice(0,120));}}));
console.log({ok,fail,lats:lats.sort((a,b)=>a-b)});
