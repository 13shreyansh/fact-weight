import fs from 'node:fs';
import path from 'node:path';
import {decryptSecret} from './secrets.mjs';

const allowed=new Set(['VERDA_INFERENCE_KEY','TIGER_DATABASE_URL','TIGER_CA_CERT_B64']);
export function parseSponsorSecrets(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.has(k)||typeof value[k]!=='string'))throw Error('Invalid sponsor runtime configuration.');
 return value;
}
export function loadSponsorSecrets(file=path.join(process.env.SIGNAL_DATA||'data','sponsors.enc')){
 if(!fs.existsSync(file))return false;
 if(!process.env.CONTEXT_DEV_API_KEY)throw Error('The existing runtime encryption credential is unavailable.');
 const value=parseSponsorSecrets(JSON.parse(decryptSecret(JSON.parse(fs.readFileSync(file,'utf8')))));
 for(const [key,secret]of Object.entries(value))if(!process.env[key])process.env[key]=secret;
 return true;
}
