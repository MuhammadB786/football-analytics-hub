import {table,ratings,finished,predict,simulateSeason} from './analytics.js';
import {researchCore,audit} from './research-core.js';

export function createStaticApi(archive,evaluation) {
  return async function request(path,query={}) {
    const competition=query.competition||'PD';
    if(!['PD','PL'].includes(competition))throw new Error('Unsupported competition');
    const rows=archive.filter(m=>m.competition===competition),season=query.season||rows.at(-1)?.season,selected=rows.filter(m=>m.season===season);
    if(path==='overview')return {competition,season,seasons:[...new Set(rows.map(m=>m.season))].sort().reverse(),teams:[...new Set(rows.flatMap(m=>[m.home,m.away]))].sort(),matches:selected,table:table(selected),officialTable:null,scorers:null,ratings:[...ratings(rows)].map(([name,rating])=>({name,rating})).sort((a,b)=>b.rating-a.rating),total:rows.length,coverage:{first:rows[0]?.date,last:rows.at(-1)?.date,archive:true,live:false,eventData:false},health:{configured:false,lastSuccess:null,run:null,stale:true},mode:'historical-static'};
    if(path==='match'){const m=rows.find(m=>m.id===query.id);if(!m)throw new Error('Match not found');return m;}
    if(path==='audit')return audit(rows);
    if(path==='evaluation')return evaluation;
    if(path==='research'){
      const result=researchCore(rows,query,async text=>{
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      });result.fingerprint=await result.fingerprint;return result;
    }
    if(path==='history'){
      const filtered=finished(rows).filter(m=>(!query.team||m.home===query.team||m.away===query.team)&&(!query.opponent||m.home===query.opponent||m.away===query.opponent)&&m.season>=(query.from||'')&&m.season<=(query.to||'9999'));
      return {matches:filtered,table:table(filtered),seasons:[...new Set(filtered.map(m=>m.season))].sort().map(season=>{const ms=filtered.filter(m=>m.season===season);return {season,matches:ms.length,goals:ms.reduce((s,m)=>s+m.hg+m.ag,0)/ms.length,homeWin:ms.filter(m=>m.hg>m.ag).length/ms.length,team:table(ms).find(t=>t.name===query.team)||null};})};
    }
    if(path==='predict'){
      const train=rows.filter(m=>!query.before||m.date.slice(0,10)<query.before.slice(0,10));
      if(!query.home||!query.away||query.home===query.away||![query.home,query.away].every(t=>train.some(m=>m.home===t||m.away===t)))throw new Error('Choose two clubs with available history');
      return {...predict(train,query.home,query.away),trainingThrough:finished(train).at(-1)?.date,homeTeam:query.home,awayTeam:query.away};
    }
    if(path==='simulation')return simulateSeason(rows,selected);
    throw new Error('Unknown endpoint');
  };
}
