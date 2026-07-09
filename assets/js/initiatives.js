let records = [];
let filtered = [];
let map;
let markers;

let previousClusterHtml = "";
let currentClusterRows = [];

const initiativeFields = {
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

const memberFields = {
  name: "Name",
  institution: "Institution",
  department: "Department",
  discipline: "Discipline",
  specializations: "Research Specializations",
  city: "City",
  country: "Country",
  region: "Region",
  lat: "Latitude",
  lon: "Longitude"
};

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map(row => clean(row[field])).filter(Boolean))].sort();
}

function populateSelect(id, values, label) {
  const select = document.getElementById(id);
  select.innerHTML = `<option value="">${label}</option>`;

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  }).addTo(map);
  
  markers = L.markerClusterGroup({
    maxClusterRadius: 35,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    disableClusteringAtZoom: 8,

    iconCreateFunction: function (cluster) {
      return L.divIcon({
        html: `<div class="neutral-cluster">${cluster.getChildCount()}</div>`,
        className: "neutral-cluster-wrapper",
        iconSize: [40, 40]
      });
    }
  });

  markers.on("clusterclick", function (event) {
    const childMarkers = event.layer.getAllChildMarkers();
    const rows = childMarkers.map(marker => marker.record).filter(Boolean);
    showClusterList(rows);
  });

  map.addLayer(markers);
}

function normalizeInitiative(row) {
  return {
    category: "Initiative / Organization",
    name: clean(row[initiativeFields.name]),
    subtitle: clean(row[initiativeFields.type]),
    location: clean(row[initiativeFields.location]),
    country: clean(row[initiativeFields.country]),
    region: clean(row[initiativeFields.region]),
    description1Title: "Goals",
    description1: clean(row[initiativeFields.goals]),
    description2Title: "Major Activities",
    description2: clean(row[initiativeFields.activities]),
    description3Title: "Key Outcomes / Accomplishments",
    description3: clean(row[initiativeFields.outcomes]),
    contact: clean(row[initiativeFields.contact]),
    website: clean(row[initiativeFields.website]),
    latitude: parseFloat(clean(row[initiativeFields.lat])),
    longitude: parseFloat(clean(row[initiativeFields.lon])),
    searchText: Object.values(row).join(" ").toLowerCase()
  };
}

function normalizeMember(row) {
  const specializations = [
    clean(row["Research Specializations"]),
    clean(row["Unnamed: 5"]),
    clean(row["Unnamed: 6"])
  ].filter(Boolean).join("; ");

  return {
    category: "Alliance Member",
    name: clean(row[memberFields.name]),
    subtitle: clean(row[memberFields.institution]),
    location: clean(row[memberFields.city]),
    country: clean(row[memberFields.country]),
    region: clean(row[memberFields.region]),
    description1Title: "Department",
    description1: clean(row[memberFields.department]),
    description2Title: "Discipline",
    description2: clean(row[memberFields.discipline]),
    description3Title: "Research Specializations",
    description3: specializations,
    contact: "",
    website: "",
    latitude: parseFloat(clean(row[memberFields.lat])),
    longitude: parseFloat(clean(row[memberFields.lon])),
    searchText: Object.values(row).join(" ").toLowerCase()
  };
}

function hasCoordinates(row) {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude);
}

function markerIcon(category) {
  const markerClass = category === "Alliance Member" ? "alliance" : "initiative";

  return L.divIcon({
    className: "",
    html: `<div class="custom-marker ${markerClass}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function selectedCardHtml(row) {
  return `
    ${previousClusterHtml ? `
      <button class="back-button" onclick="showPreviousCluster()">
        ← Back to list
      </button>
    ` : ""}

    <article class="initiative-detail-card">
      <div class="card-kicker">${row.category}</div>
      <h2>${row.name || "Record"}</h2>

      <div class="initiative-meta">
        ${row.subtitle ? `<span>${row.subtitle}</span>` : ""}
        ${row.location ? `<span>${row.location}</span>` : ""}
        ${row.country ? `<span>${row.country}</span>` : ""}
        ${row.region ? `<span>${row.region}</span>` : ""}
      </div>

      ${row.description1 ? `
        <div class="detail-block">
          <h3>${row.description1Title}</h3>
          <p>${row.description1}</p>
        </div>
      ` : ""}

      ${row.description2 ? `
        <div class="detail-block">
          <h3>${row.description2Title}</h3>
          <p>${row.description2}</p>
        </div>
      ` : ""}

      ${row.description3 ? `
        <div class="detail-block">
          <h3>${row.description3Title}</h3>
          <p>${row.description3}</p>
        </div>
      ` : ""}

      ${row.contact ? `
        <div class="detail-block">
          <h3>Contact</h3>
          <p>${row.contact}</p>
        </div>
      ` : ""}

      ${row.website ? `
        <a class="button detail-button" href="${row.website}" target="_blank" rel="noopener">
          Visit website
        </a>
      ` : ""}
    </article>
  `;
}

function updateSelectedCard(row) {
  const panel = document.getElementById("selectedInitiative");
  panel.innerHTML = selectedCardHtml(row);
}

function showPreviousCluster() {
  const panel = document.getElementById("selectedInitiative");
  panel.innerHTML = previousClusterHtml;

  panel.querySelectorAll(".cluster-item").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      updateSelectedCard(currentClusterRows[index]);
    });
  });
}


function showClusterList(rows) {
  const panel = document.getElementById("selectedInitiative");
  currentClusterRows = rows;

  const html = `
    <article class="initiative-detail-card">
      <div class="card-kicker">Cluster</div>
      <h2>${rows.length} records in this area</h2>
      <p>Select one record below to view details.</p>

      <div class="cluster-list">
        ${rows.map((row, index) => `
          <button class="cluster-item" data-index="${index}">
            <strong>${row.name || "Record"}</strong>
            <span>${[row.category, row.subtitle, row.location, row.country].filter(Boolean).join(" · ")}</span>
          </button>
        `).join("")}
      </div>
    </article>
  `;

  previousClusterHtml = html;
  panel.innerHTML = html;

  panel.querySelectorAll(".cluster-item").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      updateSelectedCard(rows[index]);
    });
  });
}

function updateMarkers(rows) {
  markers.clearLayers();

  const coordinateRows = rows.filter(hasCoordinates);

  coordinateRows.forEach(row => {
    const marker = L.marker(
      [row.latitude, row.longitude],
      { icon: markerIcon(row.category) }
    );

    marker.record = row;

    marker.on("click", () => {
      previousClusterHtml = "";
      updateSelectedCard(row);
    });

    marker.bindTooltip(row.name || row.subtitle || "Record");
    markers.addLayer(marker);
  });

  if (coordinateRows.length > 0) {
    const group = L.featureGroup(markers.getLayers());
    map.fitBounds(group.getBounds().pad(0.05), { maxZoom: 4 });

    document.getElementById("selectedInitiative").innerHTML =
      `<p>Select a marker or cluster on the map to view details.</p>`;
  } else {
    document.getElementById("selectedInitiative").innerHTML =
      `<p>No mapped records match the selected filters.</p>`;
  }
}

function updateStats(rows) {
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-countries").textContent = uniqueValues(rows, "country").length;
  document.getElementById("stat-regions").textContent = uniqueValues(rows, "region").length;
}

function applyFilters() {
  const q = clean(document.getElementById("searchInput").value).toLowerCase();
  const category = clean(document.getElementById("categoryFilter").value);
  const region = clean(document.getElementById("regionFilter").value);
  const country = clean(document.getElementById("countryFilter").value);

  filtered = records.filter(row => {
    return (!q || row.searchText.includes(q)) &&
           (!category || row.category === category) &&
           (!region || row.region === region) &&
           (!country || row.country === country);
  });

  previousClusterHtml = "";
  currentClusterRows = [];

  updateStats(filtered);
  updateMarkers(filtered);
}

function setupFilters() {
  populateSelect("categoryFilter", uniqueValues(records, "category"), "All categories");
  populateSelect("regionFilter", uniqueValues(records, "region"), "All regions");
  populateSelect("countryFilter", uniqueValues(records, "country"), "All countries");

  ["searchInput", "categoryFilter", "regionFilter", "countryFilter"].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();

  Promise.all([
    new Promise(resolve => {
      Papa.parse("data/initiatives.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: results => resolve(results.data.map(normalizeInitiative))
      });
    }),

    new Promise(resolve => {
      Papa.parse("data/alliance_members.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: results => resolve(results.data.map(normalizeMember))
      });
    })
  ]).then(([initiatives, members]) => {
    records = [...initiatives, ...members].filter(row => row.name || row.subtitle);
    filtered = records;

    setupFilters();
    updateStats(records);
    updateMarkers(records);
  });
});