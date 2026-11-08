# MarsPath Explorer

**An interactive, science-led exploration workspace for the Martian surface.**

MarsPath Explorer combines NASA Mars Trek global imagery, a local MOLA elevation grid, curated landmark profiles, conceptual great-circle route analysis, and side-by-side scientific location comparison. It is an educational visualization—not a rover navigation system or terrain-safety tool.

## Features

- **Planetary map:** pan and zoom across the global Mars surface using NASA Mars Trek Viking imagery and MOLA shaded relief.
- **Layer switching:** change the visible basemap from the map controls.
- **Landmark explorer:** inspect Jezero Crater, Gale Crater, and Olympus Mons, including coordinates and scientific context.
- **MOLA elevation reader:** click a map location to read the nearest elevation sample from the bundled MOLA grid.
- **Location comparison:** compare two supported landmarks and their available scientific/elevation information.
- **Mission route planner:** calculate a spherical surface-distance estimate, inspect a sampled great-circle profile, and visualize conceptual routes.
- **Mission records:** save, reload, and delete route configurations in the current browser using `localStorage`.
- **Mission report:** export a report from the route planner.

## Technology

- Vanilla JavaScript (ES modules)
- [Vite](https://vite.dev/) for local development and production builds
- [OpenLayers](https://openlayers.org/) for planetary map rendering
- NASA Mars Trek tiled imagery
- NASA Mars Global Surveyor / MOLA gridded elevation data

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm
- Internet access for NASA Mars Trek map tiles and Google Fonts (the local MOLA grid is bundled)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

The production site is generated in `dist/`. Deploy the contents of `dist/` to any static hosting provider that supports single-page/static sites (for example GitHub Pages, Netlify, or Vercel).

### GitHub Pages

This project uses Vite with `/` as its default base path. Root-domain deployments are supported by default. GitHub Pages repository-subpath deployments require additional path handling because the application currently requests public MOLA data and the favicon from root-relative URLs; do not deploy to a repository subpath without adjusting those paths and testing the built site.

## Data and scientific notes

### NASA imagery

The map requests global Viking MDIM and MOLA shaded-relief tiles from NASA Mars Trek. These tiles are remote resources; availability, performance, and terms are controlled by the upstream service. NASA attribution is shown in the map interface.

### MOLA elevation grid

The application bundles `public/data/megt90n000eb.img` and its accompanying XML label. The reader expects a 5,760 × 2,880 grid of signed 16-bit big-endian samples (33,177,600 bytes), at 16 samples per degree. It reports the nearest grid-cell sample, not a surveyed point measurement. Treat displayed values as dataset-derived estimates at the grid's spatial resolution.

### Route calculations

Routes are conceptual great-circle paths on a spherical Mars model. They do not account for slope constraints, obstacles, landing hazards, rover mobility, communications, energy, or mission rules. They are not validated rover routes and must not be used for operational navigation.

### Saved routes and privacy

Saved routes are stored in the browser's `localStorage` under `marspath_saved_mission_routes`. They are not uploaded to a server, synchronized across devices, or shared with other users. Clearing browser site data may remove them.

## Project structure

```text
marspath-explorer/
├── public/
│   ├── data/
│   │   ├── megt90n000eb.img
│   │   └── megt90n000eb.xml
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── location-comparison.js
│   │   ├── map.js
│   │   ├── mola-elevation.js
│   │   └── route-planner.js
│   ├── assets/
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```

## Troubleshooting

- **Map tiles are blank:** confirm internet access and check whether NASA Mars Trek is reachable; the basemap is remote.
- **MOLA reader reports a load error:** verify that `public/data/megt90n000eb.img` exists and has exactly 33,177,600 bytes.
- **A fresh clone has no `vite` command:** run `npm install` in the project root. Do not copy `node_modules` between operating systems; dependencies are restored from `package-lock.json`.
- **Port is already in use:** Vite will offer another available local port; use the URL it prints.

## Acknowledgements

- NASA Mars Trek — global Mars imagery and shaded-relief tiles.
- NASA Mars Global Surveyor / Mars Orbiter Laser Altimeter (MOLA) — elevation dataset.
- OpenLayers — interactive map engine.

## License

No project-wide license was supplied with the source archive. Before publishing or accepting external contributions, choose and add a license after confirming the redistribution terms for all bundled assets and datasets. NASA material may have separate attribution or usage requirements.

## Visual refresh — Mission Control UI

The interface includes a dedicated visual styling layer for a more immersive planetary mission-control experience: deeper space-toned surfaces, warm Martian accent lighting, stronger panel hierarchy, clearer selected landmark states, refined map framing, improved form controls, and responsive tablet/mobile layouts. This refresh changes presentation only; the existing map, MOLA, route-planning, comparison, and local saved-route logic are retained.


## Premium UI upgrade

This version adds a refined premium visual layer while preserving the existing OpenLayers Mars map, landmark data, location comparison, NASA MOLA elevation reader, and conceptual route planner.

### UX/UI improvements
- Clearer visual hierarchy and more legible typography.
- Improved hero actions and corrected hero-stat placement so the stats no longer compete with the primary call to action.
- Refined navigation, glass-like header, layered panels, stronger focus states, and consistent spacing.
- Improved map workspace sizing and panel separation.
- Responsive layout refinements for desktop, tablet, and mobile.
- Reduced-motion support for visitors who prefer less animation.

### Run locally
1. Install Node.js 20.19+ (or 22.12+).
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL printed by Vite.

Run `npm run check` for JavaScript syntax checks and `npm run build` for a production build.
