
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import MultiLineString from "ol/geom/MultiLineString.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import Style from "ol/style/Style.js";
import Stroke from "ol/style/Stroke.js";
import CircleStyle from "ol/style/Circle.js";
import Fill from "ol/style/Fill.js";

import { getMolaElevation } from "./mola-elevation.js";

/* -------------------------------------------------------
   1. CONFIGURATION AND STATE
------------------------------------------------------- */

const MARS_LOCATIONS = {
  jezero: {
    name: "Jezero Crater",
    longitude: 77.4509,
    latitude: 18.4446,
  },
  gale: {
    name: "Gale Crater",
    longitude: 137.4417,
    latitude: -4.5895,
  },
  olympus: {
    name: "Olympus Mons",
    longitude: -133.8,
    latitude: 18.65,
  },
};

const MARS_RADIUS_KM = 3389.5;
const SAVED_ROUTES_KEY = "marspath_saved_mission_routes";

let routeSource = null;
let routeLayer = null;

let customStart = null;
let customEnd = null;
let selectionStatus = null;
let mapInstance = null;

let lastMissionReport = null;
let exportReportButton = null;
let saveRouteButton = null;
let savedRoutesContainer = null;
let savedRouteNameInput = null;

/* -------------------------------------------------------
   2. SAVED ROUTES — LOCAL STORAGE
------------------------------------------------------- */

function getSavedMissionRoutes() {
  try {
    const saved = localStorage.getItem(SAVED_ROUTES_KEY);

    if (!saved) return [];

    const routes = JSON.parse(saved);

    return Array.isArray(routes) ? routes : [];
  } catch (error) {
    console.error("Unable to read saved routes:", error);
    return [];
  }
}

function storeSavedMissionRoutes(routes) {
  try {
    localStorage.setItem(
      SAVED_ROUTES_KEY,
      JSON.stringify(routes)
    );

    return true;
  } catch (error) {
    console.error("Unable to store saved routes:", error);
    return false;
  }
}

function saveMissionRoute(name, start, end) {
  if (!name || !name.trim() || !start || !end) {
    return null;
  }

  const routes = getSavedMissionRoutes();

  const newRoute = {
    id: `mars-route-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,

    name: name.trim(),

    start: {
      name: start.name,
      longitude: start.longitude,
      latitude: start.latitude,
    },

    end: {
      name: end.name,
      longitude: end.longitude,
      latitude: end.latitude,
    },

    savedAt: new Date().toISOString(),
  };

  routes.unshift(newRoute);

  return storeSavedMissionRoutes(routes)
    ? newRoute
    : null;
}

function deleteSavedMissionRoute(routeId) {
  const routes = getSavedMissionRoutes();

  const updatedRoutes = routes.filter(
    (route) => route.id !== routeId
  );

  return storeSavedMissionRoutes(updatedRoutes);
}

/* -------------------------------------------------------
   3. GEOGRAPHIC CALCULATIONS
------------------------------------------------------- */

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function normalizeLongitude(longitude) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

export function calculateMarsDistance(start, end) {
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);

  const deltaLat = toRadians(end.latitude - start.latitude);

  const deltaLon = toRadians(
    normalizeLongitude(end.longitude - start.longitude)
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return MARS_RADIUS_KM * centralAngle;
}

function toCartesian(longitude, latitude) {
  const lon = toRadians(longitude);
  const lat = toRadians(latitude);

  return [
    Math.cos(lat) * Math.cos(lon),
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
  ];
}

function toGeographic(vector) {
  const [x, y, z] = vector;

  return [
    normalizeLongitude(toDegrees(Math.atan2(y, x))),
    toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
  ];
}

function generateGreatCirclePoints(start, end, numberOfPoints = 100) {
  const startVector = toCartesian(
    start.longitude,
    start.latitude
  );

  const endVector = toCartesian(
    end.longitude,
    end.latitude
  );

  const dotProduct = Math.max(
    -1,
    Math.min(
      1,
      startVector[0] * endVector[0] +
        startVector[1] * endVector[1] +
        startVector[2] * endVector[2]
    )
  );

  const angle = Math.acos(dotProduct);
  const points = [];

  for (let i = 0; i <= numberOfPoints; i++) {
    const fraction = i / numberOfPoints;
    let vector;

    if (angle < 0.000001) {
      vector = startVector.map(
        (value, index) =>
          value * (1 - fraction) +
          endVector[index] * fraction
      );
    } else {
      const sinAngle = Math.sin(angle);

      const startWeight =
        Math.sin((1 - fraction) * angle) / sinAngle;

      const endWeight =
        Math.sin(fraction * angle) / sinAngle;

      vector = startVector.map(
        (value, index) =>
          value * startWeight +
          endVector[index] * endWeight
      );
    }

    const length = Math.sqrt(
      vector[0] ** 2 +
        vector[1] ** 2 +
        vector[2] ** 2
    );

    vector = vector.map((value) => value / length);

    points.push(toGeographic(vector));
  }

  return points;
}

function splitAtAntimeridian(points) {
  if (points.length < 2) return [points];

  const segments = [];
  let currentSegment = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    const difference = current[0] - previous[0];

    if (Math.abs(difference) > 180) {
      const adjustedLongitude =
        current[0] + (difference > 180 ? 360 : -360);

      const boundary = previous[0] >= 0 ? 180 : -180;

      const fraction =
        (boundary - previous[0]) /
        (adjustedLongitude - previous[0]);

      const crossingLatitude =
        previous[1] +
        fraction * (current[1] - previous[1]);

      currentSegment.push([boundary, crossingLatitude]);
      segments.push(currentSegment);

      currentSegment = [
        [boundary === 180 ? -180 : 180, crossingLatitude],
        current,
      ];
    } else {
      currentSegment.push(current);
    }
  }

  segments.push(currentSegment);

  return segments;
}

/* -------------------------------------------------------
   4. ROUTE MAP LAYER
------------------------------------------------------- */

function initializeRouteLayer(map) {
  if (!map) {
    console.error("Route Planner: Map instance is missing.");
    return false;
  }

  routeSource = new VectorSource();

  routeLayer = new VectorLayer({
    source: routeSource,

    style: (feature) => {
      const routeType = feature.get("routeType");

      if (routeType === "route") {
        return new Style({
          stroke: new Stroke({
            color: "#ff884f",
            width: 3,
            lineDash: [10, 7],
          }),
        });
      }

      if (routeType === "start") {
        return new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "#4ade80" }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 2,
            }),
          }),
        });
      }

      if (routeType === "end") {
        return new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "#ff884f" }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 2,
            }),
          }),
        });
      }

      return undefined;
    },
  });

  routeLayer.setZIndex(100);
  map.addLayer(routeLayer);

  console.log("Route layer added successfully.");

  return true;
}

function drawMarsRoute(start, end, routePoints) {
  if (!routeSource) return false;

  routeSource.clear();

  const routeSegments = splitAtAntimeridian(routePoints);

  const routeFeature = new Feature({
    geometry: new MultiLineString(routeSegments),
    routeType: "route",
  });

  const startFeature = new Feature({
    geometry: new Point([start.longitude, start.latitude]),
    routeType: "start",
  });

  const endFeature = new Feature({
    geometry: new Point([end.longitude, end.latitude]),
    routeType: "end",
  });

  routeSource.addFeatures([
    routeFeature,
    startFeature,
    endFeature,
  ]);

  return true;
}

function clearMarsRoute() {
  if (routeSource) {
    routeSource.clear();
  }
}

/* -------------------------------------------------------
   5. MOLA ELEVATION ANALYSIS
------------------------------------------------------- */

async function analyzeRouteElevation(routePoints) {
  const sampleCount = 21;
  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    const index = Math.round(
      (i / (sampleCount - 1)) * (routePoints.length - 1)
    );

    const [longitude, latitude] = routePoints[index];

    samples.push({
      index: i + 1,
      routeIndex: index,
      longitude,
      latitude,
    });
  }

  const elevationResults = await Promise.all(
    samples.map(async (sample) => {
      try {
        const result = await getMolaElevation(
          sample.longitude,
          sample.latitude
        );

        if (
          !result ||
          !Number.isFinite(result.elevationMeters)
        ) {
          return {
            ...sample,
            elevationMeters: null,
          };
        }

        return {
          ...sample,
          elevationMeters: result.elevationMeters,
        };
      } catch (error) {
        console.error("MOLA sample error:", error);

        return {
          ...sample,
          elevationMeters: null,
        };
      }
    })
  );

  const validSamples = elevationResults.filter(
    (sample) => Number.isFinite(sample.elevationMeters)
  );

  if (validSamples.length === 0) {
    throw new Error(
      "No valid MOLA elevation samples were returned."
    );
  }

  const elevations = validSamples.map(
    (sample) => sample.elevationMeters
  );

  const minimum = Math.min(...elevations);
  const maximum = Math.max(...elevations);

  const average =
    elevations.reduce((sum, value) => sum + value, 0) /
    elevations.length;

  const highestPoint = validSamples.reduce(
    (highest, sample) =>
      sample.elevationMeters > highest.elevationMeters
        ? sample
        : highest
  );

  const lowestPoint = validSamples.reduce(
    (lowest, sample) =>
      sample.elevationMeters < lowest.elevationMeters
        ? sample
        : lowest
  );

  let elevationGain = 0;
  let elevationLoss = 0;
  let validAdjacentPairs = 0;

  for (let i = 1; i < elevationResults.length; i++) {
    const previous = elevationResults[i - 1];
    const current = elevationResults[i];

    if (
      !Number.isFinite(previous.elevationMeters) ||
      !Number.isFinite(current.elevationMeters)
    ) {
      continue;
    }

    const difference =
      current.elevationMeters - previous.elevationMeters;

    if (difference > 0) {
      elevationGain += difference;
    } else if (difference < 0) {
      elevationLoss += Math.abs(difference);
    }

    validAdjacentPairs++;
  }

  const firstSample = elevationResults[0];
  const lastSample = elevationResults[elevationResults.length - 1];

  const startElevation = Number.isFinite(
    firstSample.elevationMeters
  )
    ? firstSample.elevationMeters
    : null;

  const endElevation = Number.isFinite(
    lastSample.elevationMeters
  )
    ? lastSample.elevationMeters
    : null;

  const netElevationChange =
    startElevation !== null && endElevation !== null
      ? endElevation - startElevation
      : null;

  return {
    samples: validSamples,
    totalSamples: sampleCount,
    validSamples: validSamples.length,
    minimum,
    maximum,
    average,
    highestPoint,
    lowestPoint,
    elevationGain,
    elevationLoss,
    netElevationChange,
    terrainVariation: maximum - minimum,
    validAdjacentPairs,
    startElevation,
    endElevation,
  };
}

/* -------------------------------------------------------
   6. FORMATTING AND ELEVATION PROFILE
------------------------------------------------------- */

function formatElevation(value) {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })} m`;
}

function formatElevationChange(value) {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })} m`;
}

function createElevationProfile(samples) {
  if (!samples.length) return "";

  const elevations = samples.map(
    (sample) => sample.elevationMeters
  );

  const minimum = Math.min(...elevations);
  const maximum = Math.max(...elevations);
  const range = maximum - minimum;

  const bars = samples.map((sample) => {
    const height =
      range === 0
        ? 50
        : 12 + ((sample.elevationMeters - minimum) / range) * 88;

    return `
      <div
        class="elevation-bar"
        title="Sample ${sample.index}: ${formatElevation(sample.elevationMeters)}"
        style="height: ${height}%"
      ></div>
    `;
  }).join("");

  return `
    <div class="elevation-chart">
      <div class="elevation-chart-heading">
        <strong>Route Elevation Profile</strong>
        <span>MOLA DATA</span>
      </div>

      <div class="elevation-chart-area">
        ${bars}
      </div>

      <div class="elevation-chart-axis">
        <span>Start</span>
        <span>Along route</span>
        <span>Destination</span>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   7. ROUTE RESULTS
------------------------------------------------------- */

function showResult(message, isError = false) {
  const resultElement = document.querySelector("#route-result");

  if (!resultElement) return;

  resultElement.classList.toggle("error", isError);
  resultElement.innerHTML = message;
}

function createRouteReport(start, end, distance, elevation) {
  return `
    <div class="route-summary">
      <span class="route-summary-label">ESTIMATED DISTANCE</span>

      <strong class="route-distance">
        ${distance.toFixed(2)} km
      </strong>

      <div class="route-coordinate">
        <span>Start:</span> ${escapeHTML(start.name)}
        <br>
        <span>Coordinates:</span>
        ${start.longitude.toFixed(4)}°,
        ${start.latitude.toFixed(4)}°
      </div>

      <div class="route-coordinate">
        <span>Destination:</span> ${escapeHTML(end.name)}
        <br>
        <span>Coordinates:</span>
        ${end.longitude.toFixed(4)}°,
        ${end.latitude.toFixed(4)}°
      </div>

      <div class="elevation-results">
        <div class="elevation-results-heading">
          <strong>MOLA Elevation Analysis</strong>
          <span>${elevation.validSamples}/${elevation.totalSamples} samples</span>
        </div>

        <div class="elevation-stat">
          <span>Minimum elevation</span>
          <strong>${formatElevation(elevation.minimum)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Maximum elevation</span>
          <strong>${formatElevation(elevation.maximum)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Average elevation</span>
          <strong>${formatElevation(elevation.average)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Highest sampled point</span>
          <strong>${formatElevation(elevation.highestPoint.elevationMeters)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Lowest sampled point</span>
          <strong>${formatElevation(elevation.lowestPoint.elevationMeters)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Total elevation gain</span>
          <strong>${formatElevation(elevation.elevationGain)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Total elevation loss</span>
          <strong>${formatElevation(elevation.elevationLoss)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Net elevation change</span>
          <strong>${formatElevationChange(elevation.netElevationChange)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Terrain variation</span>
          <strong>${formatElevation(elevation.terrainVariation)}</strong>
        </div>

        <div class="elevation-stat">
          <span>Valid adjacent sample pairs</span>
          <strong>${elevation.validAdjacentPairs}/20</strong>
        </div>
      </div>

      ${createElevationProfile(elevation.samples)}

      <p class="route-method">
        Distance: great-circle calculation using Mars's mean radius.
        Elevations: NASA MOLA MEGDR dataset, sampled at 21 points.
        Gain and loss use consecutive valid samples only.
        Elevation values are relative to the dataset's reference datum.
      </p>

      <p class="elevation-warning">
        This is a conceptual educational analysis, not a
        high-resolution terrain survey or route-safety assessment.
        The 21 samples are spaced along the route; they do not
        represent continuous terrain measurements.
      </p>

      ${
        elevation.validSamples < elevation.totalSamples
          ? `<p class="elevation-warning">
              Some elevation samples could not be retrieved.
              Gain and loss calculations exclude intervals
              containing missing samples.
            </p>`
          : ""
      }
    </div>
  `;
}

/* -------------------------------------------------------
   8. MISSION REPORT EXPORT
------------------------------------------------------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function exportMissionReport() {
  if (!lastMissionReport) {
    showResult(
      "Calculate a mission route before exporting a report.",
      true
    );
    return;
  }

  const {
    start,
    end,
    distance,
    elevation,
    generatedAt,
  } = lastMissionReport;

  const sampleRows = elevation.samples.map((sample) => `
    <tr>
      <td>${sample.index}</td>
      <td>${sample.longitude.toFixed(4)}°</td>
      <td>${sample.latitude.toFixed(4)}°</td>
      <td>${formatElevation(sample.elevationMeters)}</td>
    </tr>
  `).join("");

  const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MarsPath Explorer - Mission Report</title>

  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 35px;
      background: #f1f5f9;
      color: #172033;
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }

    .report {
      max-width: 900px;
      margin: auto;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 25px rgba(0,0,0,.08);
    }

    header {
      padding-bottom: 22px;
      border-bottom: 3px solid #e87942;
    }

    h1 { margin-bottom: 5px; color: #172033; }

    h2 {
      margin-top: 30px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .subtitle, .muted { color: #64748b; }

    .distance {
      margin: 25px 0;
      padding: 22px;
      background: #fff4ed;
      border-left: 5px solid #e87942;
      border-radius: 8px;
    }

    .distance strong {
      display: block;
      font-size: 30px;
      color: #c65b28;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .stat span {
      display: block;
      color: #64748b;
      font-size: 13px;
    }

    .stat strong { font-size: 18px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }

    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th { background: #f1f5f9; }

    .notice {
      margin-top: 25px;
      padding: 15px;
      background: #fff7ed;
      border-radius: 8px;
      color: #7c4525;
    }

    footer {
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }

    .print-button {
      display: block;
      margin: 0 auto 20px;
      padding: 12px 22px;
      background: #e87942;
      color: white;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
    }

    @media (max-width: 600px) {
      body { padding: 10px; }
      .report { padding: 20px; }
      .grid { grid-template-columns: 1fr; }
      table { font-size: 11px; }
    }

    @media print {
      body { padding: 0; background: white; }
      .report { box-shadow: none; padding: 0; }
      .print-button { display: none; }
    }
  </style>
</head>

<body>
  <button class="print-button" onclick="window.print()">
    Print / Save as PDF
  </button>

  <main class="report">
    <header>
      <h1>MarsPath Explorer</h1>
      <div class="subtitle">Scientific Mars Mission Route Report</div>
      <p>Generated: ${escapeHTML(generatedAt)}</p>
    </header>

    <h2>Mission Overview</h2>

    <div class="distance">
      <span>Estimated Great-Circle Distance</span>
      <strong>${distance.toFixed(2)} km</strong>
    </div>

    <p><b>Starting point:</b> ${escapeHTML(start.name)}</p>
    <p>
      <b>Start coordinates:</b>
      ${start.longitude.toFixed(4)}°,
      ${start.latitude.toFixed(4)}°
    </p>

    <p><b>Destination:</b> ${escapeHTML(end.name)}</p>
    <p>
      <b>Destination coordinates:</b>
      ${end.longitude.toFixed(4)}°,
      ${end.latitude.toFixed(4)}°
    </p>

    <h2>MOLA Elevation Analysis</h2>

    <div class="grid">
      <div class="stat">
        <span>Minimum elevation</span>
        <strong>${formatElevation(elevation.minimum)}</strong>
      </div>
      <div class="stat">
        <span>Maximum elevation</span>
        <strong>${formatElevation(elevation.maximum)}</strong>
      </div>
      <div class="stat">
        <span>Average elevation</span>
        <strong>${formatElevation(elevation.average)}</strong>
      </div>
      <div class="stat">
        <span>Terrain variation</span>
        <strong>${formatElevation(elevation.terrainVariation)}</strong>
      </div>
      <div class="stat">
        <span>Total elevation gain</span>
        <strong>${formatElevation(elevation.elevationGain)}</strong>
      </div>
      <div class="stat">
        <span>Total elevation loss</span>
        <strong>${formatElevation(elevation.elevationLoss)}</strong>
      </div>
      <div class="stat">
        <span>Net elevation change</span>
        <strong>${formatElevationChange(elevation.netElevationChange)}</strong>
      </div>
      <div class="stat">
        <span>Valid elevation samples</span>
        <strong>${elevation.validSamples}/${elevation.totalSamples}</strong>
      </div>
    </div>

    <h2>Elevation Sample Data</h2>

    <p class="muted">
      The following table contains successfully retrieved
      MOLA elevation samples.
    </p>

    <table>
      <thead>
        <tr>
          <th>Sample</th>
          <th>Longitude</th>
          <th>Latitude</th>
          <th>Elevation</th>
        </tr>
      </thead>
      <tbody>${sampleRows}</tbody>
    </table>

    <h2>Scientific Methodology</h2>

    <p>
      Route distance is estimated using the great-circle
      calculation and Mars's mean radius of 3,389.5 km.
    </p>

    <p>
      The route is represented by interpolated geographic points.
      Elevation analysis uses 21 sample positions along the route
      and the NASA MOLA MEGDR topography dataset.
    </p>

    <p>
      Elevation gain and loss are calculated between consecutive
      samples with valid elevation readings. Missing samples are
      excluded from these calculations.
    </p>

    <div class="notice">
      <strong>Scientific limitation:</strong>
      This report is an educational, conceptual analysis.
      It is not a high-resolution terrain survey, a rover
      navigation solution, or a route-safety assessment.
      Sampled elevation values do not represent continuous
      terrain measurements.
    </div>

    <footer>
      MarsPath Explorer | Educational Mars Exploration Project
      <br>
      Data source: NASA MOLA MEGDR topography dataset.
      <br>
      Verify scientific source documentation before operational use.
    </footer>
  </main>
</body>
</html>
  `;

  const blob = new Blob([reportHTML], {
    type: "text/html;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = "MarsPath-Mission-Report.html";

  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function saveMissionReport(start, end, distance, elevation) {
  lastMissionReport = {
    start: { ...start },
    end: { ...end },
    distance,
    elevation,
    generatedAt: new Date().toLocaleString(),
  };

  if (exportReportButton) {
    exportReportButton.disabled = false;
    exportReportButton.textContent = "⬇ Export Mission Report";
  }

  if (saveRouteButton) {
    saveRouteButton.disabled = false;
  }
}

function resetMissionReport() {
  lastMissionReport = null;

  if (exportReportButton) {
    exportReportButton.disabled = true;
    exportReportButton.textContent = "⬇ Export Mission Report";
  }

  if (saveRouteButton) {
    saveRouteButton.disabled = true;
  }
}

/* -------------------------------------------------------
   9. SAVED ROUTES INTERFACE
------------------------------------------------------- */

function renderSavedRoutes() {
  if (!savedRoutesContainer) return;

  const routes = getSavedMissionRoutes();

  if (routes.length === 0) {
    savedRoutesContainer.innerHTML = `
      <div class="saved-routes-empty">
        No saved mission routes yet.
        Calculate a route and save it here.
      </div>
    `;

    return;
  }

  savedRoutesContainer.innerHTML = routes.map((route) => `
    <article class="saved-route-card" data-route-id="${escapeHTML(route.id)}">
      <div class="saved-route-card-heading">
        <strong>${escapeHTML(route.name)}</strong>
        <span class="saved-route-date">
          ${escapeHTML(new Date(route.savedAt).toLocaleDateString())}
        </span>
      </div>

      <div class="saved-route-details">
        <div>
          <span>START</span>
          <strong>${escapeHTML(route.start.name)}</strong>
          <small>
            ${Number(route.start.longitude).toFixed(4)}°,
            ${Number(route.start.latitude).toFixed(4)}°
          </small>
        </div>

        <div>
          <span>DESTINATION</span>
          <strong>${escapeHTML(route.end.name)}</strong>
          <small>
            ${Number(route.end.longitude).toFixed(4)}°,
            ${Number(route.end.latitude).toFixed(4)}°
          </small>
        </div>
      </div>

      <div class="saved-route-actions">
        <button type="button" class="load-saved-route">
          Load Route
        </button>

        <button type="button" class="delete-saved-route">
          Delete
        </button>
      </div>
    </article>
  `).join("");

  savedRoutesContainer.querySelectorAll(".load-saved-route")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-route-id]");
        const route = routes.find(
          (item) => item.id === card.dataset.routeId
        );

        if (route) {
          loadSavedRoute(route);
        }
      });
    });

  savedRoutesContainer.querySelectorAll(".delete-saved-route")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-route-id]");
        const routeId = card.dataset.routeId;

        const confirmed = window.confirm(
          "Are you sure you want to delete this saved mission route?"
        );

        if (!confirmed) return;

        if (deleteSavedMissionRoute(routeId)) {
          renderSavedRoutes();
          showResult("Saved mission route deleted.");
        } else {
          showResult("Unable to delete this route.", true);
        }
      });
    });
}

function loadSavedRoute(route) {
  if (
    !route ||
    !route.start ||
    !route.end ||
    !Number.isFinite(route.start.longitude) ||
    !Number.isFinite(route.start.latitude) ||
    !Number.isFinite(route.end.longitude) ||
    !Number.isFinite(route.end.latitude) ||
    Math.abs(route.start.latitude) > 90 ||
    Math.abs(route.end.latitude) > 90
  ) {
    showResult("This saved route contains invalid coordinates.", true);
    return;
  }

  customStart = { ...route.start };
  customEnd = { ...route.end };

  stopMapSelection();
  updateCustomSelectionUI();

  if (savedRouteNameInput) {
    savedRouteNameInput.value = route.name;
  }

  const instruction = document.querySelector(
    "#custom-route-instruction"
  );

  if (instruction) {
    instruction.textContent =
      `Loaded "${route.name}". Recalculating route...`;
  }

  const calculateCustomButton = document.querySelector(
    "#calculate-custom-route"
  );

  if (calculateCustomButton) {
    calculateCustomButton.click();
  } else {
    showResult(
      "Route points loaded, but the calculate button is unavailable.",
      true
    );
  }
}

function saveCurrentRouteFromUI() {
  if (!lastMissionReport) {
    showResult(
      "Calculate a route successfully before saving it.",
      true
    );
    return;
  }

  const name = savedRouteNameInput?.value.trim();

  if (!name) {
    showResult(
      "Please enter a name for your mission route.",
      true
    );

    savedRouteNameInput?.focus();
    return;
  }

  const savedRoute = saveMissionRoute(
    name,
    lastMissionReport.start,
    lastMissionReport.end
  );

  if (!savedRoute) {
    showResult(
      "Unable to save the route. Browser storage may be unavailable or full.",
      true
    );
    return;
  }

  savedRouteNameInput.value = "";

  renderSavedRoutes();

  showResult(
    `Mission route "${escapeHTML(savedRoute.name)}" saved successfully.`
  );
}

/* -------------------------------------------------------
   10. CUSTOM ROUTE SELECTION UI
------------------------------------------------------- */

function formatCoordinates(point) {
  if (!point) return "Not selected";

  return `${point.longitude.toFixed(4)}°, ${point.latitude.toFixed(4)}°`;
}

function stopMapSelection() {
  if (!mapInstance) return;

  mapInstance.set("routeSelectionMode", null);
  mapInstance.set("routeSelectionCallback", null);
}

function updateCustomSelectionUI() {
  if (!selectionStatus) return;

  const startText = customStart
    ? `Start: ${formatCoordinates(customStart)}`
    : "Start: Not selected";

  const endText = customEnd
    ? `Destination: ${formatCoordinates(customEnd)}`
    : "Destination: Not selected";

  selectionStatus.innerHTML = `
    <div class="custom-route-coordinate">
      <span>${startText}</span>
    </div>

    <div class="custom-route-coordinate">
      <span>${endText}</span>
    </div>
  `;
}

/* -------------------------------------------------------
   11. CREATE CUSTOM ROUTE CONTROLS
------------------------------------------------------- */

function createCustomRouteControls(map, calculateButton) {
  const existing = document.querySelector("#custom-route-controls");

  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "custom-route-controls";

  container.innerHTML = `
    <div class="custom-route-heading">
      <strong>Custom Mission Route</strong>
      <p>Choose any two points directly on the Mars map.</p>
    </div>

    <div class="custom-route-actions">
      <button type="button" id="pick-route-start">
        Pick Start on Map
      </button>

      <button type="button" id="pick-route-end">
        Pick Destination on Map
      </button>
    </div>

    <div id="custom-route-selection-status">
      <div>Start: Not selected</div>
      <div>Destination: Not selected</div>
    </div>

    <div class="custom-route-actions">
      <button type="button" id="calculate-custom-route">
        Calculate Custom Route
      </button>

      <button type="button" id="clear-custom-route">
        Clear Custom Points
      </button>
    </div>

    <button
      type="button"
      id="export-mission-report"
      disabled
    >
      ⬇ Export Mission Report
    </button>

    <p id="custom-route-instruction">
      Select a start point or destination to begin.
    </p>

    <section id="saved-mission-routes">
      <div class="saved-routes-heading">
        <strong>Saved Mission Routes</strong>
        <span>YOUR ROUTES</span>
      </div>

      <label for="saved-route-name">
        Mission route name
      </label>

      <input
        type="text"
        id="saved-route-name"
        maxlength="60"
        placeholder="e.g. Jezero Exploration Mission"
      />

      <button
        type="button"
        id="save-current-route"
        disabled
      >
        + Save Current Route
      </button>

      <div id="saved-routes-list"></div>
    </section>
  `;

  const parent = calculateButton.parentElement;

  if (!parent) {
    console.error(
      "Custom Route: Cannot find route planner container."
    );

    return null;
  }

  parent.insertAdjacentElement("afterend", container);

  const style = document.createElement("style");
  style.id = "mars-mission-export-styles";

  style.textContent = `
    #custom-route-controls {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 16px;
      box-sizing: border-box;
      border: 1px solid rgba(255, 136, 79, 0.35);
      border-radius: 12px;
      background: rgba(20, 27, 42, 0.95);
      color: #f8fafc;
    }

    #custom-route-controls .custom-route-heading strong {
      display: block;
      font-size: 16px;
      color: #ffffff;
      margin-bottom: 5px;
    }

    #custom-route-controls .custom-route-heading p {
      margin: 0 0 14px;
      color: #aeb9c9;
      font-size: 12px;
      line-height: 1.5;
    }

    #custom-route-controls .custom-route-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0;
    }

    #custom-route-controls button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 9px 12px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 7px;
      background: #263449;
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
    }

    #custom-route-controls button:hover:not(:disabled) {
      background: #354761;
    }

    #custom-route-controls button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    #custom-route-controls #export-mission-report {
      display: flex !important;
      width: 100% !important;
      min-height: 46px;
      margin-top: 15px;
      padding: 12px 16px;
      justify-content: center;
      align-items: center;
      border: 1px solid #ff884f !important;
      border-radius: 8px;
      background: #e87942 !important;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      visibility: visible !important;
    }

    #custom-route-controls #export-mission-report:disabled {
      background: #485365 !important;
      border-color: #64748b !important;
      color: #cbd5e1 !important;
      opacity: 0.75;
    }

    #custom-route-selection-status {
      display: grid;
      gap: 7px;
      margin: 12px 0;
      color: #d5deeb;
      font-size: 12px;
    }

    #custom-route-instruction {
      margin: 12px 0 0;
      color: #ffb58f;
      font-size: 12px;
      line-height: 1.5;
    }

    #saved-mission-routes {
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.12);
    }

    .saved-routes-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 14px;
    }

    .saved-routes-heading strong {
      font-size: 15px;
      color: #fff;
    }

    .saved-routes-heading span {
      color: #ffb58f;
      font-size: 9px;
      letter-spacing: 1px;
    }

    #saved-mission-routes label {
      display: block;
      margin-bottom: 6px;
      color: #cbd5e1;
      font-size: 11px;
    }

    #saved-route-name {
      display: block;
      width: 100%;
      min-height: 40px;
      padding: 10px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 7px;
      outline: none;
      background: #111c2d;
      color: #fff;
      font-size: 12px;
      box-sizing: border-box;
    }

    #saved-route-name:focus {
      border-color: #ff884f;
    }

    #saved-mission-routes #save-current-route {
      width: 100%;
      margin-top: 9px;
      min-height: 42px;
      background: #e87942;
      border-color: #e87942;
      color: #fff;
      font-weight: 700;
    }

    #saved-routes-list {
      display: grid;
      gap: 10px;
      margin-top: 15px;
    }

    .saved-route-card {
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      background: rgba(255,255,255,0.035);
    }

    .saved-route-card-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .saved-route-card-heading strong {
      color: #fff;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .saved-route-date {
      color: #9caec2;
      font-size: 10px;
      white-space: nowrap;
    }

    .saved-route-details {
      display: grid;
      gap: 9px;
      margin: 12px 0;
    }

    .saved-route-details span {
      display: block;
      margin-bottom: 3px;
      color: #ffb58f;
      font-size: 9px;
      letter-spacing: 0.7px;
    }

    .saved-route-details strong {
      display: block;
      color: #e2e8f0;
      font-size: 11px;
    }

    .saved-route-details small {
      display: block;
      margin-top: 3px;
      color: #9caec2;
      font-size: 10px;
    }

    .saved-route-actions {
      display: flex;
      gap: 8px;
    }

    .saved-route-actions button {
      flex: 1;
      min-height: 34px !important;
      font-size: 11px !important;
    }

    .saved-route-actions .load-saved-route {
      background: #263e57 !important;
      border-color: #45627e !important;
    }

    .saved-route-actions .delete-saved-route {
      background: #542d35 !important;
      border-color: #87434e !important;
    }

    .saved-routes-empty {
      padding: 13px;
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #9caec2;
      font-size: 11px;
      line-height: 1.6;
      text-align: center;
    }
  `;

  if (!document.querySelector("#mars-mission-export-styles")) {
    document.head.appendChild(style);
  }

  selectionStatus = container.querySelector(
    "#custom-route-selection-status"
  );

  const pickStartButton = container.querySelector(
    "#pick-route-start"
  );

  const pickEndButton = container.querySelector(
    "#pick-route-end"
  );

  const calculateCustomButton = container.querySelector(
    "#calculate-custom-route"
  );

  const clearCustomButton = container.querySelector(
    "#clear-custom-route"
  );

  exportReportButton = container.querySelector(
    "#export-mission-report"
  );

  saveRouteButton = container.querySelector(
    "#save-current-route"
  );

  savedRouteNameInput = container.querySelector(
    "#saved-route-name"
  );

  savedRoutesContainer = container.querySelector(
    "#saved-routes-list"
  );

  const instruction = container.querySelector(
    "#custom-route-instruction"
  );

  exportReportButton.addEventListener(
    "click",
    exportMissionReport
  );

  saveRouteButton.addEventListener(
    "click",
    saveCurrentRouteFromUI
  );

  function activateSelection(mode) {
    stopMapSelection();

    const label =
      mode === "start" ? "START POINT" : "DESTINATION";

    instruction.textContent =
      `Click anywhere on the Mars map to select your ${label.toLowerCase()}.`;

    map.set("routeSelectionMode", mode);

    map.set("routeSelectionCallback", (coordinates) => {
      if (
        !coordinates ||
        !Number.isFinite(coordinates.longitude) ||
        !Number.isFinite(coordinates.latitude) ||
        coordinates.latitude < -90 ||
        coordinates.latitude > 90
      ) {
        instruction.textContent =
          "Invalid coordinates. Please select another point.";

        return;
      }

      const selectedPoint = {
        name:
          mode === "start"
            ? "Custom Start Point"
            : "Custom Destination",

        longitude: normalizeLongitude(coordinates.longitude),
        latitude: coordinates.latitude,
      };

      if (mode === "start") {
        customStart = selectedPoint;
      } else {
        customEnd = selectedPoint;
      }

      stopMapSelection();
      updateCustomSelectionUI();

      instruction.textContent =
        `${label} selected successfully.`;

      resetMissionReport();

      console.log("Custom route point selected:", selectedPoint);
    });
  }

  pickStartButton.addEventListener("click", () => {
    activateSelection("start");
  });

  pickEndButton.addEventListener("click", () => {
    activateSelection("end");
  });

  clearCustomButton.addEventListener("click", () => {
    stopMapSelection();

    customStart = null;
    customEnd = null;

    clearMarsRoute();
    resetMissionReport();

    updateCustomSelectionUI();

    instruction.textContent =
      "Custom points cleared. Select new points on the map.";

    showResult("Select custom start and destination points.");
  });

  calculateCustomButton.addEventListener("click", async () => {
    stopMapSelection();

    if (!customStart || !customEnd) {
      instruction.textContent =
        "Please select both a start point and a destination.";

      showResult(
        "Select both custom route points on the Mars map first.",
        true
      );

      return;
    }

    const samePoint =
      Math.abs(customStart.longitude - customEnd.longitude) < 0.000001 &&
      Math.abs(customStart.latitude - customEnd.latitude) < 0.000001;

    if (samePoint) {
      showResult(
        "Start and destination cannot be the same point.",
        true
      );
      return;
    }

    calculateCustomButton.disabled = true;
    calculateButton.disabled = true;

    resetMissionReport();

    showResult(
      "Calculating custom mission route and retrieving MOLA elevation data..."
    );

    try {
      const distance = calculateMarsDistance(
        customStart,
        customEnd
      );

      const routePoints = generateGreatCirclePoints(
        customStart,
        customEnd,
        100
      );

      if (!drawMarsRoute(customStart, customEnd, routePoints)) {
        throw new Error("Unable to draw the custom route.");
      }

      const elevation = await analyzeRouteElevation(routePoints);

      saveMissionReport(
        customStart,
        customEnd,
        distance,
        elevation
      );

      showResult(
        createRouteReport(
          customStart,
          customEnd,
          distance,
          elevation
        )
      );

      instruction.textContent =
        "Custom mission route calculated successfully.";

      console.log("Custom route analysis completed:", elevation);
    } catch (error) {
      console.error("Custom route analysis error:", error);

      resetMissionReport();

      showResult(
        `Route was calculated, but elevation analysis failed: ${escapeHTML(error.message)}`,
        true
      );
    } finally {
      calculateCustomButton.disabled = false;
      calculateButton.disabled = false;
    }
  });

  updateCustomSelectionUI();
  renderSavedRoutes();

  return container;
}

/* -------------------------------------------------------
   12. INITIALIZE ROUTE PLANNER
------------------------------------------------------- */

export function initializeRoutePlanner(map) {
  if (!map) {
    console.error("Route Planner: No map instance provided.");
    return;
  }

  if (!initializeRouteLayer(map)) return;

  mapInstance = map;

  const startSelect = document.querySelector("#route-start");
  const endSelect = document.querySelector("#route-end");

  const calculateButton =
    document.querySelector("#calculate-route");

  const clearButton =
    document.querySelector("#clear-route");

  if (
    !startSelect ||
    !endSelect ||
    !calculateButton ||
    !clearButton
  ) {
    console.error(
      "Route Planner: Required HTML elements are missing."
    );
    return;
  }

  createCustomRouteControls(map, calculateButton);

  /* Predefined landmark route functionality. */
  calculateButton.addEventListener("click", async () => {
    const start = MARS_LOCATIONS[startSelect.value];
    const end = MARS_LOCATIONS[endSelect.value];

    if (!start || !end) {
      showResult("Please select valid locations.", true);
      return;
    }

    if (startSelect.value === endSelect.value) {
      clearMarsRoute();
      resetMissionReport();

      showResult("Please select two different locations.", true);
      return;
    }

    calculateButton.disabled = true;

    const customCalculateButton = document.querySelector(
      "#calculate-custom-route"
    );

    if (customCalculateButton) {
      customCalculateButton.disabled = true;
    }

    resetMissionReport();

    showResult(
      "Calculating route and retrieving MOLA elevation data..."
    );

    try {
      const distance = calculateMarsDistance(start, end);

      const routePoints = generateGreatCirclePoints(
        start,
        end,
        100
      );

      const routeDrawn = drawMarsRoute(
        start,
        end,
        routePoints
      );

      if (!routeDrawn) {
        throw new Error("Unable to draw the route.");
      }

      const elevation = await analyzeRouteElevation(routePoints);

      saveMissionReport(
        start,
        end,
        distance,
        elevation
      );

      showResult(
        createRouteReport(start, end, distance, elevation)
      );

      console.log(
        "Landmark route analysis completed:",
        elevation
      );
    } catch (error) {
      console.error("Route analysis error:", error);

      resetMissionReport();

      showResult(
        `Route was calculated, but elevation analysis failed: ${escapeHTML(error.message)}`,
        true
      );
    } finally {
      calculateButton.disabled = false;

      if (customCalculateButton) {
        customCalculateButton.disabled = false;
      }
    }
  });

  clearButton.addEventListener("click", () => {
    stopMapSelection();

    clearMarsRoute();
    resetMissionReport();

    customStart = null;
    customEnd = null;

    updateCustomSelectionUI();

    startSelect.value = "jezero";
    endSelect.value = "gale";

    showResult(
      "Select two locations to calculate a route."
    );

    console.log("Route cleared.");
  });

  console.log("Route Planner initialized successfully.");
  console.log(
    "Custom routes, mission report export, and saved routes are ready."
  );
}
