"""Build the offline, self-contained River Chronicles HTML using Python only."""
from pathlib import Path
import base64,json,hashlib
D=Path(__file__).resolve().parent
three='data:text/javascript;base64,'+base64.b64encode((D/'vendor/three.module.min.js').read_bytes()).decode()
data='\n'.join('const '+name+'='+json.dumps(json.loads((D/file).read_text()),ensure_ascii=False)+';' for name,file in [('QUESTION_BANK','question-bank.json'),('TERM_BANK','term-bank.json'),('WORLD_BANK','world-question-bank.json'),('PRACTICAL_BANK','practical-question-bank.json')])
js=f'import * as THREE from "{three}";\n'+(D/'curriculum.js').read_text()+'\n'+(D/'gods-data.js').read_text()+'\n'+(D/'god-art.js').read_text()+'\n'+(D/'model.js').read_text()+'\n'+data+'\n'+(D/'scene.js').read_text()+'\n'+(D/'god-models.js').read_text()+'\n'+(D/'gods.js').read_text()+'\n'+(D/'game.js').read_text()
html='<!doctype html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#173632"><title>River Chronicles · Gods of the Nile</title><style>'+(D/'style.css').read_text()+'</style></head><body>'+(D/'body.html').read_text()+'<script type="module">'+js.replace('</script','<\\/script')+'</script><!-- Three.js MIT licence\n'+(D/'vendor/THREE-LICENSE.txt').read_text()+'--></body></html>'
tmp=D/'index.html.tmp'
tmp.write_text(html,encoding='utf-8')
tmp.replace(D/'index.html')
print('Built index.html:',len(html.encode()),'bytes; SHA256',hashlib.sha256(html.encode()).hexdigest())
