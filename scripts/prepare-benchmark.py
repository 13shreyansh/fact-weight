import csv,json,hashlib,collections,os
from pathlib import Path
rows=list(csv.DictReader(open('work/euvsdisinfo/data/euvsdisinfo_base.csv')))
war=[r for r in rows if any(t in r['keywords'].lower() for t in ['war in ukraine','ukraine','russian invasion'])]
groups=sorted(set(r['debunk_id'] for r in war),key=lambda s:hashlib.sha256(('signal-fire-benchmark-v1:'+s).encode()).hexdigest())
dev=set(groups[:len(groups)//3]);splits={'dev':[r for r in war if r['debunk_id'] in dev],'heldout':[r for r in war if r['debunk_id'] not in dev]}
base=Path('artifacts/benchmark');base.mkdir(parents=True,exist_ok=True)
for split,items in splits.items():
 (base/(split+'-manifest.json')).write_text(json.dumps(items,ensure_ascii=False,indent=2))
 ordered=sorted(items,key=lambda r:hashlib.sha256(('selection-v1:'+r['article_id']).encode()).hexdigest())
 selected=[]
 # The queue is fixed before retrieval and model evaluation. Balanced labels, then hash order.
 for label in ['trustworthy','disinformation']:
  selected.extend([r for r in ordered if r['class']==label][:100])
 (base/(split+'-queue.json')).write_text(json.dumps(selected,ensure_ascii=False))
summary={'content':{'total':len(rows),'war':len(war),'trustworthy':sum(r['class']=='trustworthy' for r in war),'disinformation':sum(r['class']=='disinformation' for r in war),'url':'https://github.com/joaoaleite/euvsdisinfo','license':'CC-BY-SA-4.0','warFilter':'Keywords include Ukraine, War in Ukraine or Russian invasion','splitUnit':'debunk_id','dev':len(splits['dev']),'heldout':len(splits['heldout'])},'status':'not measured','leadSubset':0,'limitations':['Content labels do not establish coordination. Campaign replay requires timestamped post corpora.']}
(base/'inventory.json').write_text(json.dumps(summary,indent=2));print(summary)
