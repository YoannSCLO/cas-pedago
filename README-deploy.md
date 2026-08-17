# Déploiement GitHub Pages — Cas Pédagogiques (PWA)

Résultat final : `https://<ton-user>.github.io/cas-pedago/` installable sur l'écran d'accueil iPhone, icône navy "CP", fonctionne hors ligne, données stockées localement sur le téléphone.

⚠️ Le nom du dépôt doit être **cas-pedago** (les chemins `/cas-pedago/` sont codés dans le manifest et le service worker). Si tu choisis un autre nom, remplace-le dans `app.json`, `pwa/manifest.json` et `pwa/inject-pwa.sh`.

## 0. Préparer le projet (une seule fois)

```bash
cd ~/cas-pedago-v2

# Dépendances web
npx expo install react-dom react-native-web @expo/metro-runtime
```

Copier le dossier `pwa/` fourni (manifest.json, sw.js, inject-pwa.sh, les 3 icônes) à la racine du projet :
```
cas-pedago-v2/
├── App.js
├── app.json
├── pwa/
│   ├── manifest.json
│   ├── sw.js
│   ├── inject-pwa.sh
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
```

Puis rendre le script exécutable :
```bash
chmod +x pwa/inject-pwa.sh
```

## 1. Configurer app.json

Ajouter le bloc `experiments.baseUrl` (indispensable pour que les assets se chargent depuis /cas-pedago/) :

```json
{
  "expo": {
    "name": "Cas Pédago",
    "slug": "cas-pedago",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "splash": { "backgroundColor": "#1F3864" },
    "web": { "bundler": "metro", "output": "static" },
    "experiments": { "baseUrl": "/cas-pedago" }
  }
}
```

## 2. Créer le dépôt GitHub (une seule fois)

Sur github.com : **New repository** → nom `cas-pedago` → privé ou public (Pages fonctionne sur dépôt privé avec un compte Pro, sinon public). Puis :

```bash
cd ~/cas-pedago-v2
git init
git add .
git commit -m "Cas pédagogiques v1"
git branch -M main
git remote add origin git@github.com:<ton-user>/cas-pedago.git
git push -u origin main
```

(Si tu n'as pas de clé SSH configurée, utilise l'URL HTTPS.)

## 3. Builder et déployer

```bash
npx expo export --platform web   # génère dist/
./pwa/inject-pwa.sh              # injecte manifest + icônes + service worker
npx gh-pages -d dist --dotfiles  # pousse dist/ sur la branche gh-pages
```

(`--dotfiles` est nécessaire pour inclure `.nojekyll`.)

## 4. Activer Pages (une seule fois)

Sur GitHub : dépôt → **Settings → Pages** → Source : **Deploy from a branch** → Branch : `gh-pages` / `(root)` → Save. L'URL apparaît après ~1 minute.

## 5. Installer sur l'iPhone

1. Ouvrir `https://<ton-user>.github.io/cas-pedago/` dans **Safari** (pas Chrome)
2. Bouton **Partager** → **"Sur l'écran d'accueil"**
3. L'icône navy "CP" apparaît — l'app s'ouvre en plein écran, sans barre Safari

## Mises à jour ultérieures

Après toute modification de App.js :
```bash
npx expo export --platform web && ./pwa/inject-pwa.sh && npx gh-pages -d dist --dotfiles
```
Sur l'iPhone, fermer/rouvrir l'app deux fois pour que le service worker récupère la nouvelle version.

## Notes

- **Données** : AsyncStorage bascule automatiquement sur localStorage en web → stockées uniquement sur l'iPhone, rien ne transite par GitHub. Attention : « Effacer historique et données de sites » dans Safari efface aussi les cas enregistrés — pense à exporter le CSV régulièrement.
- **Date picker** : en web, `@react-native-community/datetimepicker` n'est pas supporté — si le champ date pose problème au premier test, dis-le moi et je fournis un fallback `<input type="date">` conditionnel (3 lignes).
- **Dépôt public** : le code est visible mais ne contient aucune donnée patient — seul ton iPhone stocke les cas.
