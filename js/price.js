// js/price.js

// --- Données ---
const COULEURS = [
  { value: "noir",   label: "Noir" },
  { value: "argent", label: "Argent" },
  { value: "bleu",   label: "Bleu" },
];

const VERSIONS = [
  { value: "std-64",      label: "Standard 64 Go",  base: 299 },
  { value: "plus-128",    label: "Plus 128 Go",     base: 399 },
  { value: "premium-256", label: "Premium 256 Go",  base: 599 },
];

const SURCOUTS = {
  // Couleurs
  noir: 0,
  argent: 20,
  bleu: 30,
  // Options
  warranty: 50,
  case: 25,
  accessories: 35,
};

const OPTIONS = [
  { value: "warranty",   label: "Garantie étendue" },
  { value: "case",       label: "Étui / Housse" },
  { value: "accessories",label: "Pack accessoires" },
];

// --- Templates ---
const tplRadio = document.createElement("template");
tplRadio.innerHTML = `
  <div class="form-check me-3">
    <input class="form-check-input" type="radio" name="color" id="" value="" required />
    <label class="form-check-label" for=""></label>
  </div>
`.trim();

const tplCheckbox = document.createElement("template");
tplCheckbox.innerHTML = `
  <div class="form-check me-3">
    <input class="form-check-input" type="checkbox" name="options" id="" value="" />
    <label class="form-check-label" for=""></label>
  </div>
`.trim();

const tplOption = document.createElement("template");
tplOption.innerHTML = `<option value=""></option>`.trim();

// --- Utilitaires ---
const fmtEUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const formatEUR = (n) => fmtEUR.format(Number(n) || 0);

const getBasePrice = (versionValue) => {
  const found = VERSIONS.find((v) => v.value === versionValue);
  return found ? Number(found.base) : 0;
};

const surchargeOf = (key) =>
  Object.prototype.hasOwnProperty.call(SURCOUTS, key) ? Number(SURCOUTS[key]) : 0;

function calcTotal() {
  const color = document.querySelector('input[name="color"]:checked')?.value || "";
  const version = document.getElementById("version-select")?.value || "";
  const checkedOptions = Array.from(
    document.querySelectorAll('input[name="options"]:checked')
  ).map((el) => el.value);

  let total = 0;
  total += getBasePrice(version);
  if (color) total += surchargeOf(color);
  checkedOptions.forEach((opt) => { total += surchargeOf(opt); });

  return total;
}

function updateTotal() {
  const out = document.getElementById("total-price");
  if (!out) return;
  out.textContent = formatEUR(calcTotal());
}

// --- Génération dynamique ---
function renderColors() {
  const wrap = document.getElementById("couleurs-container");
  if (!wrap) return;

  COULEURS.forEach(({ value, label }) => {
    const node = tplRadio.content.cloneNode(true);
    const input = node.querySelector('input[type="radio"]');
    const lab   = node.querySelector("label");
    const id = `color-${value}`;

    input.id = id;
    input.value = value;
    lab.setAttribute("for", id);

    const extra = surchargeOf(value);
    lab.textContent = extra > 0 ? `${label} (+${formatEUR(extra)})` : label;

    wrap.appendChild(node);
  });

  // Pré-sélection de la 1ʳᵉ couleur (UX)
  const first = wrap.querySelector('input[type="radio"]');
  if (first) first.checked = true;
}

function renderVersions() {
  const select = document.getElementById("version-select");
  if (!select) return;

  // Placeholder (respecte required)
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Choisir une version";
  select.appendChild(placeholder);

  VERSIONS.forEach(({ value, label, base }) => {
    const node = tplOption.content.cloneNode(true);
    const opt = node.querySelector("option");
    opt.value = value;
    opt.textContent = `${label} — ${formatEUR(base)}`;
    select.appendChild(node);
  });
}

function renderOptions() {
  const wrap = document.getElementById("options-container");
  if (!wrap) return;

  OPTIONS.forEach(({ value, label }) => {
    const node = tplCheckbox.content.cloneNode(true);
    const input = node.querySelector('input[type="checkbox"]');
    const lab   = node.querySelector("label");
    const id = `opt-${value}`;

    input.id = id;
    input.value = value;
    lab.setAttribute("for", id);

    const extra = surchargeOf(value);
    lab.textContent = extra > 0 ? `${label} (+${formatEUR(extra)})` : label;

    wrap.appendChild(node);
  });
}

// --- Écoute form ---
function attachEvents() {
  const form = document.getElementById("price-form");
  const btnReset = document.getElementById("price-reset");
  if (!form) return;

  form.addEventListener("change", updateTotal);

  form.addEventListener("reset", () => {
    // Laisse le reset du navigateur s'appliquer, puis recalcule
    setTimeout(() => {
      // On enlève la sélection radio si tu veux un état clean
      // (sinon, commente ces 3 lignes)
      document.querySelectorAll('input[name="options"]:checked').forEach(i => (i.checked = false));
      updateTotal();
    }, 0);
  });

  if (btnReset) btnReset.addEventListener("click", () => {});
}

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  renderColors();
  renderVersions();
  renderOptions();
  attachEvents();
  updateTotal();
});
