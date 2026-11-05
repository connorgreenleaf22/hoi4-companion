# Laptop setup and branch workflow

The repository contains the application source, not the installed game, personal data, release binaries, or local QA captures. Install Git and Node.js 24 or newer on Windows, and install Hearts of Iron IV separately if you want to index your own game files.

After the private repository is created, substitute its actual URL below:

```powershell
git clone <PRIVATE_REPOSITORY_URL>
cd hoi4-companion
git switch develop
npm ci
npm test
npm run build
npm start
```

The app discovers the game on first launch; if needed, set the installation directory in Sources & settings. Its data is stored separately under `%APPDATA%\HOI4 Companion`; personal saves and databases are not transferred by Git. Back up and transfer personal data separately only if desired, with the application closed. See README.md for data migration and recovery details.

Keep `main` as the stable baseline. Develop on `develop` or short-lived branches based on it; commit and push changes, then pull them on the other computer. Review changes before merging into `main`. Local archived candidate ZIPs and QA logs are excluded from Git; retain the desktop backup for those historical materials. Some historical QA scripts contain machine-specific paths and may need configuration before use on another computer.
