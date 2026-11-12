"""Local dev server for the portfolio.

Like `python3 -m http.server`, with three differences:
- it tells the browser to check for a newer copy of every file on each load (Cache-Control: no-cache);
  the plain server sends no caching headers, so an edited module can keep loading from cache;
- it listens on this machine only (127.0.0.1), not on every network you're connected to;
- it refuses hidden paths (/.git/, /.claude/, .DS_Store), which the plain server would hand to anyone.

    python3 scripts/serve.py                # http://localhost:8000
    python3 scripts/serve.py 9000           # another port
    python3 scripts/serve.py --root dist    # preview the built site (after sh scripts/build.sh)
"""
import functools
import http.server
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if any(part.startswith(".") for part in path.split("/")):
            self.send_error(404, "Not found")
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    args = sys.argv[1:]
    root = ROOT
    if "--root" in args:
        i = args.index("--root")
        root = (ROOT / args[i + 1]).resolve()
        del args[i:i + 2]
    port = int(args[0]) if args else 8000
    handler = functools.partial(DevHandler, directory=str(root))
    with http.server.ThreadingHTTPServer((HOST, port), handler) as server:
        print(f"Serving {root} at http://localhost:{port}")
        server.serve_forever()


if __name__ == "__main__":
    main()
