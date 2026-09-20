import { experimental_evaluate as evaluate } from 'ai';
const t=performance.now();
const r = await evaluate({
  model: 'typesafe-ai/jev',
  state: 'I was charged twice. Please refund the duplicate.',
  questions: {
    requestsRefund: { type: 'boolean', instructions: 'Is the customer requesting money back?' },
    dept: { type:'choice', instructions:'Which team?', criteria:{billing:'Charges and refunds', technical:'Bugs', account:'Login'} },
    sev: { type:'score', instructions:'How severe?', criteria:['Cosmetic','Degraded','Blocking'] },
  },
});
console.log('ms', Math.round(performance.now()-t));
console.log(JSON.stringify({answers:r.answers, meta:r.providerMetadata, usage:r.usage, warnings:r.warnings, keys:Object.keys(r)},null,1));
