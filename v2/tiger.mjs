import pg from 'pg';

let livePool, ready;
export const tigerConfigured = () => !!process.env.TIGER_DATABASE_URL;
export function tigerPool() {
  if (!tigerConfigured()) return null;
  if (!livePool) {
    const url = new URL(process.env.TIGER_DATABASE_URL);
    // pg connection-string sslmode can override ssl options. TLS verification stays explicit.
    url.searchParams.delete('sslmode');url.searchParams.delete('sslrootcert');
    const ca = process.env.TIGER_CA_CERT_B64 ? Buffer.from(process.env.TIGER_CA_CERT_B64,'base64').toString() : undefined;
    livePool = new pg.Pool({ connectionString:url.toString(), ssl:{rejectUnauthorized:true,...(ca?{ca}:{})}, max:3, connectionTimeoutMillis:5000, idleTimeoutMillis:10000, statement_timeout:10000 });
    livePool.on('error', () => {});
  }
  return livePool;
}
export const TIGER_SCHEMA = `CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE TABLE IF NOT EXISTS sf_mentions(country TEXT NOT NULL,narrative_id TEXT NOT NULL,url TEXT NOT NULL,published_at TIMESTAMPTZ NOT NULL,site TEXT NOT NULL,observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(country,narrative_id,url,published_at));
SELECT create_hypertable('sf_mentions','published_at',if_not_exists=>TRUE,migrate_data=>TRUE);
CREATE INDEX IF NOT EXISTS sf_mentions_narrative ON sf_mentions(country,narrative_id,published_at DESC);`;
export async function ensureTiger(pool = tigerPool()) {
  if (!pool) return false;
  if (!ready) ready = pool.query(TIGER_SCHEMA).catch(error => {ready=null;throw error;});
  await ready; return true;
}
export function mentionRows(country, narratives) {
  const seen = new Set(), rows=[];
  for (const n of narratives) for (const e of n.timeline_mentions || n.examples || []) {
    if (!/^https:\/\//.test(e.url || '') || !Number.isFinite(Date.parse(e.published_at))) continue;
    const at = new Date(e.published_at).toISOString(), key=JSON.stringify([country,n.id,e.url,at]);
    if (seen.has(key)) continue; seen.add(key);
    rows.push([country,n.id,e.url,at,String(e.site || new URL(e.url).hostname).slice(0,255)]);
  }
  return rows;
}
export async function saveMentions(country, narratives, pool = tigerPool()) {
  if (!pool) return {enabled:false,inserted:0};
  await ensureTiger(pool);
  const rows = mentionRows(country,narratives);
  let inserted=0;
  const client=typeof pool.connect==='function'?await pool.connect():pool;
  await client.query('BEGIN');
  try{
   // Corrected source timestamps replace the previous date instead of double-counting a page.
   for (let start=0;start<rows.length;start+=1000) {
    const slice=rows.slice(start,start+1000),values=slice.flat(),slots=slice.map((_,i)=>'('+[1,2,3,4,5].map(j=>'$'+(i*5+j)+(j===4?'::timestamptz':'')).join(',')+')').join(',');
    await client.query('DELETE FROM sf_mentions AS old USING (VALUES '+slots+') AS incoming(country,narrative_id,url,published_at,site) WHERE old.country=incoming.country AND old.narrative_id=incoming.narrative_id AND old.url=incoming.url AND old.published_at<>incoming.published_at',values);
    const result=await client.query('INSERT INTO sf_mentions(country,narrative_id,url,published_at,site) VALUES '+slots+' ON CONFLICT DO NOTHING',values);
    inserted+=result.rowCount;
   }
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release?.();}

  return {enabled:true,inserted};
}
export async function readTimelines(country, ids, pool = tigerPool()) {
  if (!pool || !ids.length) return null;
  await ensureTiger(pool);
  const {rows}=await pool.query("SELECT narrative_id,to_char(time_bucket('1 day',published_at) AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,count(DISTINCT url)::int AS articles FROM sf_mentions WHERE country=$1 AND narrative_id=ANY($2::text[]) AND published_at>=(date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')-INTERVAL '29 days' GROUP BY narrative_id,day ORDER BY day",[country,ids]);
  const grouped=new Map(ids.map(id=>[id,[]]));
  for(const r of rows)grouped.get(r.narrative_id)?.push({date:typeof r.day==='string'?r.day.slice(0,10):r.day.toISOString().slice(0,10),articles:Number(r.articles)});
  const today=Math.floor(Date.now()/86400e3)*86400e3;
  for(const [id,values] of grouped){if(!values.length)continue;const counts=new Map(values.map(v=>[v.date,v.articles]));grouped.set(id,Array.from({length:30},(_,i)=>{const date=new Date(today-(29-i)*86400e3).toISOString().slice(0,10);return {date,articles:counts.get(date)||0};}));}
  return grouped;
}
export async function closeTiger(){if(livePool)await livePool.end();livePool=null;ready=null;}
