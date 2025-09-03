// js/reviews.js

(() => {
  // ========================= UTILS =========================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const formatStars = (rating) => {
    const r = clamp(Math.round(Number(rating) || 0), 0, 5);
    return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r); // 5 chars
  };

  // ========================= DOM HOOKS =========================
  const listEl      = $("#reviews-list");
  const formEl      = $("#review-form");
  const tpl         = $("#review-template");
  const feedbackEl  = $("#review-feedback");
  const inputAuthor = $("#review-author");
  const inputRating = $("#review-rating");
  const inputContent= $("#review-content");

  // Stats (optionnels : ajoute ces éléments si tu veux l’affichage)
  const statsEl     = $("#reviews-stats");   // ex: <p id="reviews-stats"></p>
  const avgEl       = $("#reviews-average"); // ex: <span id="reviews-average"></span>
  const countEl     = $("#reviews-count");   // ex: <span id="reviews-count"></span>

  if (!listEl || !formEl || !tpl) {
    console.warn("[reviews.js] Sections manquantes (list/form/template).");
    return;
  }

  // ========================= STORAGE =========================
  const STORAGE_KEY = "reviews:v1";
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const save = (reviews) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)); }
    catch (e) { console.warn("Storage error:", e); }
  };

  // ========================= DATA =========================
  const fallback = [
    { id: uid(), author: "Camille", rating: 5, content: "Produit au top, super qualité !" },
    { id: uid(), author: "Léo",     rating: 4, content: "Très bon, livraison rapide. Je recommande." },
    { id: uid(), author: "Nina",    rating: 3, content: "Bien mais peut mieux faire sur l’autonomie." },
  ];
  const state = {
    reviews: load() ?? fallback
  };

  // ========================= RENDER =========================
  function renderEmpty() {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent = "Aucun avis pour le moment. Soyez le premier à laisser un avis.";
    listEl.appendChild(empty);
  }

  function renderOne(review, { prepend = false } = {}) {
    const { id, author, rating, content } = review;
    const node = tpl.content.cloneNode(true);

    const article   = $(".review", node);
    const elAuthor  = $(".review__author", node);
    const elRating  = $(".review__rating", node);
    const elContent = $(".review__content", node);
    const btnDelete = $(".review__delete", node);

    article.dataset.id = id;
    elAuthor.textContent = author;
    elContent.textContent = content;

    const r = clamp(Number(rating) || 0, 0, 5);
    elRating.textContent = formatStars(r);
    elRating.setAttribute("aria-label", `Note ${r} sur 5`);
    article.setAttribute("role", "listitem");

    btnDelete.type = "button";
    btnDelete.setAttribute("data-action", "delete");

    if (prepend && listEl.firstChild) {
      listEl.insertBefore(node, listEl.firstChild);
    } else {
      listEl.appendChild(node);
    }
  }

  function renderAll() {
    listEl.innerHTML = "";
    if (!state.reviews.length) { renderEmpty(); return; }
    state.reviews.forEach((r) => renderOne(r));
  }

  function updateStats() {
    if (!state.reviews.length) {
      if (statsEl) statsEl.textContent = "Aucun avis";
      if (avgEl)   avgEl.textContent   = "—";
      if (countEl) countEl.textContent = "0";
      return;
    }
    const sum = state.reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0);
    const avg = sum / state.reviews.length;
    const stars = formatStars(Math.round(avg));

    if (statsEl) statsEl.textContent = `${stars} (${avg.toFixed(1)}/5) — ${state.reviews.length} avis`;
    if (avgEl)   avgEl.textContent   = `${stars} (${avg.toFixed(1)}/5)`;
    if (countEl) countEl.textContent = String(state.reviews.length);
  }

  // ========================= FORM / VALIDATION =========================
  // ---- helpers dans reviews.js
  function setFeedback(msg, { ok=false } = {}) {
  const el = document.getElementById('review-feedback');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('text-success', ok);
  el.classList.toggle('text-danger', !ok);
}

function mark(input, ok){
  if(!input) return;
  input.classList.toggle('is-valid', ok);
  input.classList.toggle('is-invalid', !ok);
}

function validateReviewForm() {
  const inputAuthor  = document.getElementById('review-author');
  const inputRating  = document.getElementById('review-rating');
  const inputContent = document.getElementById('review-content');

  const author  = (inputAuthor?.value || '').trim();
  const rating  = Number(inputRating?.value || 0);
  const content = (inputContent?.value || '').trim();

  const okAuthor  = author.length >= 2;
  const okRating  = Number.isFinite(rating) && rating >= 1 && rating <= 5;
  const okContent = content.length >= 3;

  mark(inputAuthor, okAuthor);
  mark(inputRating, okRating);
  mark(inputContent, okContent);

  return {
    ok: okAuthor && okRating && okContent,
    data: { author, rating, content }
  };
}

// ---- écouteur de submit
document.getElementById('review-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const { ok, data } = validateReviewForm();
  if(!ok){
    setFeedback("Le nom doit contenir au moins 2 caractères. Merci de choisir une note entre 1 et 5. Votre avis doit contenir au moins 3 caractères.", { ok:false });
    return;
  }

  // ajoute l’avis (selon votre logique existante)
  // state.reviews.unshift({ id: uid(), ...data });
  // save(state.reviews);
  // renderOne(state.reviews[0], { prepend: true });
  // updateStats();

  // Nettoyage UI
  e.target.reset();
  ['review-author','review-rating','review-content'].forEach(id=>{
    const el=document.getElementById(id);
    el?.classList.remove('is-invalid','is-valid');
  });
  setFeedback("Merci, votre avis a été publié !", { ok:true });
});


  // ========================= EVENTS =========================
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    setFeedback("");

    const { author, rating, content, errors } = getFormData();
    if (errors.length) {
      setFeedback(errors.join(" "), { ok: false });
      return;
    }

    const newReview = { id: uid(), author, rating, content };
    state.reviews.unshift(newReview);
    save(state.reviews);

    // re-render tête + stats
    if (listEl.firstChild && listEl.firstChild.textContent?.includes("Aucun avis")) {
      listEl.innerHTML = ""; // retire l'état vide
    }
    renderOne(newReview, { prepend: true });
    updateStats();

    setFeedback("Merci, votre avis a été publié !", { ok: true });
    clearForm();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".review__delete");
    if (!btn) return;

    const article = btn.closest(".review");
    const id = article?.dataset.id;
    if (!id) return;

    state.reviews = state.reviews.filter((r) => r.id !== id);
    save(state.reviews);

    // petite animation de retrait
    article.style.transition = "opacity .2s ease, transform .2s ease";
    article.style.opacity = "0";
    article.style.transform = "scale(.98)";
    setTimeout(() => {
      article.remove();
      if (!state.reviews.length) renderEmpty();
      updateStats();
    }, 180);

    setFeedback("Avis supprimé.", { ok: true });
  });

  // ========================= INIT =========================
  function init() {
    renderAll();
    updateStats();
    setFeedback("Ajoutez votre avis via le formulaire ci-dessus.", { ok: true });
  }
  init();
})();
