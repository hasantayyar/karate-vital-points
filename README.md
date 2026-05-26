# Kyusho Memory — Shito-Ryu Vital Points

A React memory trainer for the 34 Shito-Ryu kyusho (vital points).

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Lucide React icons

## Setup

```bash
npm install
npm run dev
```

Place your diagram at `public/vital-points.jpeg`.

## Creating `points.json`

1. Add your diagram as `public/vital-points.jpeg`.
2. Run `npm run dev` and open the app.
3. Use **Edit** mode (default on first load):
   - Toggle **front** / **back** for each side of the body.
   - Select a point name, then **click** its location on the image.
   - Use **Next** until all 24 front and 10 back points are placed.
4. Click **Copy points.json** or **Download**, then replace `src/data/points.json`.

Coordinates are **percentages from the top-left** of the image (`0`–`100`), stored in a `positions` array. Use **multiple entries** for points that appear in more than one place (e.g. Shichu, Futto).

```json
{
  "id": "front-7",
  "order": 7,
  "name": "Shichu",
  "positions": [
    { "x": 38.2, "y": 22.1 },
    { "x": 61.8, "y": 22.1 }
  ]
}
```

Progress is auto-saved in the browser until you export. Legacy `{ "x", "y" }` entries are converted automatically on load.

## Modes

- **Study** — tap dots to see names
- **Flashcards** — name prompt, click the correct dot; missed points are weighted higher via `localStorage`
- **Quiz** — 10-question round mixing **Locate** (name → tap dot, like flashcards) and **Identify** (pulsing dot → pick the name from four choices); results screen at the end

## Deploy to GitHub Pages (automatic)

Every push to **`main`** builds and deploys via GitHub Actions (see `.github/workflows/deploy-pages.yml`).

Live URL (project site):

`https://<github-username>.github.io/<repo-name>/`

Example: if the repo is named `karate` → `https://youruser.github.io/karate/`

### One-time GitHub setup

1. Push this repo to GitHub (see below).
2. Open the repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not “Deploy from a branch”).
4. Push to `main` (or run the workflow manually under **Actions**).

After the workflow succeeds, your site is live at the URL above.

### First push from your machine

```bash
cd /path/to/karate-vital-points-memory

# If you staged node_modules by mistake, unstage everything first:
git rm -r --cached . 2>/dev/null || true

git add .
git commit -m "Initial commit: Kyusho memory trainer with GitHub Pages deploy"

git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USER` and `YOUR_REPO`. **Repo name = URL path** (e.g. repo `karate` → `/karate/`).

### Local production preview

```bash
npm run build:pages   # uses /karate/ base (change in package.json if your repo name differs)
npm run preview
```

Open `http://localhost:4173/karate/`

Dev: `npm run dev` → `http://localhost:5173/karate/`
