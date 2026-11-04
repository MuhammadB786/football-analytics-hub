import {createHash} from 'node:crypto';
import {researchCore} from './research-core.js';
export {audit} from './research-core.js';
export function research(rows,options){return researchCore(rows,options,text=>createHash('sha256').update(text).digest('hex'));}
