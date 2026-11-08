
import "ol/ol.css";

import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import TileImage from "ol/source/TileImage.js";
import Projection from "ol/proj/Projection.js";
import TileGrid from "ol/tilegrid/TileGrid.js";
import Control from "ol/control/Control.js";

import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector.js";

import Style from "ol/style/Style.js";
import CircleStyle from "ol/style/Circle.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Text from "ol/style/Text.js";

import { defaults as defaultControls } from "ol/control/defaults.js";

import {
  initializeMolaElevation,
  getMolaElevation,
} from "./mola-elevation.js";

// ==========================================
// 1. NASA MARS WMTS CONFIGURATION
// ==========================================

const MARS_EXTENT = [-180, -90, 180, 90];

const TILE_SIZE = 256;
const MAX_ZOOM = 7;

const marsProjection = new Projection({
  code: "EPSG:104905",
  units: "degrees",
  extent: MARS_EXTENT,
});

const resolutions = Array.from(
  { length: MAX_ZOOM + 1 },
  (_, zoom) => 360 / (2 * TILE_SIZE * 2 ** zoom)
);

const matrixSizes = Array.from(
  { length: MAX_ZOOM + 1 },
  (_, zoom) => ({
    columns: 2 * 2 ** zoom,
    rows: 1 * 2 ** zoom,
  })
);

const marsTileGrid = new TileGrid({
  extent: MARS_EXTENT,
  origin: [-180, 90],
  resolutions,
  tileSize: TILE_SIZE,
  sizes: matrixSizes.map((matrix) => [
    matrix.columns,
    matrix.rows,
  ]),
});

// ==========================================
// 2. NASA TILE URL CONFIGURATION
// ==========================================

const VIKING_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/" +
  "Mars_Viking_MDIM21_ClrMosaic_global_232m/" +
  "1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

const MOLA_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/" +
  "Mars_MGS_MOLA_ClrShade_merge_global_463m/" +
  "1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

// ==========================================
// 3. SHARED NASA TILE SOURCE
// ==========================================

function createMarsTileSource(url, attribution) {
  return new TileImage({
    projection: marsProjection,
    tileGrid: marsTileGrid,
    wrapX: false,
    attributions: attribution,

    tileUrlFunction: (tileCoord) => {
      if (!tileCoord) return undefined;

      // Preserve the working direct tile-coordinate logic.
      const [z, x, y] = tileCoord;
      const matrix = matrixSizes[z];

      if (
        !matrix ||
        x < 0 ||
        x >= matrix.columns ||
        y < 0 ||
        y >= matrix.rows
      ) {
        return undefined;
      }

      return url
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
    },
  });
}

function createVikingSource() {
  return createMarsTileSource(
    VIKING_TILE_URL,
    "Imagery: NASA Mars Trek"
  );
}

function createMolaSource() {
  return createMarsTileSource(
    MOLA_TILE_URL,
    "Topography: NASA MGS MOLA"
  );
}

// ==========================================
// 4. SCIENTIFIC LANDMARK DATABASE
// ==========================================

// Exported for use by location-comparison.js.
export const MARS_LOCATIONS = [
  {
    id: "jezero",
    name: "Jezero Crater",
    subtitle: "Perseverance Landing Site",

    longitude: 77.4509,
    latitude: 18.4446,

    coordinates: "18.4446° N, 77.4509° E",
    coordinateType:
      "Approximate Perseverance landing-site coordinates",

    category: "Ancient Impact Crater",
    mission: "NASA Perseverance Rover",
    missionYear: "2021",

    overview:
      "Jezero Crater is an ancient impact crater in the northern hemisphere of Mars. Geological evidence indicates that water once flowed into the crater, forming a lake and a river delta.",

    significance:
      "The crater's ancient lake and delta deposits make it an important location for investigating past water activity and the possibility of ancient microbial life on Mars.",

    exploration:
      "NASA's Perseverance rover landed in Jezero Crater in February 2021. It studies Martian rocks, analyzes geological materials, and collects samples for a potential future return to Earth.",

    facts: [
      "Contains evidence of an ancient lake environment.",
      "Features a preserved river delta.",
      "Explored by the Perseverance rover.",
      "Important target for ancient habitability research.",
    ],

    sources: [
      {
        label: "NASA Perseverance Mission",
        url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
      },
      {
        label: "NASA Research Publication",
        url: "https://ntrs.nasa.gov/citations/20230016428",
      },
    ],
  },

  {
    id: "gale",
    name: "Gale Crater",
    subtitle: "Curiosity Landing Site",

    longitude: 137.4417,
    latitude: -4.5895,

    coordinates: "4.5895° S, 137.4417° E",
    coordinateType:
      "Approximate Curiosity landing-site coordinates",

    category: "Impact Crater",
    mission: "NASA Curiosity Rover",
    missionYear: "2012",

    overview:
      "Gale Crater is a large impact crater near the Martian equator. It contains Mount Sharp, a prominent central mountain with layered geological deposits.",

    significance:
      "Its rock layers preserve evidence of environmental changes over time. Scientists study these deposits to understand ancient water activity and whether Mars once had conditions suitable for microbial life.",

    exploration:
      "NASA's Curiosity rover landed in Gale Crater in August 2012. It investigates rocks, soil, and atmospheric conditions to reconstruct the planet's geological and environmental history.",

    facts: [
      "Contains the central mountain Mount Sharp.",
      "Features extensive layered sedimentary deposits.",
      "Explored by the Curiosity rover since 2012.",
      "Provides evidence of ancient environmental conditions.",
    ],

    sources: [
      {
        label: "NASA Curiosity Mission",
        url: "https://science.nasa.gov/mission/msl-curiosity/",
      },
      {
        label: "NASA Gale Crater Landing-Site Data",
        url: "https://marsoweb.nas.nasa.gov/landingsites/msl/topsites/gale_crater/",
      },
    ],
  },

  {
    id: "olympus",
    name: "Olympus Mons",
    subtitle: "Martian Volcanic Landmark",

    longitude: -133.8,
    latitude: 18.65,

    coordinates: "18.65° N, 133.80° W",
    coordinateType:
      "Approximate geological feature-center coordinates",

    category: "Shield Volcano",
    mission: "Planetary Geological Landmark",
    missionYear: "Geological feature",

    overview:
      "Olympus Mons is a giant shield volcano located in the western hemisphere of Mars. It is widely recognized as the largest known volcano in the Solar System.",

    significance:
      "Its enormous volcanic structure provides important evidence about the geological evolution of Mars, including volcanic activity, lava flows, and the formation of large shield volcanoes.",

    exploration:
      "Olympus Mons is studied through orbital observations and planetary geological research. Its surface structure and surrounding terrain help scientists investigate the volcanic history of Mars.",

    facts: [
      "One of the largest known volcanoes in the Solar System.",
      "A giant shield volcano.",
      "Located in the Tharsis volcanic region.",
      "An important landmark for Martian geology.",
    ],

    sources: [
      {
        label: "USGS Planetary Names Gazetteer",
        url: "https://planetarynames.wr.usgs.gov/Feature/4453",
      },
      {
        label: "NASA Mars Exploration",
        url: "https://science.nasa.gov/mars/",
      },
    ],
  },
];

// ==========================================
// 5. CREATE LOCATION FEATURES
// ==========================================

function createLocationFeatures() {
  return MARS_LOCATIONS.map((location) => {
    const feature = new Feature({
      geometry: new Point([
        location.longitude,
        location.latitude,
      ]),
    });

    feature.setProperties({
      locationId: location.id,
      locationName: location.name,
      selected: false,
    });

    return feature;
  });
}

// ==========================================
// 6. LOCATION MARKER STYLING
// ==========================================

function createMarkerStyle(selected, name) {
  return new Style({
    image: new CircleStyle({
      radius: selected ? 9 : 7,

      fill: new Fill({
        color: selected ? "#ffffff" : "#e78356",
      }),

      stroke: new Stroke({
        color: selected ? "#e78356" : "#ffffff",
        width: selected ? 4 : 2,
      }),
    }),

    text: new Text({
      text: name,
      offsetY: -21,
      font: "bold 12px Inter, sans-serif",

      fill: new Fill({
        color: "#ffffff",
      }),

      stroke: new Stroke({
        color: "#080d17",
        width: 3,
      }),
    }),
  });
}

// ==========================================
// 7. CREATE LOCATION VECTOR LAYER
// ==========================================

function createLocationLayer() {
  const locationSource = new VectorSource({
    features: createLocationFeatures(),
  });

  const locationLayer = new VectorLayer({
    source: locationSource,

    style: (feature) => {
      return createMarkerStyle(
        feature.get("selected") === true,
        feature.get("locationName")
      );
    },

    zIndex: 10,
  });

  return {
    locationSource,
    locationLayer,
  };
}

// ==========================================
// 8. SCIENTIFIC PROFILE + NAVIGATION STYLES
// ==========================================

function addProfileStyles() {
  if (document.getElementById("mars-profile-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "mars-profile-styles";

  style.textContent = `
    .location-details {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid rgba(255,255,255,0.10);
    }

    .profile-label {
      display: inline-block;
      color: #e78356;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin-bottom: 9px;
    }

    .profile-title {
      color: #ffffff;
      font-size: 21px;
      font-weight: 750;
      margin: 0 0 5px;
    }

    .profile-subtitle {
      color: #aab5c5;
      font-size: 12px;
      margin: 0 0 15px;
    }

    .profile-section {
      margin-top: 18px;
    }

    .profile-section h5 {
      color: #ffffff;
      font-size: 13px;
      margin: 0 0 8px;
    }

    .profile-section p {
      color: #b8c2d1;
      font-size: 12px;
      line-height: 1.75;
      margin: 0;
    }

    .profile-coordinate {
      background: rgba(231,131,86,0.09);
      border: 1px solid rgba(231,131,86,0.20);
      border-radius: 9px;
      padding: 12px;
      margin-top: 14px;
    }

    .profile-coordinate strong {
      display: block;
      color: #ffffff;
      font-size: 13px;
      margin-bottom: 5px;
    }

    .profile-coordinate span {
      color: #e9a17e;
      font-size: 11px;
      line-height: 1.5;
    }

    .profile-elevation {
      background: rgba(50, 160, 130, 0.08);
      border: 1px solid rgba(50, 190, 150, 0.25);
      border-radius: 9px;
      padding: 13px;
      margin-top: 12px;
    }

    .profile-elevation-label {
      display: block;
      color: #79d7b5;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
      margin-bottom: 8px;
    }

    .profile-elevation-value {
      display: block;
      color: #ffffff;
      font-size: 23px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .profile-elevation-meta {
      display: block;
      color: #b8c2d1;
      font-size: 10px;
      line-height: 1.7;
    }

    .profile-elevation-note {
      display: block;
      color: #8997aa;
      font-size: 10px;
      line-height: 1.6;
      margin-top: 9px;
    }

    .profile-facts {
      padding-left: 17px;
      margin: 0;
    }

    .profile-facts li {
      color: #b8c2d1;
      font-size: 12px;
      line-height: 1.65;
      margin-bottom: 7px;
    }

    .profile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 12px;
    }

    .profile-chip {
      display: inline-block;
      padding: 6px 9px;
      border-radius: 20px;
      background: rgba(255,255,255,0.07);
      color: #d6deea;
      font-size: 10px;
    }

    .profile-sources {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .profile-sources a {
      color: #e9a17e;
      font-size: 12px;
      text-decoration: none;
    }

    .profile-sources a:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    .profile-note {
      color: #8997aa;
      font-size: 10px;
      line-height: 1.6;
      margin-top: 15px;
    }

    .mars-layer-control {
      background: #111b2b;
      border: 1px solid rgba(231,131,86,0.45);
      border-radius: 9px;
      padding: 10px;
      margin: 12px;
    }

    .mars-layer-control button {
      display: block;
      width: 100%;
      padding: 10px 13px;
      border: 1px solid rgba(231,131,86,0.45);
      border-radius: 7px;
      background: #172439;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .mars-layer-control button:hover {
      background: #293a52;
    }

    .mars-layer-control button:focus-visible {
      outline: 2px solid #e78356;
      outline-offset: 3px;
    }

    .mars-layer-control .layer-caption {
      display: block;
      color: #aab5c5;
      font-size: 10px;
      line-height: 1.5;
      margin-top: 7px;
      text-align: center;
    }

    /* =====================================
       MILESTONE 9: MAP NAVIGATION
    ===================================== */

    .mars-navigation-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 12px;
      margin-bottom: 12px;
      background: #101a2a;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px;
    }

    .mars-search-group {
      display: flex;
      flex: 1;
      min-width: 180px;
      gap: 7px;
    }

    .mars-search-group input {
      width: 100%;
      min-width: 0;
      padding: 10px 12px;
      color: #ffffff;
      background: #080d17;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 7px;
      outline: none;
      font-size: 12px;
    }

    .mars-search-group input:focus {
      border-color: #e78356;
    }

    .mars-navigation-toolbar button {
      padding: 10px 13px;
      border: 1px solid rgba(231,131,86,0.4);
      border-radius: 7px;
      background: #243249;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    .mars-navigation-toolbar button:hover {
      background: #344762;
    }

    .mars-search-group button {
      background: #a95536;
      white-space: nowrap;
    }

    .mars-search-group button:hover {
      background: #c56c49;
    }

    .mars-navigation-toolbar button:focus-visible {
      outline: 2px solid #e78356;
      outline-offset: 3px;
    }

    .mars-coordinate-display {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 5;
      padding: 9px 12px;
      background: rgba(8,13,23,0.92);
      border: 1px solid rgba(231,131,86,0.35);
      border-radius: 7px;
      color: #ffffff;
      font-size: 11px;
      pointer-events: none;
      line-height: 1.6;
    }

    .mars-coordinate-display strong {
      color: #e78356;
    }

    @media (max-width: 600px) {
      .mars-navigation-toolbar {
        gap: 8px;
      }

      .mars-search-group {
        flex-basis: 100%;
      }

      .mars-navigation-toolbar button {
        flex: 1;
      }
    }
  `;

  document.head.appendChild(style);
}

// ==========================================
// 9. PREPARE EXISTING LOCATION INFORMATION PANEL
// ==========================================

function prepareLocationPanel() {
  const details = document.querySelector("#location-details");

  if (!details) {
    console.error(
      "Scientific Location Explorer: #location-details was not found."
    );

    return null;
  }

  details.hidden = false;
  details.replaceChildren();

  return details;
}

// ==========================================
// 10. SAFE DOM ELEMENT HELPER
// ==========================================

function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (content !== undefined) {
    element.textContent = content;
  }

  return element;
}

// ==========================================
// 11. LOAD ELEVATION INTO LOCATION PROFILE
// ==========================================

async function updateProfileElevation(location, details) {
  const valueElement = details.querySelector(
    ".profile-elevation-value"
  );

  const metaElement = details.querySelector(
    ".profile-elevation-meta"
  );

  if (!valueElement || !metaElement) return;

  valueElement.textContent = "Loading NASA MOLA data...";

  metaElement.textContent =
    "Reading the nearest 1/16° grid cell...";

  try {
    const result = await getMolaElevation(
      location.longitude,
      location.latitude
    );

    if (
      details.dataset.locationId !== location.id ||
      !details.isConnected
    ) {
      return;
    }

    valueElement.textContent =
      `${result.elevationMeters.toLocaleString()} m`;

    metaElement.textContent =
      `Location: ${location.coordinates} · ` +
      `Grid cell: row ${result.row}, column ${result.column}`;
  } catch (error) {
    console.error(
      `MOLA elevation failed for ${location.name}:`,
      error
    );

    if (
      details.dataset.locationId !== location.id ||
      !details.isConnected
    ) {
      return;
    }

    valueElement.textContent = "Elevation unavailable";

    metaElement.textContent =
      "Could not read the NASA MOLA data file. Check the browser console.";
  }
}

// ==========================================
// 12. UPDATE SCIENTIFIC LOCATION PROFILE
// ==========================================

function updateLocationPanel(location, details) {
  if (!details) return;

  details.hidden = false;
  details.dataset.locationId = location.id;
  details.replaceChildren();

  details.appendChild(
    createElement(
      "span",
      "profile-label",
      "SCIENTIFIC LOCATION PROFILE"
    )
  );

  details.appendChild(
    createElement("h4", "profile-title", location.name)
  );

  details.appendChild(
    createElement("p", "profile-subtitle", location.subtitle)
  );

  const metadata = createElement("div", "profile-meta");

  metadata.append(
    createElement("span", "profile-chip", location.category),
    createElement("span", "profile-chip", location.mission),
    createElement("span", "profile-chip", location.missionYear)
  );

  details.appendChild(metadata);

  // Coordinates.
  const coordinateBox = createElement(
    "div",
    "profile-coordinate"
  );

  coordinateBox.append(
    createElement("strong", "", location.coordinates),
    createElement("span", "", location.coordinateType)
  );

  details.appendChild(coordinateBox);

  // MOLA elevation.
  const elevationBox = createElement(
    "section",
    "profile-elevation"
  );

  elevationBox.append(
    createElement(
      "span",
      "profile-elevation-label",
      "NASA MOLA ELEVATION"
    ),
    createElement(
      "strong",
      "profile-elevation-value",
      "Loading..."
    ),
    createElement(
      "span",
      "profile-elevation-meta",
      "Preparing numerical elevation reading..."
    ),
    createElement(
      "span",
      "profile-elevation-note",
      "Nearest 1/16° MOLA grid-cell estimate. Approximately 3.7 km spacing at the equator. No interpolation between cells."
    )
  );

  details.appendChild(elevationBox);

  updateProfileElevation(location, details);

  // Location overview.
  const overview = createElement("section", "profile-section");

  overview.append(
    createElement("h5", "", "Location Overview"),
    createElement("p", "", location.overview)
  );

  details.appendChild(overview);

  // Scientific significance.
  const significance = createElement(
    "section",
    "profile-section"
  );

  significance.append(
    createElement("h5", "", "Scientific Significance"),
    createElement("p", "", location.significance)
  );

  details.appendChild(significance);

  // Mission information.
  const exploration = createElement(
    "section",
    "profile-section"
  );

  exploration.append(
    createElement("h5", "", "Mission & Exploration"),
    createElement("p", "", location.exploration)
  );

  details.appendChild(exploration);

  // Scientific facts.
  const factsSection = createElement(
    "section",
    "profile-section"
  );

  factsSection.appendChild(
    createElement("h5", "", "Key Scientific Facts")
  );

  const factsList = createElement("ul", "profile-facts");

  location.facts.forEach((fact) => {
    factsList.appendChild(createElement("li", "", fact));
  });

  factsSection.appendChild(factsList);
  details.appendChild(factsSection);

  // Scientific references.
  const sourcesSection = createElement(
    "section",
    "profile-section"
  );

  sourcesSection.appendChild(
    createElement("h5", "", "Scientific References")
  );

  const sourcesList = createElement("div", "profile-sources");

  location.sources.forEach((source) => {
    const link = createElement(
      "a",
      "",
      source.label + " ↗"
    );

    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    sourcesList.appendChild(link);
  });

  sourcesSection.appendChild(sourcesList);
  details.appendChild(sourcesSection);

  details.appendChild(
    createElement(
      "p",
      "profile-note",
      "Educational scientific profile. Coordinates are representative location points, not complete geographic boundaries. MOLA elevation is a regional grid estimate, not an exact measurement of the selected point. Consult the linked scientific sources for further verification."
    )
  );
}

// ==========================================
// 13. CREATE MARS LAYER CONTROL
// ==========================================

function createLayerControl(
  vikingLayer,
  molaLayer,
  statusElement
) {
  const container = document.createElement("div");

  container.className =
    "mars-layer-control ol-unselectable ol-control";

  const button = document.createElement("button");

  button.type = "button";
  button.textContent = "Enable MOLA Terrain";
  button.setAttribute("aria-pressed", "false");

  const caption = createElement(
    "span",
    "layer-caption",
    "Current layer: NASA Viking imagery"
  );

  container.append(button, caption);

  let molaEnabled = false;

  button.addEventListener("click", () => {
    molaEnabled = !molaEnabled;

    vikingLayer.setVisible(!molaEnabled);
    molaLayer.setVisible(molaEnabled);

    button.textContent = molaEnabled
      ? "Show Viking Imagery"
      : "Enable MOLA Terrain";

    button.setAttribute(
      "aria-pressed",
      String(molaEnabled)
    );

    caption.textContent = molaEnabled
      ? "Current layer: NASA MOLA topography"
      : "Current layer: NASA Viking imagery";

    if (statusElement) {
      statusElement.textContent = molaEnabled
        ? "NASA MOLA topography selected"
        : "NASA Viking imagery selected";

      statusElement.classList.remove(
        "map-status-error"
      );
    }

    console.log(
      "Mars base layer:",
      molaEnabled ? "MOLA" : "Viking"
    );
  });

  return new Control({
    element: container,
  });
}

// ==========================================
// 14. INITIALIZE INTERACTIVE MARS MAP
// ==========================================

export function initializeMarsMap() {
  const mapElement = document.getElementById("mars-map");

  const statusElement = document.getElementById("map-status");

  if (!mapElement) {
    console.error(
      "Mars map container #mars-map was not found."
    );

    return null;
  }

  addProfileStyles();

  // NASA imagery sources.
  const vikingSource = createVikingSource();
  const molaSource = createMolaSource();

  // Viking base layer.
  const vikingLayer = new TileLayer({
    source: vikingSource,
    visible: true,

    properties: {
      title: "NASA Viking Global Color Mosaic",
    },
  });

  // MOLA hillshade base layer.
  const molaLayer = new TileLayer({
    source: molaSource,
    visible: false,
    opacity: 0.85,

    properties: {
      title: "NASA MOLA Global Color Hillshade",
    },
  });

  // Scientific landmark layer.
  const {
    locationSource,
    locationLayer,
  } = createLocationLayer();

  // Create OpenLayers map.
  const marsMap = new Map({
    target: mapElement,

    layers: [
      vikingLayer,
      molaLayer,
      locationLayer,
    ],

    controls: defaultControls({
      zoom: true,
      rotate: false,
      attribution: true,
    }),

    view: new View({
      projection: marsProjection,
      center: [0, 0],
      resolutions,
      zoom: 0,
      minZoom: 0,
      maxZoom: MAX_ZOOM,
      extent: MARS_EXTENT,
      constrainOnlyCenter: true,
    }),
  });

  // Add terrain layer switcher.
  marsMap.addControl(
    createLayerControl(
      vikingLayer,
      molaLayer,
      statusElement
    )
  );

  // Initialize manual MOLA elevation reader.
  initializeMolaElevation(
    marsMap,
    locationLayer
  );

  // ========================================
  // 15. LOCATION INFORMATION PANEL
  // ========================================

  const detailsPanel = prepareLocationPanel();

  // ========================================
  // 16. LOCATION SELECTION
  // ========================================

  function selectLocation(locationId) {
    const location = MARS_LOCATIONS.find(
      (item) => item.id === locationId
    );

    if (!location) {
      console.warn("Mars location not found:", locationId);
      return;
    }

    // Highlight selected map marker.
    locationSource.getFeatures().forEach((feature) => {
      feature.set(
        "selected",
        feature.get("locationId") === locationId
      );
    });

    locationLayer.changed();

    // Highlight sidebar item.
    const sidebarItems = document.querySelectorAll(
      ".location-item"
    );

    sidebarItems.forEach((item) => {
      const isSelected =
        item.dataset.locationId === locationId;

      item.classList.toggle("active", isSelected);

      item.setAttribute(
        "aria-pressed",
        String(isSelected)
      );
    });

    // Navigate to selected location.
    const currentZoom =
      marsMap.getView().getZoom() || 0;

    marsMap.getView().animate({
      center: [
        location.longitude,
        location.latitude,
      ],

      zoom: Math.max(currentZoom, 3),
      duration: 900,
    });

    // Update scientific profile.
    updateLocationPanel(location, detailsPanel);

    if (statusElement) {
      statusElement.textContent =
        `Selected: ${location.name}`;

      statusElement.classList.remove(
        "map-status-error"
      );
    }

    console.log("Selected Mars location:", location);
  }

  // ========================================
  // 17. MILESTONE 9: MAP NAVIGATION
  // ========================================

  const mapPlaceholder = mapElement.parentElement;
  const mapSection = mapElement.closest(".map-section");

  // ----------------------------------------
  // CREATE SEARCH TOOLBAR
  // ----------------------------------------

  const navigationToolbar = document.createElement("div");

  navigationToolbar.className = "mars-navigation-toolbar";

  const searchGroup = document.createElement("div");

  searchGroup.className = "mars-search-group";

  const searchInput = document.createElement("input");

  searchInput.type = "search";
  searchInput.id = "mars-landmark-search";
  searchInput.placeholder = "Search Mars landmarks...";
  searchInput.setAttribute(
    "aria-label",
    "Search Martian landmarks"
  );

  searchInput.setAttribute("list", "mars-landmark-options");

  const suggestions = document.createElement("datalist");

  suggestions.id = "mars-landmark-options";

  MARS_LOCATIONS.forEach((location) => {
    const option = document.createElement("option");

    option.value = location.name;

    suggestions.appendChild(option);
  });

  const searchButton = document.createElement("button");

  searchButton.type = "button";
  searchButton.textContent = "Search";

  searchGroup.append(
    searchInput,
    suggestions,
    searchButton
  );

  // ----------------------------------------
  // RESET MAP BUTTON
  // ----------------------------------------

  const resetButton = document.createElement("button");

  resetButton.type = "button";
  resetButton.textContent = "Reset Global View";

  navigationToolbar.append(
    searchGroup,
    resetButton
  );

  // Place toolbar above the map.
  if (mapSection && mapPlaceholder) {
    mapSection.insertBefore(
      navigationToolbar,
      mapPlaceholder
    );
  }

  // ----------------------------------------
  // SEARCH LANDMARK FUNCTION
  // ----------------------------------------

  function searchLandmark() {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      searchInput.focus();
      return;
    }

    const location = MARS_LOCATIONS.find((item) => {
      return (
        item.name.toLowerCase() === query ||
        item.id.toLowerCase() === query
      );
    });

    if (!location) {
      const partialMatch = MARS_LOCATIONS.find((item) => {
        return item.name.toLowerCase().includes(query);
      });

      if (partialMatch) {
        selectLocation(partialMatch.id);
        searchInput.value = partialMatch.name;
        return;
      }

      if (statusElement) {
        statusElement.textContent =
          "No matching Mars landmark found.";

        statusElement.classList.add("map-status-error");
      }

      return;
    }

    selectLocation(location.id);

    searchInput.value = location.name;

    console.log(
      "Landmark found through search:",
      location.name
    );
  }

  searchButton.addEventListener("click", searchLandmark);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchLandmark();
    }
  });

  // ----------------------------------------
  // RESET GLOBAL MARS VIEW
  // ----------------------------------------

  function resetMarsView() {
    marsMap.getView().animate({
      center: [0, 0],
      zoom: 0,
      duration: 900,
    });

    // Clear selected marker.
    locationSource.getFeatures().forEach((feature) => {
      feature.set("selected", false);
    });

    locationLayer.changed();

    // Clear sidebar selection.
    document.querySelectorAll(".location-item").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    });

    // Restore information panel placeholder.
    if (detailsPanel) {
      detailsPanel.dataset.locationId = "";
      detailsPanel.replaceChildren();

      const emptyDetails = createElement(
        "div",
        "empty-details"
      );

      emptyDetails.append(
        createElement("div", "details-icon", "⌖"),
        createElement("h3", "", "Select a Location"),
        createElement(
          "p",
          "",
          "Select a marked location on the map or search for a landmark to explore its scientific details."
        )
      );

      detailsPanel.appendChild(emptyDetails);
    }

    searchInput.value = "";

    if (statusElement) {
      statusElement.textContent =
        "Global Mars view restored.";

      statusElement.classList.remove("map-status-error");
    }

    console.log("Mars global view restored.");
  }

  resetButton.addEventListener("click", resetMarsView);

  // ----------------------------------------
  // LIVE COORDINATE DISPLAY
  // ----------------------------------------

  const coordinateDisplay = document.createElement("div");

  coordinateDisplay.className = "mars-coordinate-display";

  coordinateDisplay.innerHTML =
    "<strong>MARS COORDINATES</strong><br>" +
    "Move cursor over the map";

  if (mapPlaceholder) {
    mapPlaceholder.appendChild(coordinateDisplay);
  }

  // ========================================
  // 18. SIDEBAR INTERACTION
  // ========================================

  const sidebarItems = document.querySelectorAll(
    ".location-item"
  );

  sidebarItems.forEach((item) => {
    const locationId = item.dataset.locationId;

    const location = MARS_LOCATIONS.find(
      (entry) => entry.id === locationId
    );

    if (!location) {
      console.warn(
        "No matching Mars location for sidebar item:",
        item
      );

      return;
    }

    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", location.name);
    item.setAttribute("aria-pressed", "false");

    item.addEventListener("click", () => {
      selectLocation(location.id);
    });

    item.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        selectLocation(location.id);
      }
    });
  });

  // ========================================
  // 19. MAP MARKER + CUSTOM ROUTE INTERACTION
  // ========================================

  marsMap.on("singleclick", (event) => {
    // Check whether the route planner is waiting
    // for a custom start or destination coordinate.
    const routeSelectionMode = marsMap.get(
      "routeSelectionMode"
    );

    const routeSelectionCallback = marsMap.get(
      "routeSelectionCallback"
    );

    // Custom route selection takes priority over
    // normal landmark selection.
    if (
      routeSelectionMode &&
      typeof routeSelectionCallback === "function"
    ) {
      const [longitude, latitude] = event.coordinate;

      if (
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90
      ) {
        routeSelectionCallback({
          longitude,
          latitude,
          mode: routeSelectionMode,
        });
      }

      return;
    }

    // Normal scientific landmark selection.
    const clickedFeature = marsMap.forEachFeatureAtPixel(
      event.pixel,
      (feature) => feature,
      {
        layerFilter: (layer) =>
          layer === locationLayer,
        hitTolerance: 8,
      }
    );

    if (!clickedFeature) return;

    selectLocation(
      clickedFeature.get("locationId")
    );
  });

  // ========================================
  // 20. MARKER HOVER + LIVE COORDINATES
  // ========================================

  marsMap.on("pointermove", (event) => {
    if (event.dragging) return;

    // Update marker cursor.
    const hit = marsMap.hasFeatureAtPixel(
      event.pixel,
      {
        layerFilter: (layer) =>
          layer === locationLayer,
        hitTolerance: 8,
      }
    );

    const routeSelectionMode = marsMap.get(
      "routeSelectionMode"
    );

    mapElement.style.cursor = routeSelectionMode
      ? "crosshair"
      : hit
        ? "pointer"
        : "";

    // Read current map coordinates.
    const coordinate = event.coordinate;

    if (!coordinate || !coordinateDisplay) return;

    let longitude = coordinate[0];
    const latitude = coordinate[1];

    // Normalize longitude between -180 and +180.
    longitude =
      ((longitude + 180) % 360 + 360) % 360 - 180;

    if (
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    const longitudeDirection =
      longitude >= 0 ? "E" : "W";

    const latitudeDirection =
      latitude >= 0 ? "N" : "S";

    coordinateDisplay.innerHTML =
      "<strong>MARS COORDINATES</strong><br>" +
      `Longitude: ${Math.abs(longitude).toFixed(4)}° ${longitudeDirection}<br>` +
      `Latitude: ${Math.abs(latitude).toFixed(4)}° ${latitudeDirection}`;
  });

  // Reset coordinates when pointer leaves map.
  mapElement.addEventListener("pointerleave", () => {
    coordinateDisplay.innerHTML =
      "<strong>MARS COORDINATES</strong><br>" +
      "Move cursor over the map";

    mapElement.style.cursor = "";
  });

  // ========================================
  // 21. NASA TILE LOADING STATUS
  // ========================================

  let successfulTiles = 0;
  let failedTiles = 0;

  function attachTileStatus(source, layerName) {
    source.on("tileloadstart", () => {
      if (statusElement) {
        statusElement.textContent =
          `Loading ${layerName}...`;

        statusElement.classList.remove(
          "map-status-error"
        );
      }
    });

    source.on("tileloadend", () => {
      successfulTiles += 1;

      if (statusElement && failedTiles === 0) {
        statusElement.textContent =
          `${layerName} imagery loaded`;
      }
    });

    source.on("tileloaderror", () => {
      failedTiles += 1;

      console.error(
        `${layerName} tile loading failed.`,
        { failedTiles }
      );

      if (statusElement) {
        statusElement.textContent =
          `${layerName} tiles failed to load. Check the browser console.`;

        statusElement.classList.add(
          "map-status-error"
        );
      }
    });
  }

  attachTileStatus(vikingSource, "NASA Viking");
  attachTileStatus(molaSource, "NASA MOLA");

  // ========================================
  // 22. FINAL MAP SETUP
  // ========================================

  marsMap.updateSize();

  if (statusElement) {
    statusElement.textContent =
      "NASA Mars imagery initialized";
  }

  console.log("MarsPath Explorer map initialized.");
  console.log("Scientific locations:", MARS_LOCATIONS);
  console.log("NASA MOLA elevation integration ready.");
  console.log("Milestone 9 navigation controls ready.");
  console.log("Custom mission route selection integration ready.");

  return marsMap;
}
