#!/bin/sh
# Builds the folder that gets published: only the site itself (plus .well-known/security.txt), so README,
# scripts/, .claude/ and the rest of the repo stay private. Cloudflare runs this as the build command, with
# output directory dist.
#
#   sh scripts/build.sh        # then preview with: python3 scripts/serve.py --root dist
set -eu
cd "$(dirname "$0")/.."
rm -rf dist
mkdir dist
cp index.html 404.html _headers dist/
cp -R assets data .well-known dist/
find dist -name '.DS_Store' -delete
echo "Built dist/: $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"
