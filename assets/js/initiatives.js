let initiatives = [];
let filtered = [];
let map;
let markers;

const fields = {
  name: "Initiative / Organization",
  type: "Type",
  location: "Location",
  country: "Country",
  region: "Region",
  leadership: "Leadership",
  goals: "Goals (2–3)",
  activities: "Major Activities (3)",
  outcomes: "Key Outcomes / Accomplishments (2–3)",
  website: "Website",
  contact: "Phone / Email (where publicly available)",
  lat: "Latitude",
  lon: "Longitude"
};

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map(row => clean(row[field])).filter(Boolean))].sort();
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  select.innerHTML = `<option value="">All</option>`;

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: false }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markers = L.markerClusterGroup();
  map.addLayer(markers);
}

function hasCoordinates(row) {
  const lat = parseFloat(clean(row[fields.lat]));
  const lon = parseFloat(clean(row[fields.lon]));
  return Number.isFinite(lat) && Number.isFinite(lon);
}

function selectedCardHtml(row) {
  const name = clean(row[fields.name]) || "Initiative";
  const type = clean(row[fields.type]);
  const location = clean(row[fields.location]);
  const country = clean(row[fields.country]);
  const region = clean(row[fields.region]);
  const leadership = clean(row[fields.leadership]);
  const goals = clean(row[fields.goals]);
  const activities = clean(row[fields.activities]);
  const outcomes = clean(row[fields.outcomes]);
  const website = clean(row[fields.website]);
  const contact = clean(row[fields.contact]);

  return `
    <article class="initiative-detail-card">
      <div class="card-kicker">Selected Initiative</div>
      <h2>${name}</h2>

      <div class="initiative-meta">
        ${type ? `<span>${type}</span>` : ""}
        ${location ? `<span>${location}</span>` : ""}
        ${country ? `<span>${country}</span>` : ""}
        ${region ? `<span>${region}</span>` : ""}
      </div>

      ${leadership ? `
        <div class="detail-block">
          <h3>Leadership</h3>
          <p>${leadership}</p>
        </div>
      ` : ""}

      ${goals ? `
        <div class="detail-block">
          <h3>Goals</h3>
          <p>${goals}</p>
        </div>
      ` : ""}

      ${activities ? `
        <div class="detail-block">
          <h3>Major Activities</h3>
          <p>${activities}</p>
        </div>
      ` : ""}

      ${outcomes ? `
        <div class="detail-block">
          <h3>Key Outcomes / Accomplishments</h3>
          <p>${outcomes}</p>
        </div>
      ` : ""}

      ${contact ? `
        <div class="detail-block">
          <h3>Contact</h3>
          <p>${contact}</p>
        </div>
      ` : ""}

      ${website ? `
        <a class="button detail-button" href="${website}" target="_blank" rel="noopener">
          Visit website
        </a>
      ` : ""}
    </article>
  `;
}

function updateSelectedCard(row) {
  const panel = document.getElementById("selectedInitiative");
  panel.innerHTML = selectedCardHtml(row);
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateMarkers(rows) {
  markers.clearLayers();

  const coordinateRows = rows.filter(hasCoordinates);

  coordinateRows.forEach(row => {
    const lat = parseFloat(clean(row[fields.lat]));
    const lon = parseFloat(clean(row[fields.lon]));

    const marker = L.marker([lat, lon]);

    marker.on("click", () => {
      updateSelectedCard(row);
    });

    marker.bindTooltip(clean(row[fields.name]) || "Initiative");
    markers.addLayer(marker);
  });

  if (coordinateRows.length > 0) {
    const group = L.featureGroup(markers.getLayers());
    map.fitBounds(group.getBounds().pad(0.15));
  }

  const panel = document.getElementById("selectedInitiative");
  if (coordinateRows.length === 0) {
    panel.innerHTML = `<p>No mapped initiatives match the selected filters.</p>`;
  } else {
    panel.innerHTML = `<p>Select an initiative on the map to view details.</p>`;
  }
}

function updateStats(rows) {
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-countries").textContent = uniqueValues(rows, fields.country).length;
  document.getElementById("stat-regions").textContent = uniqueValues(rows, fields.region).length;
}

function applyFilters() {
  const q = clean(document.getElementById("searchInput").value).toLowerCase();
  const region = clean(document.getElementById("regionFilter").value);
  const country = clean(document.getElementById("countryFilter").value);

  filtered = initiatives.filter(row => {
    const combined = Object.values(row).join(" ").toLowerCase();

    return (!q || combined.includes(q)) &&
           (!region || clean(row[fields.region]) === region) &&
           (!country || clean(row[fields.country]) === country);
  });

  updateStats(filtered);
  updateMarkers(filtered);
}

function setupFilters() {
  populateSelect("regionFilter", uniqueValues(initiatives, fields.region));
  populateSelect("countryFilter", uniqueValues(initiatives, fields.country));

  ["searchInput", "regionFilter", "countryFilter"].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();

  Papa.parse("data/initiatives.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: results => {
      initiatives = results.data.filter(row => clean(row[fields.name]));

      setupFilters();
      updateStats(initiatives);
      updateMarkers(initiatives);
    },
    error: error => {
      document.getElementById("selectedInitiative").innerHTML =
        `<p>Could not load initiatives.csv: ${error.message}</p>`;
    }
  });
});