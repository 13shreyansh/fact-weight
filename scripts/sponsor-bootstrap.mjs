import {loadSponsorSecrets} from '../signal/sponsor-secrets.mjs';
try{loadSponsorSecrets();}catch{console.warn('Additional service credentials could not be loaded. Existing source collection remains available.');}
await import('../signal/server.mjs');
