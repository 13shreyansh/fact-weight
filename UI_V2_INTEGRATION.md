# UI v2 integration (for the engine/server)

New static UI in `public/`: `index.html`, `country.html`, `story.html`, `method.html`, `sf.css`, `sf.js`, `mark-v2.svg`, `fonts/barlow*.woff2`. Old `app.js`/`style.css` are no longer referenced.

## Server routes needed
- `GET /` -> public/index.html
- `GET /country` -> public/country.html (reads `?cc=FI`)
- `GET /story` -> public/story.html (reads `?id=<story id>`)
- `GET /method` -> public/method.html
- Any other `GET` path that names a file under public/ (e.g. `/sf.js`, `/sf.css`, `/fonts/barlow-latin-500-normal.woff2`, `/mark-v2.svg`) -> that file with the right Content-Type (`.woff2` = font/woff2, `.svg` = image/svg+xml). Reject `..`. Cache fonts long (`max-age=31536000, immutable`), HTML/JS/CSS `no-cache`.

## API the UI reads (tolerant of extra fields; arrays may also come wrapped as {countries:[]}, {stories:[]})
- `GET /api/countries` -> [{code,name,status,built_at,stories_checked,clusters,top_actor,top_narrative}]
- `GET /api/countries/<CC>` -> {code,name,status,built_at,stories_checked,copies_found?,clusters[],narratives[],organic_examples[],pickup?[{platform,url,title,published_at,views}],build_id? (when building)}. 404 or status not_built -> UI shows "Read <country> now" and POSTs build.
  - cluster: {id,label,sites[] (strings or {domain}),site_count,documented_by[] (strings or {name,url}),origins_top[] (strings or {name,count}),domain_ages ({median_days,min_days} or {reason}),shared_infra[] (strings),stories_copied,median_copy_lag_min,verdict,reasons[]}
  - narrative: {id,label,cluster_id,articles,trend_30d[30 numbers, oldest first],first_seen,examples[{headline,url}]}
  - organic example: {story_id?,title,outlets,reasons[]}
- `GET /api/stories?country=CC` -> [{id,title,outlet,published_at,copies,countries_reached,verdict,cluster_id}]
- `GET /api/stories/<id>` -> {title,verdict,mainstream[{outlet,url,published_at,headline}],copies[{site,cluster_id,url,published_at,headline,lang,country}],first_mainstream_at,first_copy_at,lag_minutes,countries_reached,spin[{copy_url,added_phrases[],labels[]}],method_note,back_country?}
- `POST /api/countries/<CC>/build` -> {id}; on cap return 429 with {error:"..."} (UI shows "budget used up, resumes tomorrow").
- `GET /api/builds/<id>` -> {status: running|done|failed, message?, error?, steps[{name|label,status: waiting|running|done|failed,ms,calls:{exa:n,context_dev:n},detail?}]}
- `GET /api/stats` -> {computed_at,stories_read,pages_fetched,copies_confirmed,sites_seen,groups,monitors_live,languages,last_event_at,...}
- `GET /api/live?limit=20&country=` -> [{id,at,type: copy_detected|group_grew|build_done|new_story,country,site,url,headline,story_id,cluster_id,lag_min,source}]
- `GET /api/countries/<CC>/graph` -> {computed_at,nodes:[{id,cluster_id,stories,lang,documented}],edges:[{a,b,w}]}
- `POST /api/watch` {country,webhook_url} -> {id}
- `GET /api/method` (optional) -> {computed_at,thresholds{jaccard,window_min,min_sites,min_stories},spend{exa:{used,cap},...},eval{...}}

Verdict strings must be exactly: "Looks coordinated: strong", "Looks coordinated: moderate", "Looks organic", "Not enough data". All times ISO 8601 UTC.

Local preview with fixtures: `node scripts/ui-dev.mjs` then open http://localhost:4321.
