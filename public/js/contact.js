// js/contact.js
(() => {
  const form      = document.getElementById('contactForm');
  const btn       = document.getElementById('contactSubmit');
  const feedback  = document.getElementById('contactFeedback');
  const fileInput = document.getElementById('attachment');
  const fileHelp  = document.getElementById('fileHelp');

  if (!form || !btn) return;

  const CONTACT_ENDPOINT = '/api/contact';

  const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
  const ALLOWED_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]);

  // ---- Utils UI ----
  const setFeedback = (msg = '', type = 'info') => {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.classList.remove('success', 'error');
    if (type === 'success') feedback.classList.add('success');
    if (type === 'error')   feedback.classList.add('error');
  };

  const mark = (el, valid) => {
    if (!el) return;
    el.classList.toggle('is-valid',  !!valid);
    el.classList.toggle('is-invalid', valid === false);
  };

  const lockUI = (lock = true) => {
    form.setAttribute('aria-busy', lock ? 'true' : 'false');
    btn.disabled = lock;
    if (lock) {
      btn.dataset._label = btn.textContent;
      btn.textContent = 'Envoi…';
      form.querySelectorAll('input, textarea, select').forEach(i => i.disabled = i.disabled || false);
    } else {
      if (btn.dataset._label) btn.textContent = btn.dataset._label;
      form.querySelectorAll('input, textarea, select').forEach(i => i.disabled = false);
    }
  };

  // ---- Validation ----
  const validateEmail = (value) => {
    // Utilise le validateur natif si possible
    const input = form.email;
    if (input && input.type === 'email') {
      input.value = value; // pour que input.validity fonctionne
      return input.checkValidity();
    }
    // Fallback simple
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateFile = (file) => {
    if (!file) return { ok: true };
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: 'Type de fichier non autorisé (PDF, JPG, PNG uniquement).' };
    }
    if (file.size > MAX_SIZE) {
      return { ok: false, error: 'Fichier trop volumineux (≤ 5 Mo).' };
    }
    return { ok: true };
  };

  const humanSize = (bytes) => {
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
    };

  // Pré-validation live du fichier
  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    const { ok, error } = validateFile(f);
    mark(fileInput, ok);
    if (fileHelp) {
      if (f && ok) fileHelp.textContent = `Fichier sélectionné : ${f.name} (${humanSize(f.size)})`;
      else fileHelp.textContent = 'Extensions autorisées : .pdf, .jpg, .png (taille ≤ 5 Mo).';
    }
    if (!ok) setFeedback(error, 'error');
  });

  // Nettoyage du feedback au focus
  form.addEventListener('input', () => {
    setFeedback('');
  });

  // ---- Soumission ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback('');

    const name    = form.name?.value?.trim()   || '';
    const email   = form.email?.value?.trim()  || '';
    const message = form.message?.value?.trim()|| '';
    const file    = fileInput?.files?.[0];

    // Champs requis
    const okName    = name.length >= 2;
    const okEmail   = validateEmail(email);
    const okMessage = message.length >= 3 && message.length <= 5000;
    const fileCheck = validateFile(file);

    mark(form.name, okName);
    mark(form.email, okEmail);
    mark(form.message, okMessage);

    if (!okName || !okEmail || !okMessage || !fileCheck.ok) {
      const errs = [];
      if (!okName)    errs.push('Nom invalide (≥ 2 caractères).');
      if (!okEmail)   errs.push('Email invalide.');
      if (!okMessage) errs.push('Message invalide (3 à 5000 caractères).');
      if (!fileCheck.ok) errs.push(fileCheck.error);
      setFeedback(errs.join(' '), 'error');
      return;
    }

    // Prépare la requête
    const data = new FormData();
    data.append('name', name);
    data.append('email', email);
    data.append('message', message);
    if (file) data.append('attachment', file, file.name);

    // Timeout / abort (20s)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);

    try {
      lockUI(true);

      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        body: data,               // NE PAS fixer Content-Type avec FormData
        credentials: 'same-origin',
        signal: controller.signal
      });

      clearTimeout(t);

      if (!res.ok) {
        let detail = '';
        try {
          const err = await res.json();
          detail = err?.error || JSON.stringify(err);
        } catch {
          detail = await res.text();
        }
        throw new Error(detail || 'Envoi impossible. Merci de réessayer.');
      }

      setFeedback(
        'Merci ! Votre message a été envoyé. Une copie vient de vous être adressée par e-mail.',
        'success'
      );
      form.reset();
      mark(form.name, null);
      mark(form.email, null);
      mark(form.message, null);
      mark(fileInput, null);
      if (fileHelp) fileHelp.textContent = 'Extensions autorisées : .pdf, .jpg, .png (taille ≤ 5 Mo).';
    } catch (err) {
      if (err.name === 'AbortError') {
        setFeedback('La requête a expiré. Vérifiez votre connexion et réessayez.', 'error');
      } else {
        setFeedback(err.message || 'Erreur réseau. Réessayez.', 'error');
      }
    } finally {
      clearTimeout(t);
      lockUI(false);
    }
  });
})();
