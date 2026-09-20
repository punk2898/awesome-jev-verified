// Harder versions of the known-weakness probes. Appended to data/tasks.json as suites wh_*.
import fs from 'node:fs';
const T = JSON.parse(fs.readFileSync('data/tasks.json')).filter(t => !t.suite.startsWith('wh_'));
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)); const pick = a => a[Math.floor(rnd() * a.length)];
const YN = { true: 'Yes, the statement is exactly correct.', false: 'No, the statement is incorrect.' };
const add = (o) => T.push({ kind: 'noul', criteria: YN, ...o });
for (let i = 0; i < 30; i++) { const a = ri(12, 99), b = ri(12, 99), t = rnd() < .5, c = t ? a * b : a * b + pick([-a, a, -10, 10, -1, 1]);
  add({ id: `hmul-${i}`, suite: 'wh_math', state: 'Arithmetic check.', instructions: `Is ${a} × ${b} equal to ${c}?`, label: t }); }
for (let i = 0; i < 30; i++) { const a = ri(1000, 9999), b = ri(1000, 9999), t = rnd() < .5, c = t ? a + b : a + b + pick([-100, 100, -9, 9, -1, 1]);
  add({ id: `hadd-${i}`, suite: 'wh_math', state: 'Arithmetic check.', instructions: `Is ${a} + ${b} equal to ${c}?`, label: t }); }
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'], p2 = n => String(n).padStart(2, '0');
for (let i = 0; i < 40; i++) {
  const d1 = new Date(Date.UTC(ri(2019, 2026), ri(0, 11), ri(1, 28))), d2 = new Date(d1.getTime() + pick([-1, 1]) * ri(1, 3) * 864e5);
  const f1 = i % 2 ? `${p2(d1.getUTCDate())}/${p2(d1.getUTCMonth() + 1)}/${d1.getUTCFullYear()} (DD/MM/YYYY)` : `${MON[d1.getUTCMonth()]} ${d1.getUTCDate()}, ${d1.getUTCFullYear()}`;
  const f2 = `${p2(d2.getUTCMonth() + 1)}/${p2(d2.getUTCDate())}/${d2.getUTCFullYear()} (MM/DD/YYYY)`;
  add({ id: `hdate-${i}`, suite: 'wh_dates', state: { first_date: f1, second_date: f2 }, instructions: `Is the first date earlier than the second date?`, label: d1 < d2 });
}
const PPL = ['Alice','Bob','Carol','Dave','Erin','Frank','Grace','Heidi','Ivan','Judy'];
for (let i = 0; i < 30; i++) {
  const reports = Object.fromEntries(PPL.map(p => [p, pick(PPL.filter(q => q !== p))])), city = Object.fromEntries(PPL.map(p => [p, pick(['Paris','Tokyo','Lima','Oslo','Cairo'])]));
  const who = pick(PPL), m2 = reports[reports[who]], truthCity = city[m2], t = rnd() < .5, asked = t ? truthCity : pick(['Paris','Tokyo','Lima','Oslo','Cairo'].filter(c => c !== truthCity));
  add({ id: `h3hop-${i}`, suite: 'wh_indirection', state: { reports_to: reports, lives_in: city }, instructions: `Does the manager of ${who}'s manager live in ${asked}?`, label: t });
}
const FRUIT = ['apple','banana','cherry','mango','pear','plum','kiwi','grape'], OTHER = ['chair','river','laptop','tiger','cloud','piano','brick','train'];
for (let i = 0; i < 30; i++) {
  const list = Array.from({ length: ri(12, 30) }, () => rnd() < .4 ? pick(FRUIT) : pick(OTHER)), n = list.filter(x => FRUIT.includes(x)).length, t = rnd() < .5, asked = t ? n : n + pick([-2, -1, 1, 2]);
  add({ id: `hcount-${i}`, suite: 'wh_counting', state: { items: list }, instructions: `Does the items list contain exactly ${asked} fruits?`, label: t });
}
fs.writeFileSync('data/tasks.json', JSON.stringify(T, null, 1));
const c = {}; for (const t of T.filter(t => t.suite.startsWith('wh_'))) c[t.suite] = (c[t.suite] || 0) + 1; console.log(c);
