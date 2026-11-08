
import { MARS_LOCATIONS } from "./map.js";
import { getMolaElevation } from "./mola-elevation.js";

// ==========================================
// 1. SAFE HTML ELEMENT HELPER
// ==========================================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// ==========================================
// 2. CREATE LANDMARK DROPDOWN
// ==========================================

function createLocationSelect(id, selectedId) {
  const select = document.createElement("select");

  select.id = id;
  select.setAttribute("aria-label", "Select a Mars landmark");

  MARS_LOCATIONS.forEach((location) => {
    const option = document.createElement("option");

    option.value = location.id;
    option.textContent = location.name;
    option.selected = location.id === selectedId;

    select.appendChild(option);
  });

  return select;
}

// ==========================================
// 3. CREATE COMPARISON CARD
// ==========================================

function createComparisonCard(location) {
  const card = createElement("article", "comparison-card");

  const heading = createElement(
    "div",
    "comparison-card-heading"
  );

  heading.append(
    createElement("span", "comparison-card-label", "LOCATION"),
    createElement("h4", "", location.name),
    createElement("span", "comparison-category", location.category)
  );

  const coordinates = createElement(
    "div",
    "comparison-detail"
  );

  coordinates.append(
    createElement("span", "comparison-detail-label", "COORDINATES"),
    createElement("strong", "", location.coordinates),
    createElement("small", "", location.coordinateType)
  );

  const elevation = createElement(
    "div",
    "comparison-elevation"
  );

  elevation.append(
    createElement(
      "span",
      "comparison-detail-label",
      "NASA MOLA ELEVATION"
    ),
    createElement(
      "strong",
      "comparison-elevation-value",
      "Loading..."
    ),
    createElement(
      "small",
      "comparison-elevation-note",
      "Reading nearest MOLA grid cell..."
    )
  );

  const overview = createElement(
    "section",
    "comparison-detail"
  );

  overview.append(
    createElement("h5", "", "Geological Overview"),
    createElement("p", "", location.overview)
  );

  const significance = createElement(
    "section",
    "comparison-detail"
  );

  significance.append(
    createElement("h5", "", "Scientific Significance"),
    createElement("p", "", location.significance)
  );

  const mission = createElement(
    "section",
    "comparison-detail"
  );

  mission.append(
    createElement("h5", "", "Mission & Exploration"),
    createElement("p", "", location.exploration),
    createElement(
      "span",
      "comparison-mission",
      `${location.mission} · ${location.missionYear}`
    )
  );

  const facts = createElement(
    "section",
    "comparison-detail"
  );

  facts.appendChild(
    createElement("h5", "", "Key Scientific Facts")
  );

  const list = document.createElement("ul");

  location.facts.forEach((fact) => {
    list.appendChild(createElement("li", "", fact));
  });

  facts.appendChild(list);

  const sources = createElement(
    "section",
    "comparison-detail"
  );

  sources.appendChild(
    createElement("h5", "", "Scientific References")
  );

  const sourceList = createElement(
    "div",
    "comparison-sources"
  );

  location.sources.forEach((source) => {
    const link = createElement(
      "a",
      "",
      `${source.label} ↗`
    );

    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    sourceList.appendChild(link);
  });

  sources.appendChild(sourceList);

  card.append(
    heading,
    coordinates,
    elevation,
    overview,
    significance,
    mission,
    facts,
    sources
  );

  return {
    card,
    elevationValue: elevation.querySelector(
      ".comparison-elevation-value"
    ),
    elevationNote: elevation.querySelector(
      ".comparison-elevation-note"
    ),
  };
}

// ==========================================
// 4. READ ACTUAL MOLA ELEVATION
// ==========================================

async function loadComparisonElevation(
  location,
  valueElement,
  noteElement
) {
  try {
    const result = await getMolaElevation(
      location.longitude,
      location.latitude
    );

    valueElement.textContent =
      `${result.elevationMeters.toLocaleString()} m`;

    noteElement.textContent =
      `Nearest grid cell: row ${result.row}, column ${result.column}. ` +
      `Grid spacing: approximately ${result.approximateEquatorialSpacingKm} km at the equator.`;
  } catch (error) {
    console.error(
      `Comparison MOLA reading failed for ${location.name}:`,
      error
    );

    valueElement.textContent = "Unavailable";

    noteElement.textContent =
      "NASA MOLA data could not be loaded. Check the public/data dataset.";
  }
}

// ==========================================
// 5. COMPARE TWO LOCATIONS
// ==========================================

function createComparisonSummary(first, second) {
  const summary = createElement(
    "section",
    "comparison-summary"
  );

  summary.appendChild(
    createElement("span", "comparison-card-label", "COMPARISON INSIGHT")
  );

  summary.appendChild(
    createElement(
      "h4",
      "",
      `${first.name} vs ${second.name}`
    )
  );

  const firstType = first.category;
  const secondType = second.category;

  const firstMission = first.mission;
  const secondMission = second.mission;

  summary.append(
    createElement(
      "p",
      "",
      `${first.name} is classified as a ${firstType.toLowerCase()}, ` +
      `while ${second.name} is classified as a ${secondType.toLowerCase()}.`
    ),
    createElement(
      "p",
      "",
      `Exploration context: ${firstMission} and ${secondMission}.`
    ),
    createElement(
      "p",
      "comparison-summary-note",
      "Compare the geological descriptions, scientific objectives, coordinates, and MOLA readings above. Elevation values represent nearest-grid-cell samples, not exact point measurements."
    )
  );

  return summary;
}

// ==========================================
// 6. INITIALIZE SCIENTIFIC COMPARISON
// ==========================================

export function initializeLocationComparison() {
  const container = document.getElementById(
    "location-comparison"
  );

  if (!container) {
    console.error(
      "Location Comparison: #location-comparison was not found."
    );

    return;
  }

  const firstSelect = createLocationSelect(
    "comparison-location-one",
    "jezero"
  );

  const secondSelect = createLocationSelect(
    "comparison-location-two",
    "gale"
  );

  const compareButton = createElement(
    "button",
    "comparison-button",
    "Compare Locations"
  );

  compareButton.type = "button";

  const resultContainer = createElement(
    "div",
    "comparison-results"
  );

  const controls = createElement(
    "div",
    "comparison-controls"
  );

  const firstGroup = createElement(
    "div",
    "comparison-select-group"
  );

  firstGroup.append(
    createElement("label", "", "First Location"),
    firstSelect
  );

  firstGroup.querySelector("label").htmlFor =
    "comparison-location-one";

  const secondGroup = createElement(
    "div",
    "comparison-select-group"
  );

  secondGroup.append(
    createElement("label", "", "Second Location"),
    secondSelect
  );

  secondGroup.querySelector("label").htmlFor =
    "comparison-location-two";

  controls.append(
    firstGroup,
    secondGroup,
    compareButton
  );

  container.replaceChildren(controls, resultContainer);

  let comparisonRequest = 0;

  // ========================================
  // 7. RENDER COMPARISON
  // ========================================

  async function renderComparison() {
    const firstId = firstSelect.value;
    const secondId = secondSelect.value;

    if (firstId === secondId) {
      resultContainer.replaceChildren(
        createElement(
          "p",
          "comparison-error",
          "Please select two different Martian locations."
        )
      );

      return;
    }

    const first = MARS_LOCATIONS.find(
      (location) => location.id === firstId
    );

    const second = MARS_LOCATIONS.find(
      (location) => location.id === secondId
    );

    if (!first || !second) {
      resultContainer.replaceChildren(
        createElement(
          "p",
          "comparison-error",
          "The selected landmark could not be found."
        )
      );

      return;
    }

    const requestId = ++comparisonRequest;

    compareButton.disabled = true;
    compareButton.textContent = "Loading Comparison...";

    resultContainer.replaceChildren(
      createElement(
        "p",
        "comparison-loading",
        "Preparing scientific profiles and reading NASA MOLA elevation data..."
      )
    );

    try {
      const firstCard = createComparisonCard(first);
      const secondCard = createComparisonCard(second);

      const cards = createElement(
        "div",
        "comparison-grid"
      );

      cards.append(
        firstCard.card,
        secondCard.card
      );

      const summary = createComparisonSummary(
        first,
        second
      );

      resultContainer.replaceChildren(cards, summary);

      // Both readings use the same cached MOLA dataset.
      await Promise.all([
        loadComparisonElevation(
          first,
          firstCard.elevationValue,
          firstCard.elevationNote
        ),
        loadComparisonElevation(
          second,
          secondCard.elevationValue,
          secondCard.elevationNote
        ),
      ]);
    } finally {
      if (requestId === comparisonRequest) {
        compareButton.disabled = false;
        compareButton.textContent = "Compare Locations";
      }
    }
  }

  compareButton.addEventListener(
    "click",
    renderComparison
  );

  // Render an initial comparison automatically.
  renderComparison();

  console.log(
    "MarsPath Explorer: Scientific Location Comparison initialized."
  );
}
