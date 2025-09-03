// public/js/contact.js
(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const btn = document.getElementById("contactSubmit");
  const fileInput = document.getElementById("attachment");
  const feedback = document.getElementById("contactFeedback");

  const okTypes = ["application/pdf", "image/jpeg", "image/png"];
  const MAX = 5 * 1024 * 1024;

  const setStatus = (msg, ok = true) => {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.classList.toggle("text-success", ok);
    feedback.classList.toggle("text-danger", !ok);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (!form.checkValidity()) {
      setStatus("Veuillez compléter les champs requis.", false);
      return;
    }

    const f = fileInput?.files?.[0];
    if (f) {
      if (!okTypes.includes(f.type)) return setStatus("PDF, JPG ou PNG uniquement.", false);
      if (f.size > MAX)          return setStatus("Fichier > 5 Mo.", false);
    }

    const fd = new FormData(form);

    if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = "Envoi…"; }
    try {
      const res  = await fetch("/contact", { method: "POST", body: fd });
      // ✅ Lire UNE SEULE fois. On tente JSON sinon on garde le texte.
      const txt  = await res.text();
      let data   = {};
      try { if ((res.headers.get("content-type") || "").includes("application/json")) data = JSON.parse(txt); }
      catch { /* ignore */ }

      if (!res.ok || data.ok === false) {
        const msg = data.message || txt || "Erreur pendant l'envoi.";
        throw new Error(msg);
      }

      setStatus(data.message || "✅ Message envoyé, merci !");
      form.reset();
    } catch (err) {
      setStatus("❌ " + (err.message || "Erreur inconnue"), false);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t || "Envoyer le message"; }
    }
  });
})();
