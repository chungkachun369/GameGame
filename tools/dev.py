"""Local/Codespaces server. Rebuild on source changes; refresh browser to play."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, subprocess, sys, threading, time, functools
ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8000'))
SOURCES = ['body.html','style.css','curriculum.js','model.js','scene.js','game.js',
           'gods-data.js','god-models.js','gods.js','god-art.js','build.py',
           'question-bank.json','term-bank.json','world-question-bank.json',
           'practical-question-bank.json','vendor/three.module.min.js','vendor/THREE-LICENSE.txt']

def signature():
    return tuple((f, (ROOT/f).stat().st_mtime_ns, (ROOT/f).stat().st_size) for f in SOURCES)

def build():
    return subprocess.run([sys.executable, str(ROOT/'build.py')], cwd=ROOT).returncode == 0

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def do_GET(self):
        # Never expose repository internals or local secrets through preview URLs.
        from urllib.parse import unquote, urlsplit
        parts = Path(unquote(urlsplit(self.path).path)).parts
        if any(x.startswith('.') for x in parts if x not in ('/','')) or 'node_modules' in parts:
            self.send_error(404); return
        super().do_GET()

def watch():
    last = signature()
    while True:
        time.sleep(.75)
        try:
            current = signature()
            if current != last:
                time.sleep(.15)
                print('Source changed. Rebuilding…', flush=True)
                if build(): print('Updated. Refresh the game preview.', flush=True)
                else: print('Build failed. Fix the terminal error and save again.', flush=True)
                last = current
        except (FileNotFoundError, OSError) as e:
            print('Waiting for source files:', e, flush=True)

if __name__ == '__main__':
    (ROOT/'qa').mkdir(exist_ok=True)
    try:
        server = ThreadingHTTPServer(('0.0.0.0',PORT), functools.partial(Handler,directory=str(ROOT)))
    except OSError as e:
        print(f'Cannot start preview on port {PORT}: {e}. Another preview may already be running.',file=sys.stderr)
        sys.exit(1)
    if not build(): server.server_close(); sys.exit(1)
    threading.Thread(target=watch,daemon=True).start()
    print(f'River Chronicles preview: http://localhost:{PORT} — edit source, save, then refresh.',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
