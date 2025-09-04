// public/js/contact.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const btn  = document.getElementById("contactSubmit");
  const file = document.getElementById("attachment");
  const feedback = document.getElementById("contactFeedback");
  if (!form || !btn) return;

  const okTypes = ["application/pdf", "image/jpeg", "image/png"];
  const MAX = 5 * 1024 * 1024; // 5 Mo
  let submitting = false;

  const setStatus = (msg, ok = true) => {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.classList.toggle("text-success", ok);
    feedback.classList.toggle("text-danger", !ok);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;

    setStatus("");

    // Validation HTML5
    if (!form.checkValidity()) {
      setStatus("Veuillez compléter les champs requis.", false);
      return;
    }

    // Validation fichier
    const f = file?.files?.[0];
    if (f) {
      if (!okTypes.includes(f.type)) {
        setStatus("PDF, JPG ou PNG uniquement.", false);
        return;
      }
      if (f.size > MAX) {
        setStatus("Fichier > 5 Mo.", false);
        return;
      }
    }

    const fd = new FormData(form);
    const url = form.getAttribute("action") || "/api/contact";
    const method = (form.getAttribute("method") || "POST").toUpperCase();

    // état chargement
    submitting = true;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Envoi…";
    btn.setAttribute("aria-busy", "true");

    // timeout pour éviter spinner infini
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 20000);

    // clé d'idempotence
    const idem = (crypto?.randomUUID && crypto.randomUUID()) ||
                 (Date.now() + "-" + Math.random().toString(16).slice(2));

    try {
      const res = await fetch(url, {
        method,
        body: fd,
        signal: controller.signal,
        headers: { "X-Idempotency-Key": idem, "Accept": "application/json" }
      });
      clearTimeout(to);

      // on accepte JSON ou texte
      const ctype = res.headers.get("content-type") || "";
      const payload = ctype.includes("application/json") ? await res.json() : { message: await res.text() };

      if (!res.ok || payload.ok === false) {
        throw new Error(payload.message || `Erreur ${res.status}`);
      }

      if (payload.dedup) {
        setStatus("Message déjà reçu (déduplication).");
        return;
      }

      form.reset();
      setStatus(payload.message || "✅ Message envoyé, merci !");
    } catch (err) {
      setStatus(err.name === "AbortError"
        ? "❌ Délai dépassé : le serveur ne répond pas."
        : "❌ " + (err.message || "Erreur inconnue"), false);
    } finally {
      submitting = false;
      btn.disabled = false;
      btn.textContent = original;
      btn.removeAttribute("aria-busy");
      clearTimeout(to);
    }
  });
});
