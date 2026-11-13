"""Local dev server for the portfolio.

Like `python3 -m http.server`, with these differences:
- it sends the same response headers as the live site, read from `_headers` (the security policy, framing,
  referrer and the rest), so a page that breaks the policy breaks here first, before it's deployed;
- it tells the browser to check for a newer copy of every file on each load (Cache-Control: no-cache);
  the plain server sends no caching headers, so an edited module can keep loading from cache;
- a missing page gets 404.html with a 404 status, as on the live site;
- it listens on this machine only (127.0.0.1), not on every network you're connected to;
- it refuses hidden paths (/.git/, /.claude/, .DS_Store), which the plain server would hand to anyone,
  except /.well-known/, which the live site serves.

    python3 scripts/serve.py                # http://localhost:8000
    python3 scripts/serve.py 9000           # another port
    python3 scripts/serve.py --root dist    # preview the built site (after sh scripts/build.sh)
"""
import functools
import http.server
import pathlib
import re
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"


def read_header_rules(path):
    """The rules in a Cloudflare `_headers` file: [(pattern, [(name, value or None to detach)])].

    A rule is a path on its own line, then its headers indented below it: `Name: value`, or `! Name` to drop
    one set by an earlier rule. `*` matches anything, `:name` one path segment. Rules for absolute URLs
    (another host, such as the workers.dev address) don't apply here and are skipped."""
    rules = []
    if not path.is_file():
        return rules
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line[0].isspace():
            rules.append((line.strip(), []))
        elif rules:
            text = line.strip()
            if text.startswith("!"):
                rules[-1][1].append((text[1:].strip(), None))
            elif ":" in text:
                name, value = text.split(":", 1)
                rules[-1][1].append((name.strip(), value.strip()))
    compiled = []
    for pattern, headers in rules:
        if re.match(r"https?://", pattern):
            continue
        regex = "".join(".*" if part == "*" else "[^/]+" if part.startswith(":") else re.escape(part)
                        for part in re.split(r"(\*|:[A-Za-z]\w*)", pattern))
        compiled.append((re.compile(regex + r"\Z"), headers))
    return compiled


def headers_for(rules, path):
    """The headers for a request path: every matching rule in file order; a repeated name is joined with
    commas and `! Name` removes it, as Cloudflare does."""
    out = {}
    for regex, headers in rules:
        if not regex.match(path):
            continue
        for name, value in headers:
            key = name.lower()
            if value is None:
                out.pop(key, None)
            elif key in out:
                out[key] = (out[key][0], out[key][1] + ", " + value)
            else:
                out[key] = (name, value)
    return list(out.values())


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def request_path(self):
        return urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)

    def send_head(self):
        path = self.request_path()
        hidden = any(part.startswith(".") for part in path.split("/"))
        if hidden and not path.startswith("/.well-known/"):
            self.send_error(404, "Not found")
            return None
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        # a missing page gets the site's own 404 page, as on Cloudflare
        page = pathlib.Path(self.directory) / "404.html"
        if code != 404 or not page.is_file():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404, message)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def end_headers(self):
        # read on every request, so an edit to _headers applies on the next reload
        rules = read_header_rules(pathlib.Path(self.directory) / "_headers")
        for name, value in headers_for(rules, self.request_path()):
            if name.lower() != "cache-control":  # locally, always check for a newer copy (below)
                self.send_header(name, value)
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
