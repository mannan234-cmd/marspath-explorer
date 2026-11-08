
import Control from "ol/control/Control.js";

const GRID_COLUMNS = 5760;
const GRID_ROWS = 2880;
const SAMPLES_PER_DEGREE = 16;
const EXPECTED_BYTES = GRID_COLUMNS * GRID_ROWS * 2;

const MOLA_DATA_URL = "/data/megt90n000eb.img";

let molaDataPromise = null;

// Load NASA MOLA binary data once and reuse it.
async function loadMolaData() {
  if (!molaDataPromise) {
    molaDataPromise = fetch(MOLA_DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `MOLA file could not be loaded: HTTP ${response.status}`
          );
        }

        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (buffer.byteLength !== EXPECTED_BYTES) {
          throw new Error(
            `Unexpected MOLA file size: ${buffer.byteLength} bytes`
          );
        }

        return new DataView(buffer);
      })
      .catch((error) => {
        molaDataPromise = null;
        throw error;
      });
  }

  return molaDataPromise;
}

// Read the nearest MOLA grid cell for a coordinate.
export async function getMolaElevation(longitude, latitude) {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Invalid Mars longitude or latitude.");
  }

  const data = await loadMolaData();

  // Normalize longitude to the 0°–360° east convention.
  const eastLongitude = ((longitude % 360) + 360) % 360;

  const column = Math.min(
    GRID_COLUMNS - 1,
    Math.floor(eastLongitude * SAMPLES_PER_DEGREE)
  );

  const row = Math.min(
    GRID_ROWS - 1,
    Math.max(
      0,
      Math.floor((90 - latitude) * SAMPLES_PER_DEGREE)
    )
  );

  // Row-major storage; signed 16-bit big-endian samples.
  const sampleIndex = row * GRID_COLUMNS + column;
  const byteOffset = sampleIndex * 2;

  const elevationMeters = data.getInt16(byteOffset, false);

  return {
    elevationMeters,
    longitude,
    latitude,
    row,
    column,
    resolutionDegrees: 1 / SAMPLES_PER_DEGREE,
    approximateEquatorialSpacingKm: 3.7,
    method: "Nearest MOLA grid cell",
  };
}

// Create the manual elevation control.
function createElevationControl() {
  const element = document.createElement("div");

  element.className =
    "mola-elevation-control ol-unselectable ol-control";

  element.innerHTML = `
    <div class="mola-elevation-heading">
      MOLA ELEVATION READER
    </div>

    <div class="mola-elevation-value">
      Click anywhere on Mars
    </div>

    <div class="mola-elevation-coordinates">
      Waiting for map selection
    </div>

    <div class="mola-elevation-source">
      Source: NASA MGS MOLA · 1/16° grid
    </div>
  `;

  const valueElement = element.querySelector(
    ".mola-elevation-value"
  );

  const coordinatesElement = element.querySelector(
    ".mola-elevation-coordinates"
  );

  const control = new Control({ element });

  return {
    control,
    valueElement,
    coordinatesElement,
  };
}

// Add the manual reader to the Mars map.
export function initializeMolaElevation(
  marsMap,
  locationLayer
) {
  if (!marsMap) {
    console.error("Mars map is not initialized.");
    return;
  }

  addElevationStyles();

  const {
    control,
    valueElement,
    coordinatesElement,
  } = createElevationControl();

  marsMap.addControl(control);

  marsMap.on("singleclick", async (event) => {
    // Preserve landmark selection behavior.
    const clickedLandmark = marsMap.forEachFeatureAtPixel(
      event.pixel,
      (feature) => feature,
      {
        layerFilter: (layer) => layer === locationLayer,
        hitTolerance: 8,
      }
    );

    if (clickedLandmark) return;

    const [longitude, latitude] = event.coordinate;

    valueElement.textContent = "Loading NASA MOLA data...";
    coordinatesElement.textContent = "Reading selected location";

    try {
      const result = await getMolaElevation(
        longitude,
        latitude
      );

      valueElement.textContent =
        `${result.elevationMeters.toLocaleString()} m`;

      coordinatesElement.textContent =
        `Longitude: ${result.longitude.toFixed(4)}° | ` +
        `Latitude: ${result.latitude.toFixed(4)}°`;
    } catch (error) {
      console.error("MOLA elevation error:", error);

      valueElement.textContent = "Elevation unavailable";

      coordinatesElement.textContent =
        "Check that the MOLA IMG file is in public/data.";
    }
  });

  console.log("NASA MOLA elevation reader initialized.");
}

// Add control styling.
function addElevationStyles() {
  if (document.getElementById("mola-elevation-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "mola-elevation-styles";

  style.textContent = `
    .mola-elevation-control {
      left: 12px;
      bottom: 12px;
      top: auto;
      right: auto;
      min-width: 220px;
      max-width: 290px;
      padding: 13px 15px;
      border: 1px solid rgba(231,131,86,0.45);
      border-radius: 10px;
      background: rgba(8,13,23,0.95);
      color: #ffffff;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }

    .mola-elevation-heading {
      color: #e78356;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
      margin-bottom: 9px;
    }

    .mola-elevation-value {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .mola-elevation-coordinates {
      color: #b8c2d1;
      font-size: 10px;
      line-height: 1.6;
    }

    .mola-elevation-source {
      color: #8997aa;
      font-size: 9px;
      margin-top: 9px;
    }
  `;

  document.head.appendChild(style);
}
