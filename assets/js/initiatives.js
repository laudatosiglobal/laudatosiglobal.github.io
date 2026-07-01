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

function popupHtml(row) {
  const name = clean(row[fields.name]) || "Initiative";
  const type = clean(row[fields.type]);
  const location = clean(row[fields.location]);
  const country = clean(row[fields.country]);
  const region = clean(row[fields.region]);
  const goals = clean(row[fields.goals]);
  const website = clean(row[fields.website]);

  return `
    <div class="popup-card">
      <strong>${name}</strong><br>
      ${type ? `<span>${type}</span><br>` : ""}
      ${[location, country, region].filter(Boolean).join(" · ")}<br>
      ${goals ? `<p>${goals}</p>` : ""}
      ${website ? `<a href="${website}" target="_blank" rel="noopener">Visit website</a>` : ""}
    </div>
  `;
}

function updateMarkers(rows) {
  markers.clearLayers();

  const coordinateRows = rows.filter(hasCoordinates);

  coordinateRows.forEach(row => {
    const lat = parseFloat(clean(row[fields.lat]));
    const lon = parseFloat(clean(row[fields.lon]));

    const marker = L.marker([lat, lon]);
    marker.bindPopup(popupHtml(row));
    markers.addLayer(marker);
  });

  if (coordinateRows.length > 0) {
    const group = L.featureGroup(markers.getLayers());
    map.fitBounds(group.getBounds().pad(0.15));
  }
}

function cardHtml(row) {
  const name = clean(row[fields.name]) || "Initiative";
  const type = clean(row[fields.type]);
  const location = clean(row[fields.location]);
  const country = clean(row[fields.country]);
  const region = clean(row[fields.region]);
  const goals = clean(row[fields.goals]);
  const website = clean(row[fields.website]);
  const mapped = hasCoordinates(row);

  return `
    <article class="initiative-card">
      <h3>${name}</h3>
      <div class="meta">${[type, location, country, region].filter(Boolean).join(" · ")}</div>
      ${goals ? `<p>${goals}</p>` : ""}
      <p class="note">${mapped ? "Mapped location available." : "Location not yet mapped."}</p>
      ${website ? `<a href="${website}" target="_blank" rel="noopener">Website</a>` : ""}
    </article>
  `;
}

function renderList(rows) {
  const list = document.getElementById("initiativeList");
  const title = document.getElementById("resultsTitle");

  title.textContent = `${rows.length} initiative${rows.length === 1 ? "" : "s"}`;

  if (rows.length === 0) {
    list.innerHTML = "<p>No initiatives match the selected filters.</p>";
    return;
  }

  list.innerHTML = rows.slice(0, 80).map(cardHtml).join("");

  if (rows.length > 80) {
    list.innerHTML += `<p class="note">Showing first 80 results. Refine your search to narrow the list.</p>`;
  }
}

function updateStats(rows) {
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-countries").textContent = uniqueValues(rows, fields.country).length;
  document.getElementById("stat-regions").textContent = uniqueValues(rows, fields.region).length;
  document.getElementById("stat-types").textContent = uniqueValues(rows, fields.type).length;

  const mappedCount = rows.filter(hasCoordinates).length;
  const mappedEl = document.getElementById("stat-mapped");
  if (mappedEl) mappedEl.textContent = mappedCount;
}

function applyFilters() {
  const q = clean(document.getElementById("searchInput").value).toLowerCase();
  const region = clean(document.getElementById("regionFilter").value);
  const country = clean(document.getElementById("countryFilter").value);
  const type = clean(document.getElementById("typeFilter").value);

  filtered = initiatives.filter(row => {
    const combined = Object.values(row).join(" ").toLowerCase();

    return (!q || combined.includes(q)) &&
           (!region || clean(row[fields.region]) === region) &&
           (!country || clean(row[fields.country]) === country) &&
           (!type || clean(row[fields.type]) === type);
  });

  updateStats(filtered);
  renderList(filtered);
  updateMarkers(filtered);
}

function setupFilters() {
  populateSelect("regionFilter", uniqueValues(initiatives, fields.region));
  populateSelect("countryFilter", uniqueValues(initiatives, fields.country));
  populateSelect("typeFilter", uniqueValues(initiatives, fields.type));

  ["searchInput", "regionFilter", "countryFilter", "typeFilter"].forEach(id => {
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
      filtered = initiatives;

      setupFilters();
      updateStats(initiatives);
      renderList(initiatives);
      updateMarkers(initiatives);
    },
    error: error => {
      document.getElementById("initiativeList").innerHTML =
        `<p>Could not load initiatives.csv: ${error.message}</p>`;
    }
  });
});