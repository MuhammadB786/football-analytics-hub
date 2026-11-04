import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.js';
import {createStaticApi} from '../src/static-api.js';
import {research} from '../src/research.js';
test('subscription-free demo uses identical research evidence and supports every product route',async()=>{
  const s=openStore(':memory:');try{const rows=s.all(),api=createStaticApi(rows,{model:'fixture'});
    const overview=await api('overview',{competition:'PD'});assert.equal(overview.total,11664);assert.equal(overview.health.configured,false);
    const q={team:'Barcelona',opponent:'Real Madrid'};const value=await api('research',q);assert.deepEqual(value,research(rows,q));
    assert.equal((await api('history',q)).matches.length,61);assert.equal((await api('audit')).invalid,0);
    assert.equal((await api('match',{id:rows[0].id})).id,rows[0].id);assert.ok((await api('predict',{home:'Barcelona',away:'Real Madrid'})).home>0);
    assert.ok((await api('simulation')).unavailable);assert.equal((await api('overview',{competition:'PL'})).total,0);
    await assert.rejects(api('research',{team:'Barcelona',opponent:'Barcelona'}));await assert.rejects(api('predict',{home:'missing',away:'Barcelona'}));
  }finally{s.db.close();}
});
test('independently checked match and season totals agree with the bundled archive',()=>{
  const s=openStore(':memory:');try{const rows=s.all();const may=rows.find(m=>m.date==='2025-05-11'&&m.home==='Barcelona'&&m.away==='Real Madrid');assert.deepEqual([may.hg,may.ag],[4,3]);const oct=rows.find(m=>m.date==='2025-10-26'&&m.home==='Real Madrid'&&m.away==='Barcelona');assert.deepEqual([oct.hg,oct.ag],[2,1]);const madrid=research(rows,{team:'Real Madrid',from:'2011-12',to:'2011-12'});assert.equal(madrid.matches.length,38);assert.equal(madrid.facts[1].metrics[0][1],(121/38).toFixed(2));const barca=research(rows,{team:'Barcelona',from:'2014-15',to:'2014-15'});assert.equal(barca.matches.reduce((sum,m)=>sum+(m.home==='Barcelona'?m.hg:m.ag),0),110);}finally{s.db.close();}
});
