# Frontend install

The previous generated package-lock.json was removed because several npm integrity hashes were corrupted.
Regenerate it locally from package.json:

```bash
rm -rf node_modules package-lock.json
npm cache verify
npm install
npm run dev
```

If npm still reports EINTEGRITY after the lockfile has been removed:

```bash
npm cache clean --force
npm install
```
