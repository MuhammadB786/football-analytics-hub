import {mkdirSync,readFileSync,writeFileSync,cpSync} from 'node:fs';
import {openStore} from '../src/store.js';
mkdirSync('dist/src',{recursive:true});mkdirSync('dist/reports',{recursive:true});
cpSync('public','dist',{recursive:true});
for(const file of ['analytics.js','research-core.js','static-api.js'])cpSync(`src/${file}`,`dist/src/${file}`);
cpSync('reports/evaluation.json','dist/reports/evaluation.json');
const store=openStore(':memory:');try{writeFileSync('dist/archive.json',JSON.stringify(store.all().filter(m=>m.source==='archive').map(({payload,updated,...m})=>m)));}finally{store.db.close();}
let html=readFileSync('dist/index.html','utf8').replace('<head>','<head>\n<meta name="demo-mode" content="historical-static">').replaceAll('href="/','href="./').replaceAll('src="/','src="./');
writeFileSync('dist/index.html',html);writeFileSync('dist/.nojekyll','');
console.log('Historical demo built in dist/. No secrets or live provider payloads exported.');
