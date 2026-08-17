#!/usr/bin/env bash
# inject-pwa.sh — à lancer après `npx expo export --platform web`
# Copie les fichiers PWA dans dist/ et patche index.html (manifest, icônes iOS, service worker)
set -e

DIST="dist"
PWA="pwa"

if [ ! -f "$DIST/index.html" ]; then
  echo "Erreur : $DIST/index.html introuvable. Lancez d'abord : npx expo export --platform web"
  exit 1
fi

# 1. Copier les assets PWA
cp "$PWA/manifest.json" "$PWA/sw.js" "$PWA/icon-192.png" "$PWA/icon-512.png" "$PWA/apple-touch-icon.png" "$DIST/"

# 2. Fichier .nojekyll (GitHub Pages ignore sinon les dossiers _expo)
touch "$DIST/.nojekyll"

# 3. Injecter les balises dans <head>
HEAD_INJECT='<link rel="manifest" href="/cas-pedago/manifest.json"><link rel="apple-touch-icon" href="/cas-pedago/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Cas Pédago"><meta name="theme-color" content="#1F3864">'

# 4. Injecter l'enregistrement du service worker avant </body>
SW_INJECT='<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/cas-pedago/sw.js",{scope:"/cas-pedago/"}))}</script>'

python3 - "$DIST/index.html" << EOF
import sys
p = sys.argv[1]
html = open(p, encoding="utf-8").read()
head = '''$HEAD_INJECT'''
sw = '''$SW_INJECT'''
if "manifest.json" not in html:
    html = html.replace("</head>", head + "</head>", 1)
if "serviceWorker" not in html:
    html = html.replace("</body>", sw + "</body>", 1)
open(p, "w", encoding="utf-8").write(html)
print("index.html patché (manifest + icônes iOS + service worker)")
EOF

echo "PWA prête dans $DIST/ — déployez avec : npx gh-pages -d dist --dotfiles"
