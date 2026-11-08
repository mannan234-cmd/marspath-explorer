
import { initializeMarsMap } from "./components/map.js";
import { initializeRoutePlanner } from "./components/route-planner.js";
import { initializeLocationComparison } from "./components/location-comparison.js";
import "./style.css";

const app = document.querySelector("#app");

if (!app) {
  throw new Error(
    'MarsPath Explorer: Could not find the application element "#app".'
  );
}

app.innerHTML = `
  <div class="app-shell">

    <!-- Header -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-icon"><span class="brand-orbit"></span><span class="brand-core">M</span></div>
        <div>
          <h1>MarsPath <span>Explorer</span></h1>
          <p>PLANETARY EXPLORATION STUDIO</p>
        </div>
      </div>

      <nav class="main-nav" aria-label="Main navigation">
        <a href="#explore" class="active">Explore</a>
        <a href="#locations">Locations</a>
        <a href="#about">About</a>
      </nav>

      <div class="system-status" role="status" aria-label="System status: all systems nominal">
        <span class="status-dot"></span>
        <span>ALL SYSTEMS NOMINAL</span>
      </div>
    </header>

    <!-- Mission overview: a clear starting point for the explorer -->
    <section class="mission-hero" aria-label="Mars mission overview" id="home">
      <div class="mission-hero-copy">
        <div class="hero-kicker"><span class="hero-kicker-dot"></span> PLANETARY FIELD STATION <span class="hero-kicker-line"></span> LIVE DATA WORKSPACE</div>
        <h2>Your next discovery<br><em>is on Mars.</em></h2>
        <p>Explore real planetary imagery, inspect remarkable landmarks, compare elevation data, and plan your own conceptual expedition.</p>
        <div class="hero-actions">
          <a class="hero-action" href="#mars-map">Open the Mars map <span aria-hidden="true">↗</span></a>
          <a class="hero-secondary-action" href="#locations">Explore destinations <span aria-hidden="true">→</span></a>
        </div>
        <div class="hero-stats">
          <div><strong>03</strong><span>FEATURED SITES</span></div>
          <div><strong>MOLA</strong><span>ELEVATION DATA</span></div>
          <div><strong>NASA</strong><span>PLANETARY IMAGERY</span></div>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
        <div class="hero-planet"></div><div class="hero-planet-glow"></div>
        <div class="hero-coordinate coord-one">18.44° N <b>JEZERO</b></div>
        <div class="hero-coordinate coord-two">04.59° S <b>GALE</b></div>
        <div class="hero-signal"></div>
      </div>
    </section>

    <!-- Main workspace -->
    <main class="workspace" id="explore" aria-label="Mars exploration workspace">

      <!-- Left sidebar -->
      <aside class="sidebar">

        <section class="sidebar-section">
          <p class="section-eyebrow">FIELD GUIDE <span class="eyebrow-index">01 / 03</span></p>
          <h2>Choose a destination</h2>
          <p class="sidebar-description">
            Explore the surface of Mars through scientific imagery and
            verified planetary data.
          </p>
        </section>

        <!-- Mission Locations -->
        <section class="sidebar-section" id="locations">
          <div class="section-heading">
            <h3>Featured landmarks</h3>
            <span class="count-label">03 SITES</span>
          </div>

          <div id="location-list" class="location-list">
            <button class="location-item" data-location-id="jezero">
              <span class="location-marker"></span>
              <span>
                <strong>Jezero Crater</strong>
                <small>Perseverance landing site</small>
              </span>
            </button>

            <button class="location-item" data-location-id="gale">
              <span class="location-marker"></span>
              <span>
                <strong>Gale Crater</strong>
                <small>Curiosity exploration site</small>
              </span>
            </button>

            <button class="location-item" data-location-id="olympus">
              <span class="location-marker"></span>
              <span>
                <strong>Olympus Mons</strong>
                <small>Largest known volcano on Mars</small>
              </span>
            </button>
          </div>
        </section>

        <!-- Scientific Location Comparison -->
        <section class="sidebar-section location-comparison-section">
          <div class="section-heading">
            <h3>Scientific comparison</h3>
            <span class="count-label">SCIENCE TOOL</span>
          </div>

          <p class="comparison-intro">
            Compare two Martian landmarks, their geology, mission history,
            scientific importance, and NASA MOLA elevation readings.
          </p>

          <div id="location-comparison"></div>
        </section>

        <!-- Route Planner -->
        <section class="sidebar-section route-planner">
          <div class="section-heading">
            <h3>Build an expedition</h3>
            <span class="count-label">EXPERIMENTAL</span>
          </div>

          <label for="route-start">Starting Location</label>
          <select id="route-start">
            <option value="jezero">Jezero Crater</option>
            <option value="gale">Gale Crater</option>
            <option value="olympus">Olympus Mons</option>
          </select>

          <label for="route-end">Destination</label>
          <select id="route-end">
            <option value="jezero">Jezero Crater</option>
            <option value="gale" selected>Gale Crater</option>
            <option value="olympus">Olympus Mons</option>
          </select>

          <div class="route-buttons">
            <button id="calculate-route" class="primary-button">
              Calculate Route
            </button>

            <button id="clear-route" class="secondary-button">
              Clear
            </button>
          </div>

          <div id="route-result" class="route-result" aria-live="polite">
            Select two locations to calculate a route.
          </div>

          <p class="route-disclaimer">
            Distance is an estimated surface measurement. This route is
            conceptual and is not a navigation or safety recommendation.
          </p>
        </section>

        <!-- Data Sources -->
        <section class="sidebar-section data-sources">
          <h3>Data Sources</h3>
          <div class="source-tags">
            <span>NASA</span>
            <span>PDS</span>
            <span>MOLA</span>
          </div>
        </section>

      </aside>

      <!-- Center map area -->
      <section class="map-section" aria-label="Interactive Mars surface map">
        <div class="map-heading">
          <div>
            <p class="section-eyebrow">LIVE PLANETARY VIEW <span class="eyebrow-index">02 / 03</span></p>
            <h2>Surface explorer</h2>
            <p>Navigate the Martian surface and discover scientific sites.</p>
          </div>

          <span class="map-layer-label">
            <span class="status-dot"></span>
            NASA IMAGERY
          </span>
        </div>

        <div class="map-placeholder" aria-label="Map workspace">
          <div
            id="mars-map"
            aria-label="Interactive NASA map of Mars"
          ></div>

          <div id="map-status" class="map-status">
            Connecting to NASA Mars imagery...
          </div>
        </div>

        <div class="map-footer">
          <span>Planet: Mars</span>
          <span>Imagery: NASA Mars Trek</span>
          <span>Map: Interactive planetary view</span>
        </div>
      </section>

      <!-- Right information panel -->
      <aside class="info-panel">
        <section class="info-intro">
          <p class="section-eyebrow">MISSION INTELLIGENCE <span class="eyebrow-index">03 / 03</span></p>
          <h2>Discovery briefing</h2>
          <p>
            Discover important Martian locations, understand their
            scientific significance, and plan conceptual exploration routes.
          </p>
        </section>

        <section id="location-details" class="location-details">
          <div class="empty-details">
            <div class="details-icon">⌖</div>
            <h3>Select a Location</h3>
            <p>
              Select a marked location on the map or choose a mission
              location to explore its scientific details.
            </p>
          </div>
        </section>

        <section class="info-card">
          <h3>Exploration Tools</h3>
          <p>
            Explore planetary imagery, inspect locations, view elevation
            information, and calculate conceptual distances.
          </p>
        </section>

        <section class="info-card">
          <h3>Scientific Approach</h3>
          <p>
            MarsPath Explorer uses planetary datasets and clearly identifies
            scientific information, derived measurements, and estimates.
          </p>
        </section>

        <section class="disclaimer-card">
          <strong>Important Note</strong>
          <p>
            This platform is an educational exploration tool. Route
            calculations do not represent verified rover paths or
            assessments of terrain safety.
          </p>
        </section>
      </aside>

    </main>

    <!-- Footer -->
    <footer class="app-footer" id="about">
      <span>MarsPath Explorer</span>
      <span>Built for scientific learning and planetary exploration</span>
      <span>Data attribution: NASA / PDS</span>
    </footer>

  </div>
`;

/*
 * Initialize the Mars map first.
 * Then initialize components that depend on the map.
 */
const marsMap = initializeMarsMap();

if (marsMap) {
  initializeRoutePlanner(marsMap);
} else {
  console.error(
    "MarsPath Explorer: Map initialization failed. Route planner was not initialized."
  );
}

/*
 * Initialize Scientific Location Comparison.
 * This component reads landmark data and MOLA elevations.
 * It does not require the map instance.
 */
initializeLocationComparison();
