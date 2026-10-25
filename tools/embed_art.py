"""Rebuild the embedded JPEG map without external Python packages."""
from pathlib import Path
import base64,json
ROOT=Path(__file__).resolve().parents[1]
IDS=['ra','isis','shu','apis','hapi','osiris','anubis']
art={id:'data:image/jpeg;base64,'+base64.b64encode((ROOT/'assets'/'gods'/(id+'.jpg')).read_bytes()).decode('ascii') for id in IDS}
(ROOT/'god-art.js').write_text('const GOD_ART='+json.dumps(art)+';\n',encoding='utf-8')
print('Embedded seven card portraits. Check ASSET-SOURCES.md when replacing artwork.')
