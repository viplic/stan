import "./styles.css";

let pc;
let openAuthDialog = () => {};

const SERBIAN_CITIES = [
  "Aleksandrovac", "Aleksinac", "Apatin", "Aranđelovac", "Bačka Palanka", "Bačka Topola", "Bečej", "Beograd",
  "Bor", "Čačak", "Ćuprija", "Despotovac", "Dimitrovgrad", "Jagodina", "Kikinda", "Kladovo", "Kragujevac",
  "Kraljevo", "Kruševac", "Lazarevac", "Leskovac", "Loznica", "Majdanpek", "Mladenovac", "Negotin", "Niš",
  "Novi Pazar", "Novi Sad", "Obrenovac", "Pančevo", "Paraćin", "Pirot", "Požarevac", "Požega", "Priboj",
  "Prokuplje", "Ruma", "Senta", "Smederevo", "Sombor", "Sremska Mitrovica", "Stara Pazova", "Subotica",
  "Šabac", "Užice", "Valjevo", "Vranje", "Vrbas", "Vršac", "Zaječar", "Zrenjanin"
];

const ROOM_PATH = {
  living: [-2.8, 1.55, -0.85, -24],
  kitchen: [3.25, 1.55, -0.85, 28],
  bedroom: [-3.15, 1.55, 2.3, -150],
  bath: [3.65, 1.55, 2.25, 138],
  hall: [0.25, 1.55, 2.25, 180]
};

const SAFE_PATHS = {
  living: [[0.2, 1.55, -0.85, -12], ROOM_PATH.living],
  kitchen: [[0.9, 1.55, -0.85, 12], ROOM_PATH.kitchen],
  bedroom: [[0.2, 1.55, 0.35, 72], [-0.25, 1.55, 2.3, -120], ROOM_PATH.bedroom],
  bath: [[0.2, 1.55, 0.35, 48], [2.35, 1.55, 2.25, 116], ROOM_PATH.bath],
  hall: [[0.2, 1.55, 0.35, 150], ROOM_PATH.hall]
};

const WALL_BLOCKS = [
  { minX: 1.55, maxX: 2.05, minZ: -3.85, maxZ: -1.4 },
  { minX: 1.55, maxX: 2.05, minZ: 0.2, maxZ: 1.65 },
  { minX: -3.95, maxX: -1.5, minZ: 1.0, maxZ: 1.5 },
  { minX: -0.1, maxX: 0.35, minZ: 1.0, maxZ: 1.5 }
];

const fallbackListings = [
  {
    id: "vračar-01",
    title: "Svetao stan kod Hrama",
    location: "Vračar, Beograd",
    price: "1.250 EUR",
    priceValue: 1250,
    size: "64 m2",
    sizeValue: 64,
    rooms: "2.5",
    floor: "4/6",
    city: "Beograd",
    type: "stan",
    status: "3D spreman",
    paid: true,
    quality: 92,
    image: "url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82')"
  },
  {
    id: "dorćol-02",
    title: "Moderan stan na Dorćolu",
    location: "Dorćol, Beograd",
    price: "980 EUR",
    priceValue: 980,
    size: "52 m2",
    sizeValue: 52,
    rooms: "2.0",
    floor: "3/5",
    city: "Beograd",
    type: "stan",
    status: "3D spreman",
    paid: true,
    quality: 88,
    image: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82')"
  },
  {
    id: "novi-sad-03",
    title: "Namešten stan kod keja",
    location: "Liman, Novi Sad",
    price: "720 EUR",
    priceValue: 720,
    size: "48 m2",
    sizeValue: 48,
    rooms: "1.5",
    floor: "5/8",
    city: "Novi Sad",
    type: "stan",
    status: "3D spreman",
    paid: true,
    quality: 84,
    image: "url('https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82')"
  }
];

const state = {
  selectedListing: null,
  files: [],
  user: null,
  processing: false,
  processed: false,
  qualityMode: "smart",
  filters: {
    city: "",
    maxPrice: "",
    minSize: "",
    type: ""
  },
  scenePreset: "apartment",
  app: null,
  camera: null,
  viewerReady: false,
  viewerLoading: false,
  viewerPromise: null,
  autoTour: false,
  yaw: -20,
  pitch: -8,
  keys: new Set(),
  touchMove: { x: 0, y: 0 },
  turnInput: 0,
  uploadedTextureUrls: [],
  splatEntity: null
};

let listings = [...fallbackListings];
state.selectedListing = listings[0];

document.querySelector("#app").innerHTML = `
  <header class="topbar">
    <nav class="nav-links nav-left">
      <a href="#/">Početna</a>
      <a href="#/pretraga">Oglasi</a>
      <a href="#/pretraga">3D obilazak</a>
    </nav>
    <a class="brand" href="#/" aria-label="stan360 početna">
      <img src="/assets/stan360-logo-transparent.png" alt="stan360" />
    </a>
    <div class="account-actions">
      <span id="accountLabel"></span>
      <button class="ghost-button" id="postListingButton" hidden>Postavi oglas</button>
      <button class="ghost-button" id="loginButton">Login</button>
      <button class="primary-small-button" id="signupButton">Signup</button>
      <button class="ghost-button" id="logoutButton" hidden>Logout</button>
    </div>
  </header>

  <main>
    <section class="hero-section page-view" data-page="home">
      <div class="hero-copy">
        <p class="eyebrow">3D oglasi za stanove</p>
        <h1>Pogledaj oglase iz svoje sobe.</h1>
        <p>
          Kao da si već tamo: prostorije, lokacija i kontakt sa stanodavcem sve na jednom mestu.
        </p>
        <div class="hero-actions">
          <a class="primary-link" href="#/pretraga">Pogledaj oglase</a>
        </div>
      </div>
      <div class="hero-signal hero-search">
        <p class="eyebrow">Filteri za pretragu</p>
        <select id="cityFilter" aria-label="Grad"></select>
        <select id="priceFilter" aria-label="Cena">
          <option value="">Cena</option>
        </select>
        <select id="sizeFilter" aria-label="Kvadratura">
          <option value="">Kvadratura</option>
          <option value="30">30+ m2</option>
          <option value="45">45+ m2</option>
          <option value="60">60+ m2</option>
          <option value="80">80+ m2</option>
          <option value="100">100+ m2</option>
        </select>
        <select id="typeFilter" aria-label="Tip nekretnine">
          <option value="">Stan ili kuća</option>
          <option value="stan">Stan</option>
          <option value="kuća">Kuća</option>
        </select>
        <button class="primary-button" id="searchButton">Pretraži</button>
      </div>
    </section>

    <section class="metric-band page-view" data-page="home" aria-label="Metrike platforme">
      <article><strong>3D</strong><span>walkthrough za svaki oglas</span></article>
      <article><strong>Auto tour</strong><span>sam biraš da te vodi kroz stan</span></article>
      <article><strong>Detalji</strong><span>tačke u prostoriji</span></article>
      <article><strong>Kontakt</strong><span>zakazivanje i poruke</span></article>
    </section>

    <section class="metric-band market-stats page-view" data-page="home" aria-label="Pregled platforme">
      <article><strong id="activeListingsMetric">3</strong><span>aktivni oglasi</span></article>
      <article><strong>52</strong><span>gradovi u Srbiji</span></article>
      <article><strong id="tourListingsMetric">3</strong><span>3D obilasci</span></article>
      <article><strong>24/7</strong><span>pregled iz sobe</span></article>
    </section>

    <section id="listings" class="section-heading page-view" data-page="home search">
      <div>
        <p class="eyebrow">Marketplace</p>
        <h2>Oglasi sa 3D obilaskom</h2>
      </div>
    </section>

    <section class="listing-grid page-view" data-page="home search" id="listingGrid"></section>

    <section class="listing-profile page-view" data-page="detail" id="listingProfile"></section>

    <section class="product-grid creator-dashboard page-view" data-page="post" id="creatorDashboard" hidden>
      <article id="upload" class="upload-panel">
        <div class="panel-heading">
          <p class="eyebrow">Upload pipeline</p>
          <h2>Dodaj materijal za novi 3D oglas</h2>
          <p>Upload i uputstvo se prikazuju tek nakon verifikovanog naloga.</p>
        </div>
        <div class="capture-guide" id="captureGuide" hidden>
          <strong>Pre upload-a</strong>
          <span>Snimaj polako, uđi u svaku prostoriju, zadrži kameru 2-3 sekunde na centralnim delovima sobe i izbegni nagle pokrete.</span>
        </div>
        <div class="listing-form" id="listingForm" hidden>
          <label>Tip oglasa
            <select id="listingPurpose">
              <option value="izdavanje">Izdavanje</option>
              <option value="prodaja">Prodaja</option>
            </select>
          </label>
          <label>Cena
            <input id="listingPrice" inputmode="decimal" placeholder="npr. 850 EUR" />
          </label>
          <label>Kvadratura
            <input id="listingSize" inputmode="decimal" placeholder="npr. 64 m2" />
          </label>
          <label>Lokacija
            <input id="listingLocation" placeholder="Grad, opština, ulica" />
          </label>
          <div class="checkbox-row">
            <label><input id="hasTour" type="checkbox" checked /> 3D obilazak</label>
            <label><input id="newBuild" type="checkbox" /> Novogradnja</label>
            <label><input id="furnished" type="checkbox" /> Namešten</label>
          </div>
        </div>
        <div class="capture-rules" id="captureRules" hidden>
          <strong>Pravila za dobar 3D walkthrough</strong>
          <ul>
            <li>Snimaj horizontalno, sporo i bez naglih okreta; stabilizacija telefona treba da bude uključena.</li>
            <li>U svakoj prostoriji stani u centar, zatim snimi sva četiri ugla, plafon, pod, prozore i vrata.</li>
            <li>Za sobe do 15 m2 dodaj 8-12 fotografija ili 20-30 sekundi sporog videa; za veće sobe dodaj još jedan krug iz suprotnog ugla.</li>
            <li>Pređi pragove polako: hodnik ka sobi, soba ka kupatilu, kuhinja ka dnevnoj. Zadrži kameru 2-3 sekunde na ulazu.</li>
            <li>Izbegni ljude, kućne ljubimce, ogledala izbliza, TV ekran i direktno sunce u kameru. Upali svetla u svim prostorijama.</li>
            <li>Za najbolji rezultat ubaci jedan neprekidan video cele putanje i dodatne fotografije detalja za svaku prostoriju.</li>
            <li>Za real-time Gaussian Splat obradu treba minimum 80-120 oštrih fotografija ili 2-4 minuta stabilnog videa za ceo stan.</li>
            <li>Materijal mora da pokrije iste površine iz više uglova, jer splat trening traži preklapanje kadrova i dovoljno kamera poza.</li>
            <li>Finalni pipeline je: upload materijala, provera kvaliteta, generisanje kamera poza, trening .ply/.splat modela, optimizacija za web i objava walkthrough-a.</li>
          </ul>
        </div>
        <label class="dropzone" id="dropzone">
          <input id="fileInput" type="file" accept="image/*,video/*" multiple />
          <span>+</span>
          <strong>Prevuci slike ili video ovde</strong>
          <small>Idealno: spor hod kroz sve prostorije ili više fotografija svake sobe.</small>
        </label>
        <div class="auth-lock" id="uploadLock">
          <strong>Prijavi se da ubaciš materijal</strong>
          <span>Nalog je potreban da bismo sačuvali tvoje oglase i obilaske.</span>
          <button class="primary-button" id="uploadLoginButton">Login / Signup</button>
        </div>
        <div class="upload-summary">
          <div><span>Fajlovi</span><strong id="fileCount">0</strong></div>
          <div><span>Tip oglasa</span><strong id="uploadTypeLabel">Stan</strong></div>
          <div><span>Status</span><strong id="uploadStatusLabel">Spremno</strong></div>
        </div>
        <div class="mode-picker" role="group" aria-label="Kvalitet obrade">
          <button data-mode="preview">Brzi preview</button>
          <button class="active" data-mode="smart">Standard</button>
          <button data-mode="premium">Detaljno</button>
        </div>
        <button class="primary-button" id="processButton">Sačuvaj i napravi preview</button>
        <div class="pipeline" id="pipeline"></div>
      </article>

      <article class="strategy-panel" id="memberTools" hidden>
        <p class="eyebrow">Alati za oglas</p>
        <h2>Pregled materijala</h2>
        <ul class="feature-list">
          <li><strong>Pregled prostorija:</strong> sistem proverava da li su dnevna soba, kuhinja, soba i kupatilo pokriveni.</li>
          <li><strong>Hotspotovi:</strong> dodaj grejanje, parking, terasu, klimu i mesečne troškove.</li>
          <li><strong>Auto tour:</strong> uključi vođenu turu koja se vrti u loop-u.</li>
          <li><strong>Lead capture:</strong> zakaži gledanje ili kontaktiraj stanodavca.</li>
        </ul>
      </article>
    </section>

    <section id="viewer" class="viewer-shell page-view" data-page="home search detail">
      <div class="viewer-header">
        <div>
          <p class="eyebrow">Interactive walkthrough</p>
          <h2 id="viewerTitle">Svetao stan kod Hrama</h2>
        </div>
        <div class="viewer-actions">
          <button id="autoTourButton">Auto tour loop</button>
          <button id="resetCameraButton">Reset</button>
        </div>
      </div>
      <div class="viewer-layout">
        <div class="canvas-wrap">
          <canvas id="walkCanvas"></canvas>
          <div class="viewer-loader" id="viewerLoader">
            <strong>Pokreni real-time Gaussian Splat walkthrough</strong>
            <span>Demo koristi PlayCanvas GSplat renderer i volumetrijske splat tačke za prostorije, dok će uploadovani oglasi koristiti treniran .ply/.splat asset.</span>
            <button class="primary-button" id="startViewerButton">Uđi u stan</button>
          </div>
          <div class="viewer-hud">
            <span>WASD / touch za hod</span>
            <span>Drag za pogled</span>
            <span id="renderModeBadge">Smart LOD</span>
          </div>
          <div class="mobile-controls" aria-label="Mobilne kontrole za 3D obilazak">
            <div class="joystick" id="movePad"><span></span></div>
            <div class="turn-buttons">
              <button id="turnLeftButton" aria-label="Okreni levo">‹</button>
              <button id="turnRightButton" aria-label="Okreni desno">›</button>
            </div>
          </div>
        </div>
        <aside class="viewer-side">
          <div class="floor-plan">
            <button class="room active" style="grid-area: living" data-room="living">Dnevna</button>
            <button class="room" style="grid-area: kitchen" data-room="kitchen">Kuhinja</button>
            <button class="room" style="grid-area: bedroom" data-room="bedroom">Soba</button>
            <button class="room" style="grid-area: bath" data-room="bath">Kupatilo</button>
            <button class="room" style="grid-area: hall" data-room="hall">Hodnik</button>
          </div>
          <div class="listing-detail" id="listingDetail"></div>
          <button class="primary-button" id="scheduleButton">Zakaži gledanje</button>
          <button class="secondary-button" id="contactButton">Kontaktiraj stanodavca</button>
          <button class="secondary-button" id="shareButton">Podeli 3D link</button>
        </aside>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-logo"><img src="/assets/stan360-logo-transparent.png" alt="stan360" /></div>
    <div class="footer-grid">
      <section>
        <h3>Korisno</h3>
        <a href="#">O nama</a>
        <a href="#">Knjiga o stan360</a>
        <a href="#">stan360 Blog</a>
        <a href="#">stan360 Karijere</a>
        <a href="#">Saveti za bezbednost</a>
        <a href="#">Pomoć i kontakt</a>
      </section>
      <section>
        <h3>Kontakt za medije</h3>
        <a href="#">Kontakt</a>
        <a href="#">Copyright Infringement</a>
      </section>
      <section>
        <h3>Pravila i uslovi</h3>
        <a href="#">Pravila i uslovi</a>
        <a href="#">Pravila i uslovi zakazivanja</a>
        <a href="#">Polisa o poštovanju privatnosti</a>
        <a href="#">Polisa o fer korišćenju</a>
        <a href="#">Prava i obaveze prodavaca</a>
      </section>
    </div>
  </footer>

  <dialog class="auth-dialog" id="authDialog">
    <form class="auth-card" id="authForm" method="dialog">
      <button class="dialog-close" type="button" value="cancel" aria-label="Zatvori">×</button>
      <p class="eyebrow">stan360 nalog</p>
      <h2 id="authTitle">Login</h2>
      <div class="auth-tabs">
        <button type="button" class="active" data-auth-mode="login">Login</button>
        <button type="button" data-auth-mode="signup">Signup</button>
      </div>
      <label id="nameField" hidden>
        Broj telefona
        <input id="authPhone" name="phone" autocomplete="tel" />
      </label>
      <label>
        Email
        <input id="authEmail" name="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Lozinka
        <input id="authPassword" name="password" type="password" autocomplete="current-password" minlength="8" required />
      </label>
      <label class="terms-field" id="termsField" hidden>
        <input id="termsAccepted" type="checkbox" />
        <span>Prihvatam politiku korišćenja i uslove platforme.</span>
      </label>
      <button class="primary-button" id="authSubmitButton">Nastavi</button>
      <p class="form-message" id="authMessage"></p>
    </form>
  </dialog>

  <dialog class="admin-dialog" id="adminDialog">
    <form class="auth-card" id="adminForm" method="dialog">
      <button class="dialog-close" type="button" id="adminCloseButton" aria-label="Zatvori">×</button>
      <p class="eyebrow">Pristup</p>
      <h2>Dashboard</h2>
      <label>
        Email
        <input id="adminEmail" type="email" autocomplete="username" required />
      </label>
      <label>
        Lozinka
        <input id="adminPassword" type="password" autocomplete="current-password" required />
      </label>
      <button class="primary-button">Uđi u dashboard</button>
      <p class="form-message" id="adminMessage"></p>
      <div class="admin-dashboard" id="adminDashboard" hidden></div>
    </form>
  </dialog>
`;

await bootAccount();
trackVisit();
await loadPublicListings();
await loadPublicStats();
renderListings();
renderListingDetail();
renderListingProfile();
renderPipeline();
bindUi();
populateCityFilter();
prepareViewerLoading();
handleInitialRoute();
renderRoute();

function renderListings() {
  const grid = document.querySelector("#listingGrid");
  const baseListings = [...listings];
  const filtersActive = Boolean(state.filters.city || state.filters.type || state.filters.maxPrice || state.filters.minSize);
  const filteredListings = baseListings.filter((listing) => {
    if (state.filters.city && listing.city !== state.filters.city) return false;
    if (state.filters.type && listing.type !== state.filters.type) return false;
    if (state.filters.maxPrice && listing.priceValue > Number(state.filters.maxPrice)) return false;
    if (state.filters.minSize && listing.sizeValue < Number(state.filters.minSize)) return false;
    return true;
  });

  const visibleListings = filtersActive ? filteredListings : [
    ...fallbackListings.slice(0, 3),
    ...baseListings.filter((listing) => !fallbackListings.some((featured) => featured.id === listing.id))
  ];
  grid.innerHTML = visibleListings.map((listing) => `
    <article class="listing-card ${listing.id === state.selectedListing.id ? "active" : ""}" data-listing="${listing.id}">
      <div class="listing-image" style="background-image: ${listing.image}">
        <span>${listing.status}</span>
      </div>
      <div class="listing-body">
        <div>
          <h3>${listing.title}</h3>
          <p>${listing.location}</p>
        </div>
        <div class="listing-meta">
          <strong>${listing.price}</strong>
          <span>${listing.size}</span>
          <span>${listing.rooms} sobe</span>
        </div>
        <div class="quality-bar" style="--quality: ${listing.quality}%"><span></span></div>
      </div>
    </article>
  `).join("") || `<div class="empty-state">Nema oglasa za izabrane filtere.</div>`;

  grid.querySelectorAll("[data-listing]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedListing = listings.find((item) => item.id === card.dataset.listing) || listings[0];
      document.querySelector("#viewerTitle").textContent = state.selectedListing.title;
      renderListings();
      renderListingDetail();
      renderListingProfile();
      if (state.viewerReady) resetCamera();
      window.location.hash = `#/oglas/${encodeURIComponent(state.selectedListing.id)}`;
    });
  });
}

function renderListingDetail() {
  document.querySelector("#listingDetail").innerHTML = `
    <h3>${state.selectedListing.title}</h3>
    <dl>
      <div><dt>Lokacija</dt><dd>${state.selectedListing.location}</dd></div>
      <div><dt>Cena</dt><dd>${state.selectedListing.price}</dd></div>
      <div><dt>Kvadratura</dt><dd>${state.selectedListing.size}</dd></div>
      <div><dt>Sprat</dt><dd>${state.selectedListing.floor}</dd></div>
    </dl>
  `;
}

function renderListingProfile() {
  const listing = state.selectedListing || listings[0];
  document.querySelector("#listingProfile").innerHTML = `
    <article class="listing-profile-hero">
      <div class="listing-profile-image" style="background-image: ${listing.image}"></div>
      <div class="listing-profile-copy">
        <p class="eyebrow">Oglas</p>
        <h2>${listing.title}</h2>
        <p>${listing.location}</p>
        <div class="profile-stats">
          <div><span>Cena</span><strong>${listing.price}</strong></div>
          <div><span>Kvadratura</span><strong>${listing.size}</strong></div>
          <div><span>Tip</span><strong>${listing.type === "kuća" ? "Kuća" : "Stan"}</strong></div>
          <div><span>Status</span><strong>${listing.status}</strong></div>
        </div>
        <div class="hero-actions">
          <button class="primary-button" id="detailWalkButton">Otvori walkthrough</button>
          <button class="secondary-button" id="detailContactButton">Kontaktiraj stanodavca</button>
        </div>
      </div>
    </article>
  `;
  document.querySelector("#detailWalkButton")?.addEventListener("click", async () => {
    await ensureViewer();
    document.querySelector("#viewer").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#detailContactButton")?.addEventListener("click", () => alert("Kontakt forma će biti povezana sa profilom stanodavca."));
}

function bindUi() {
  const fileInput = document.querySelector("#fileInput");
  const dropzone = document.querySelector("#dropzone");

  fileInput.addEventListener("change", (event) => {
    if (!state.user) {
      event.target.value = "";
      openAuthDialog("login");
      return;
    }
    setFiles([...event.target.files]);
  });
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
    if (!state.user) {
      openAuthDialog("login");
      return;
    }
    setFiles([...event.dataTransfer.files]);
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.qualityMode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
      updateUploadStats();
      document.querySelector("#renderModeBadge").textContent = `${button.textContent} LOD`;
    });
  });

  document.querySelector("#processButton").addEventListener("click", async () => {
    if (!state.user) {
      openAuthDialog("login");
      return;
    }
    if (!state.files.length) {
      setUploadStatus("Dodaj bar jednu sliku ili video.");
      return;
    }
    state.processing = true;
    state.processed = false;
    renderPipeline();
    try {
      await submitUpload();
      await wait(500);
      state.processed = true;
      setUploadStatus("Preview je spreman");
      await ensureViewer();
      applyUploadedTextures();
    } catch (error) {
      setUploadStatus(error.message || "Upload nije uspeo.");
    }
    state.processing = false;
    renderPipeline();
  });

  document.querySelector("#resetCameraButton").addEventListener("click", () => {
    ensureViewer();
    resetCamera();
  });
  document.querySelector("#autoTourButton").addEventListener("click", async () => {
    await ensureViewer();
    toggleAutoTour();
  });
  document.querySelector("#loginButton").addEventListener("click", () => openAuthDialog("login"));
  document.querySelector("#signupButton").addEventListener("click", () => openAuthDialog("signup"));
  document.querySelector("#postListingButton").addEventListener("click", () => {
    window.location.hash = "#/postavi-oglas";
  });
  document.querySelector("#uploadLoginButton").addEventListener("click", () => openAuthDialog("login"));
  document.querySelector("#logoutButton").addEventListener("click", logout);
  bindAuthDialog();
  bindAdminDialog();
  bindFilters();
  document.querySelector("#startViewerButton").addEventListener("click", () => ensureViewer());
  document.querySelector("#shareButton").addEventListener("click", shareListing);
  document.querySelector("#scheduleButton").addEventListener("click", () => alert("Zahtev za gledanje je spreman za slanje stanodavcu."));
  document.querySelector("#contactButton").addEventListener("click", () => alert("Kontakt forma će biti povezana sa profilom stanodavca."));

  document.querySelectorAll("[data-room]").forEach((button) => {
    button.addEventListener("click", async () => {
      await ensureViewer();
      jumpToRoom(button.dataset.room);
    });
  });

  window.addEventListener("keydown", (event) => state.keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));
  bindMobileControls();
}

function setFiles(files) {
  state.files = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
  state.uploadedTextureUrls.forEach((url) => URL.revokeObjectURL(url));
  state.uploadedTextureUrls = state.files
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, 4)
    .map((file) => URL.createObjectURL(file));
  updateUploadStats();
}

function updateUploadStats() {
  const count = state.files.length;
  document.querySelector("#fileCount").textContent = count;
  document.querySelector("#uploadTypeLabel").textContent = state.selectedListing.type === "kuća" ? "Kuća" : "Stan";
  if (!state.processing && !state.processed) setUploadStatus(count ? "Spremno" : "Čeka fajlove");
}

function renderPipeline() {
  const steps = [
    ["Pregled materijala", state.files.length ? "ready" : "waiting"],
    ["Čuvanje oglasa", state.processing ? "running" : state.processed ? "done" : "queued"],
    ["Priprema preview-a", state.processed ? "done" : "queued"],
    ["Mobile/Desktop prikaz", state.processed ? "done" : "queued"]
  ];

  document.querySelector("#pipeline").innerHTML = steps.map(([label, status]) => `
    <div class="pipeline-step ${status}">
      <span></span>
      <strong>${label}</strong>
      <small>${statusLabel(status)}</small>
    </div>
  `).join("");
}

function statusLabel(status) {
  return {
    waiting: "čeka fajlove",
    ready: "spremno",
    queued: "u redu",
    running: "obrađuje se",
    done: "završeno"
  }[status];
}

async function bootAccount() {
  try {
    const data = await fetchJson("/api/auth/me");
    state.user = data.user;
  } catch {
    state.user = null;
  }
  updateAuthUi();
}

function updateAuthUi() {
  const loggedIn = Boolean(state.user);
  document.querySelector("#accountLabel").textContent = loggedIn ? state.user.name : "";
  document.querySelector("#postListingButton").hidden = !loggedIn;
  document.querySelector("#loginButton").hidden = loggedIn;
  document.querySelector("#signupButton").hidden = loggedIn;
  document.querySelector("#logoutButton").hidden = !loggedIn;
  document.querySelector("#uploadLock").hidden = loggedIn;
  document.querySelector("#memberTools").hidden = !loggedIn;
  document.querySelector("#captureGuide").hidden = !loggedIn;
  document.querySelector("#captureRules").hidden = !loggedIn;
  document.querySelector("#listingForm").hidden = !loggedIn;
  document.querySelector("#fileInput").disabled = !loggedIn;
  document.querySelector("#processButton").disabled = !loggedIn;
  document.querySelector("#dropzone").classList.toggle("locked", !loggedIn);
}

function bindAuthDialog() {
  let mode = "login";
  const dialog = document.querySelector("#authDialog");
  const form = document.querySelector("#authForm");
  const message = document.querySelector("#authMessage");

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.authMode));
  });
  document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    const payload = {
      email: document.querySelector("#authEmail").value,
      phone: document.querySelector("#authPhone").value,
      termsAccepted: document.querySelector("#termsAccepted").checked,
      password: document.querySelector("#authPassword").value
    };
    if (mode === "signup" && !payload.termsAccepted) {
      message.textContent = "Potvrdite politiku korišćenja da nastavite.";
      return;
    }
    try {
      const data = await fetchJson(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      state.user = data.user || null;
      updateAuthUi();
      dialog.close();
      setUploadStatus(data.verificationRequired ? "Proverite email" : "Nalog je spreman");
      if (data.verificationRequired) alert(data.message);
    } catch (error) {
      message.textContent = error.message || "Pokušajte ponovo.";
    }
  });

  window.openAuthDialog = openAuthDialog;

  function setMode(nextMode) {
    mode = nextMode;
    document.querySelector("#authTitle").textContent = mode === "signup" ? "Signup" : "Login";
    document.querySelector("#nameField").hidden = mode !== "signup";
    document.querySelector("#termsField").hidden = mode !== "signup";
    document.querySelector("#authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
    document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
    message.textContent = "";
  }

  openAuthDialog = (nextMode = "login") => {
    setMode(nextMode);
    dialog.showModal();
  };
}

function bindAdminDialog() {
  const dialog = document.querySelector("#adminDialog");
  const form = document.querySelector("#adminForm");
  const message = document.querySelector("#adminMessage");
  document.querySelector("#adminCloseButton").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    try {
      const data = await fetchJson("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.querySelector("#adminEmail").value,
          password: document.querySelector("#adminPassword").value
        })
      });
      renderAdminDashboard(data.stats);
    } catch (error) {
      message.textContent = error.message || "Admin login nije uspeo.";
    }
  });
}

function renderAdminDashboard(stats) {
  const dashboard = document.querySelector("#adminDashboard");
  dashboard.hidden = false;
  dashboard.innerHTML = `
    ${adminMetric("Oglasi", stats.listings, "ukupno postavljeno", 82)}
    ${adminMetric("Plaćeni oglasi", stats.paidListings, "aktivne promocije", 64)}
    ${adminMetric("3D ture", stats.tours, "spremni walkthrough", 74)}
    ${adminMetric("Leadovi", stats.leads, "kontakt zahtevi", 88)}
    ${adminMetric("Upload danas", stats.uploadsToday, "nov materijal", 46)}
    ${adminMetric("Konverzija", `${stats.conversion}%`, "pregled u kontakt", 58)}
    ${adminMetric("Live posetioci", stats.liveVisitors, "trenutno na sajtu", 52)}
    ${adminMetric("Posetioci danas", stats.visitorsToday, "zabeležene sesije", 67)}
  `;
}

function adminMetric(label, value, hint, percent) {
  return `<article class="admin-metric" style="--metric:${percent}%">
    <div class="metric-circle"><strong>${value}</strong></div>
    <div><h3>${label}</h3><span>${hint}</span></div>
  </article>`;
}

async function logout() {
  await fetchJson("/api/auth/logout", { method: "POST" }).catch(() => {});
  state.user = null;
  updateAuthUi();
}

function trackVisit() {
  const visitorId = localStorage.getItem("stan360VisitorId") || crypto.randomUUID();
  localStorage.setItem("stan360VisitorId", visitorId);
  fetchJson("/api/analytics/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId })
  }).catch(() => {});
}

function bindFilters() {
  const bindings = [
    ["#cityFilter", "city"],
    ["#priceFilter", "maxPrice"],
    ["#sizeFilter", "minSize"],
    ["#typeFilter", "type"]
  ];
  bindings.forEach(([selector, key]) => {
    document.querySelector(selector).addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      renderListings();
    });
  });
  document.querySelector("#searchButton").addEventListener("click", () => {
    renderListings();
    window.location.hash = "#/pretraga";
  });
}

async function submitUpload() {
  const form = new FormData();
  form.append("title", document.querySelector("#listingLocation").value || state.selectedListing.title);
  form.append("listingType", state.selectedListing.type);
  form.append("purpose", document.querySelector("#listingPurpose").value);
  form.append("price", document.querySelector("#listingPrice").value);
  form.append("size", document.querySelector("#listingSize").value);
  form.append("location", document.querySelector("#listingLocation").value);
  form.append("hasTour", document.querySelector("#hasTour").checked ? "true" : "false");
  form.append("newBuild", document.querySelector("#newBuild").checked ? "true" : "false");
  form.append("furnished", document.querySelector("#furnished").checked ? "true" : "false");
  state.files.forEach((file) => form.append("files", file));
  const data = await fetchJson("/api/uploads", {
    method: "POST",
    body: form
  });
  addUploadedListing(data.upload);
  await loadPublicStats();
  return data;
}

async function loadPublicStats() {
  try {
    const stats = await fetchJson("/api/public-stats");
    document.querySelector("#activeListingsMetric").textContent = stats.activeListings ?? 3;
    document.querySelector("#tourListingsMetric").textContent = stats.tours ?? 3;
  } catch {
    document.querySelector("#activeListingsMetric").textContent = "3";
    document.querySelector("#tourListingsMetric").textContent = "3";
  }
}

async function loadPublicListings() {
  try {
    const data = await fetchJson("/api/public-listings");
    const uploadedListings = (data.listings || []).map(normalizeUploadedListing);
    listings = mergeListings(fallbackListings, uploadedListings);
    state.selectedListing = listings.find((listing) => listing.id === state.selectedListing?.id) || listings[0];
    document.querySelector("#viewerTitle").textContent = state.selectedListing.title;
  } catch {
    listings = [...fallbackListings];
    state.selectedListing = listings[0];
  }
}

function addUploadedListing(upload) {
  const listing = normalizeUploadedListing(uploadToPublicListing(upload));
  listings = mergeListings(fallbackListings, [listing], listings);
  state.selectedListing = listing;
  document.querySelector("#viewerTitle").textContent = listing.title;
  renderListings();
  renderListingDetail();
}

function uploadToPublicListing(upload) {
  const metadata = upload?.metadata || {};
  return {
    id: upload?.id,
    title: upload?.title,
    location: metadata.location,
    price: metadata.price,
    priceValue: parseFirstNumber(metadata.price),
    size: metadata.size,
    sizeValue: parseFirstNumber(metadata.size),
    rooms: "3D",
    floor: metadata.newBuild ? "Novogradnja" : "Oglas",
    city: String(metadata.location || "").split(",")[0]?.trim(),
    type: upload?.listingType || "stan",
    status: metadata.hasTour === false ? "Oglas dodat" : "3D upload dodat",
    paid: false,
    quality: 72,
    thumbnail: upload?.thumbnail || ""
  };
}

function normalizeUploadedListing(listing) {
  const fallbackImage = "url('https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=82')";
  return {
    id: listing.id,
    title: listing.title || "Novi oglas",
    location: listing.location || "Lokacija u pripremi",
    price: listing.price || "Cena na upit",
    priceValue: Number(listing.priceValue) || 0,
    size: listing.size || "Kvadratura u pripremi",
    sizeValue: Number(listing.sizeValue) || 0,
    rooms: listing.rooms || "3D",
    floor: listing.floor || "Oglas",
    city: listing.city || "",
    type: listing.type || "stan",
    status: listing.status || "Upload dodat",
    paid: Boolean(listing.paid),
    quality: Number(listing.quality) || 72,
    image: listing.thumbnail ? `url('${listing.thumbnail}')` : fallbackImage
  };
}

function mergeListings(...groups) {
  const seen = new Set();
  return groups.flat().filter((listing) => {
    if (!listing?.id || seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
}

function parseFirstNumber(value) {
  return Number(String(value || "").match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".")) || 0;
}

function populateCityFilter() {
  const cityFilter = document.querySelector("#cityFilter");
  cityFilter.innerHTML = `<option value="">Svi gradovi</option>${SERBIAN_CITIES.map((city) => `<option value="${city}">${city}</option>`).join("")}`;
  const priceFilter = document.querySelector("#priceFilter");
  priceFilter.innerHTML = `<option value="">Cena</option>${Array.from({ length: 35 }, (_, index) => {
    const value = (index + 1) * 100;
    return `<option value="${value}">Do ${value.toLocaleString("sr-RS")} EUR</option>`;
  }).join("")}`;
}

function handleInitialRoute() {
  window.addEventListener("hashchange", () => {
    renderRoute();
    if (window.location.hash === "#admin") {
      document.querySelector("#adminDialog").showModal();
    }
  });
}

function currentRoute() {
  if (window.location.hash === "#/pretraga") return "search";
  if (window.location.hash === "#/postavi-oglas") return "post";
  if (window.location.hash.startsWith("#/oglas/")) return "detail";
  return "home";
}

function renderRoute() {
  const route = currentRoute();
  if (route === "detail") selectListingFromRoute();
  document.querySelectorAll(".page-view").forEach((section) => {
    section.hidden = !String(section.dataset.page || "").split(" ").includes(route);
  });
  if (route === "post" && !state.user) {
    openAuthDialog("login");
    window.location.hash = "#/";
    return;
  }
  if (route === "search") renderListings();
  if (route === "detail") {
    renderListingDetail();
    renderListingProfile();
    ensureViewer();
  }
  if (window.location.hash === "#admin") {
    document.querySelector("#adminDialog").showModal();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectListingFromRoute() {
  const id = decodeURIComponent(window.location.hash.replace("#/oglas/", ""));
  const nextListing = listings.find((listing) => listing.id === id);
  if (!nextListing) return;
  state.selectedListing = nextListing;
  document.querySelector("#viewerTitle").textContent = nextListing.title;
}

function setUploadStatus(text) {
  document.querySelector("#uploadStatusLabel").textContent = text;
}

async function shareListing() {
  const url = `${window.location.origin}${window.location.pathname}#viewer`;
  if (navigator.share) {
    await navigator.share({ title: state.selectedListing.title, url }).catch(() => {});
    return;
  }
  await navigator.clipboard?.writeText(url).catch(() => {});
  alert("3D link je kopiran.");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Zahtev nije uspeo.");
  return data;
}

function prepareViewerLoading() {
  const viewer = document.querySelector("#viewer");
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      ensureViewer();
      observer.disconnect();
    }
  }, { rootMargin: "360px 0px" });
  observer.observe(viewer);

  if (window.location.hash === "#/pretraga") {
    ensureViewer();
  }
}

async function ensureViewer() {
  if (state.viewerReady) return state.app;
  if (state.viewerPromise) return state.viewerPromise;
  state.viewerLoading = true;
  state.viewerPromise = (async () => {
    document.querySelector("#viewerLoader").classList.add("loading");
    document.querySelector("#viewerLoader strong").textContent = "Učitavam 3D engine...";
    pc = await import("playcanvas");
    initPlayCanvas();
    state.viewerReady = true;
    state.viewerLoading = false;
    document.querySelector("#viewerLoader").classList.add("hidden");
    return state.app;
  })();
  return state.viewerPromise;
}

function initPlayCanvas() {
  const canvas = document.querySelector("#walkCanvas");
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
      antialias: true,
      alpha: false
    }
  });
  state.app = app;
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = getRenderPixelRatio();
  resizeViewerCanvas();
  app.start();

  const camera = new pc.Entity("Walk camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.02, 0.05, 0.06),
    fov: 68,
    nearClip: 0.05,
    farClip: 80
  });
  app.root.addChild(camera);
  state.camera = camera;
  resetCamera();

  const light = new pc.Entity("Sun");
  light.addComponent("light", {
    type: "directional",
    color: new pc.Color(1, 0.94, 0.82),
    intensity: 2.4,
    castShadows: true
  });
  light.setEulerAngles(45, 35, 0);
  app.root.addChild(light);

  const ambient = new pc.Entity("Ambient fill");
  ambient.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.35, 0.75, 0.72),
    intensity: 0.6,
    range: 18
  });
  ambient.setPosition(0, 4, 0);
  app.root.addChild(ambient);

  buildApartmentScene(app);
  bindCanvasLook(canvas);
  app.on("update", updateWalk);
  window.addEventListener("resize", resizeViewerCanvas);
}

function buildApartmentScene(app) {
  createProceduralSplatApartment(app);
  createHotspot(app, [-2.1, 1.2, -1.35], "Dnevna soba");
  createHotspot(app, [3.35, 1.35, -0.05], "Kuhinja");
  createHotspot(app, [-3.45, 1.2, 2.45], "Spavaća soba");
}

function createProceduralSplatApartment(app) {
  const data = buildApartmentGSplatData();
  const resource = new pc.GSplatResource(app.graphicsDevice, data);
  const entity = new pc.Entity("Real-time Gaussian splat apartment");
  entity.addComponent("gsplat");
  entity.gsplat.resource = resource;
  entity.gsplat.customAabb = new pc.BoundingBox(new pc.Vec3(0, 1.4, 0), new pc.Vec3(6.2, 2.2, 4.7));
  app.root.addChild(entity);
  state.splatEntity = entity;
  document.querySelector("#renderModeBadge").textContent = "Real-time GSplat";
}

function buildApartmentGSplatData() {
  const points = [];
  const wall = [0.78, 0.76, 0.69];
  const floor = [0.50, 0.36, 0.22];
  const ceiling = [0.70, 0.72, 0.68];
  const dark = [0.10, 0.11, 0.12];
  const wood = [0.63, 0.43, 0.24];
  const fabric = [0.06, 0.34, 0.32];
  const glass = [0.46, 0.68, 0.74];

  addPlaneSplats(points, "floor", [-5.5, 0, -4], [5.5, 0, 4], "xz", 44, 32, floor, 0.055);
  addPlaneSplats(points, "ceiling", [-5.5, 3, -4], [5.5, 3, 4], "xz", 30, 22, ceiling, 0.07);
  addPlaneSplats(points, "back wall", [-5.5, 0, -4], [5.5, 3, -4], "xy", 42, 18, wall, 0.06);
  addPlaneSplats(points, "front wall left", [-5.5, 0, 4], [-1.9, 3, 4], "xy", 18, 18, wall, 0.06);
  addPlaneSplats(points, "front wall right", [2.2, 0, 4], [5.5, 3, 4], "xy", 18, 18, wall, 0.06);
  addPlaneSplats(points, "left wall", [-5.5, 0, -4], [-5.5, 3, 4], "zy", 32, 18, wall, 0.06);
  addPlaneSplats(points, "right wall", [5.5, 0, -4], [5.5, 3, 4], "zy", 32, 18, wall, 0.06);
  addPlaneSplats(points, "kitchen divider back", [1.8, 0, -3.8], [1.8, 2.8, -1.4], "zy", 14, 16, wall, 0.055);
  addPlaneSplats(points, "kitchen divider front", [1.8, 0, 0.2], [1.8, 2.8, 1.6], "zy", 9, 16, wall, 0.055);
  addPlaneSplats(points, "bedroom divider left", [-4.0, 0, 1.25], [-1.5, 2.8, 1.25], "xy", 14, 16, wall, 0.055);
  addPlaneSplats(points, "bedroom divider right", [-0.1, 0, 1.25], [0.35, 2.8, 1.25], "xy", 4, 16, wall, 0.055);
  addBoxSplats(points, [-3.2, 0.42, -2.45], [2.2, 0.62, 0.85], dark, 0.07);
  addBoxSplats(points, [-2.1, 0.06, -1.35], [2.8, 0.05, 1.65], fabric, 0.06);
  addBoxSplats(points, [-2.1, 0.32, -1.25], [1.1, 0.22, 0.72], wood, 0.055);
  addBoxSplats(points, [3.45, 0.55, -2.7], [2.55, 1.0, 0.58], dark, 0.06);
  addBoxSplats(points, [3.35, 0.52, 0.08], [1.6, 0.9, 0.75], wood, 0.06);
  addBoxSplats(points, [-3.45, 0.46, 2.45], [2.2, 0.52, 1.5], [0.76, 0.73, 0.67], 0.065);
  addBoxSplats(points, [-5.0, 1.0, 2.2], [0.52, 1.9, 1.85], dark, 0.06);
  addBoxSplats(points, [3.9, 0.55, 2.55], [1.5, 1.0, 1.3], glass, 0.065);
  addPlaneSplats(points, "window", [-1.1, 1.3, -4.05], [1.3, 2.4, -4.05], "xy", 18, 8, glass, 0.05, 0.62);

  return makeGSplatData(points);
}

function addPlaneSplats(points, _name, min, max, plane, countA, countB, color, size, alpha = 0.92) {
  for (let a = 0; a < countA; a += 1) {
    for (let b = 0; b < countB; b += 1) {
      const u = countA === 1 ? 0.5 : a / (countA - 1);
      const v = countB === 1 ? 0.5 : b / (countB - 1);
      const jitter = () => (Math.random() - 0.5) * size * 0.9;
      let x = min[0] + (max[0] - min[0]) * u;
      let y = min[1] + (max[1] - min[1]) * v;
      let z = min[2] + (max[2] - min[2]) * u;
      if (plane === "xz") {
        y = min[1];
        z = min[2] + (max[2] - min[2]) * v;
      }
      if (plane === "zy") {
        x = min[0];
        z = min[2] + (max[2] - min[2]) * u;
      }
      points.push({ x: x + jitter(), y: y + jitter(), z: z + jitter(), color: variedColor(color), size, alpha });
    }
  }
}

function addBoxSplats(points, center, scale, color, size) {
  const half = scale.map((value) => value / 2);
  addPlaneSplats(points, "box top", [center[0] - half[0], center[1] + half[1], center[2] - half[2]], [center[0] + half[0], center[1] + half[1], center[2] + half[2]], "xz", 12, 8, color, size, 0.9);
  addPlaneSplats(points, "box front", [center[0] - half[0], center[1] - half[1], center[2] + half[2]], [center[0] + half[0], center[1] + half[1], center[2] + half[2]], "xy", 12, 6, color, size, 0.9);
  addPlaneSplats(points, "box side", [center[0] + half[0], center[1] - half[1], center[2] - half[2]], [center[0] + half[0], center[1] + half[1], center[2] + half[2]], "zy", 8, 6, color, size, 0.9);
}

function makeGSplatData(points) {
  const count = points.length;
  const props = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    .map((name) => ({ type: "float", name, storage: new Float32Array(count), byteSize: 4 }));
  const byName = Object.fromEntries(props.map((prop) => [prop.name, prop.storage]));
  const SH_C0 = 0.28209479177387814;
  points.forEach((point, index) => {
    byName.x[index] = point.x;
    byName.y[index] = point.y;
    byName.z[index] = point.z;
    byName.f_dc_0[index] = (point.color[0] - 0.5) / SH_C0;
    byName.f_dc_1[index] = (point.color[1] - 0.5) / SH_C0;
    byName.f_dc_2[index] = (point.color[2] - 0.5) / SH_C0;
    byName.opacity[index] = logit(point.alpha);
    byName.scale_0[index] = Math.log(point.size);
    byName.scale_1[index] = Math.log(point.size * 0.7);
    byName.scale_2[index] = Math.log(point.size * 0.7);
    byName.rot_0[index] = 1;
    byName.rot_1[index] = 0;
    byName.rot_2[index] = 0;
    byName.rot_3[index] = 0;
  });
  return new pc.GSplatData([{ name: "vertex", count, properties: props }], ["stan360 procedural real-time Gaussian splat demo"]);
}

function variedColor(color) {
  const factor = 0.88 + Math.random() * 0.22;
  return color.map((channel) => clamp(channel * factor, 0.02, 0.98));
}

function logit(value) {
  const next = clamp(value, 0.001, 0.999);
  return Math.log(next / (1 - next));
}

function createBox(app, name, position, scale, material) {
  const entity = new pc.Entity(name);
  entity.addComponent("render", { type: "box", material });
  entity.setPosition(...position);
  entity.setLocalScale(...scale);
  app.root.addChild(entity);
  return entity;
}

function createHotspot(app, position, label) {
  const material = makeMaterial(label, [0.09, 0.68, 0.56], true);
  const spot = new pc.Entity(label);
  spot.addComponent("render", { type: "sphere", material });
  spot.setPosition(...position);
  spot.setLocalScale(0.18, 0.18, 0.18);
  app.root.addChild(spot);
}

function makeMaterial(name, rgb, emissive = false) {
  const material = new pc.StandardMaterial();
  material.name = name;
  material.diffuse = new pc.Color(...rgb);
  material.roughness = 0.72;
  if (emissive) {
    material.emissive = new pc.Color(...rgb);
    material.emissiveIntensity = 0.45;
  }
  material.update();
  return material;
}

function bindCanvasLook(canvas) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", () => dragging = false);
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    state.yaw -= (event.clientX - lastX) * 0.18;
    state.pitch = clamp(state.pitch - (event.clientY - lastY) * 0.12, -35, 25);
    lastX = event.clientX;
    lastY = event.clientY;
  });
}

function bindMobileControls() {
  const movePad = document.querySelector("#movePad");
  const knob = movePad.querySelector("span");
  let activePointer = null;

  movePad.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    movePad.setPointerCapture(event.pointerId);
    updateMovePad(event);
  });

  movePad.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) updateMovePad(event);
  });

  const stopMove = () => {
    activePointer = null;
    state.touchMove.x = 0;
    state.touchMove.y = 0;
    knob.style.transform = "translate(-50%, -50%)";
  };

  movePad.addEventListener("pointerup", stopMove);
  movePad.addEventListener("pointercancel", stopMove);

  const turnLeft = document.querySelector("#turnLeftButton");
  const turnRight = document.querySelector("#turnRightButton");
  bindHoldButton(turnLeft, -1);
  bindHoldButton(turnRight, 1);

  function updateMovePad(event) {
    const rect = movePad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.32;
    const x = clamp(event.clientX - centerX, -maxDistance, maxDistance);
    const y = clamp(event.clientY - centerY, -maxDistance, maxDistance);
    state.touchMove.x = x / maxDistance;
    state.touchMove.y = y / maxDistance;
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
}

function bindHoldButton(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    button.setPointerCapture(event.pointerId);
    state.turnInput = direction;
  });
  const stop = () => {
    if (state.turnInput === direction) state.turnInput = 0;
  };
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
}

function updateWalk(dt) {
  if (!state.camera) return;
  const speed = state.keys.has("shift") ? 4.2 : 2.35;
  const forward = new pc.Vec3(Math.sin(degToRad(state.yaw)), 0, Math.cos(degToRad(state.yaw)));
  const right = new pc.Vec3(forward.z, 0, -forward.x);
  const delta = new pc.Vec3();

  if (state.turnInput) {
    state.yaw += state.turnInput * 74 * dt;
  }

  if (state.keys.has("w") || state.keys.has("arrowup") || state.touchMove.y < -0.15) delta.sub(forward);
  if (state.keys.has("s") || state.keys.has("arrowdown") || state.touchMove.y > 0.15) delta.add(forward);
  if (state.keys.has("a") || state.keys.has("arrowleft") || state.touchMove.x < -0.15) delta.sub(right);
  if (state.keys.has("d") || state.keys.has("arrowright") || state.touchMove.x > 0.15) delta.add(right);

  if (delta.lengthSq() > 0) {
    delta.normalize().mulScalar(speed * dt);
    const pos = state.camera.getPosition().clone().add(delta);
    pos.x = clamp(pos.x, -4.85, 4.85);
    pos.z = clamp(pos.z, -3.45, 3.45);
    pos.y = 1.55;
    if (!collidesWithWall(pos)) state.camera.setPosition(pos);
  }

  state.camera.setEulerAngles(state.pitch, state.yaw, 0);
}

function jumpToRoom(room) {
  const [x, y, z, yaw] = ROOM_PATH[room] || ROOM_PATH.living;
  state.camera.setPosition(x, y, z);
  state.yaw = yaw;
  state.pitch = -6;
  document.querySelectorAll("[data-room]").forEach((button) => button.classList.toggle("active", button.dataset.room === room));
}

function resetCamera() {
  state.camera?.setPosition(-1.0, 1.55, 0.35);
  state.yaw = 0;
  state.pitch = -10;
}

async function toggleAutoTour() {
  state.autoTour = !state.autoTour;
  document.querySelector("#autoTourButton").classList.toggle("active", state.autoTour);
  document.querySelector("#autoTourButton").textContent = state.autoTour ? "Zaustavi auto tour" : "Auto tour loop";
  while (state.autoTour) {
    for (const room of ["living", "kitchen", "bedroom", "bath", "hall"]) {
      if (!state.autoTour) break;
      await walkToRoom(room, 6800);
      await wait(1200);
    }
  }
}

async function walkToRoom(room, durationMs) {
  const waypoints = SAFE_PATHS[room] || SAFE_PATHS.living;
  const segmentDuration = Math.max(1800, durationMs / waypoints.length);
  for (const target of waypoints) {
    if (!state.autoTour) break;
    await walkSegment(target, segmentDuration);
  }
  document.querySelectorAll("[data-room]").forEach((button) => button.classList.toggle("active", button.dataset.room === room));
}

async function walkSegment(target, durationMs) {
  const start = state.camera.getPosition().clone();
  const startYaw = state.yaw;
  const startTime = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const progress = clamp((now - startTime) / durationMs, 0, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const nextPosition = new pc.Vec3(
        start.x + (target[0] - start.x) * eased,
        1.55,
        start.z + (target[2] - start.z) * eased
      );
      if (!collidesWithWall(nextPosition)) state.camera.setPosition(nextPosition);
      state.yaw = startYaw + shortestAngle(startYaw, target[3]) * eased;
      if (progress < 1 && state.autoTour) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function shortestAngle(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function collidesWithWall(position) {
  const radius = 0.22;
  return WALL_BLOCKS.some((wall) =>
    position.x > wall.minX - radius &&
    position.x < wall.maxX + radius &&
    position.z > wall.minZ - radius &&
    position.z < wall.maxZ + radius
  );
}

function applyUploadedTextures() {
  if (!state.uploadedTextureUrls.length) return;
  document.querySelector("#renderModeBadge").textContent = "GSplat pipeline";
}

function resizeViewerCanvas() {
  if (!state.app) return;
  const wrapper = document.querySelector(".canvas-wrap");
  state.app.resizeCanvas(wrapper.clientWidth, wrapper.clientHeight);
}

function getRenderPixelRatio() {
  const mobile = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  return mobile ? 1.15 : 1.5;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(value) {
  return value * Math.PI / 180;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
