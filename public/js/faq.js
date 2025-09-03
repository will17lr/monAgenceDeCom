// js/faq.js

(() => {
  // ----- Données statiques -----
  const faqData = [
    {
      question: "Quels sont les délais de livraison ?",
      response:
        "Nous livrons sous 24-48h pour les articles en stock en France métropolitaine via notre réseau de transporteurs partenaires. Pour les commandes passées avant 15h en semaine, l'expédition se fait le jour même. Les délais peuvent être prolongés de 1-2 jours pour la Corse et les DOM-TOM. En cas de rupture de stock, nous vous prévenons immédiatement et vous proposons un article de substitution ou un remboursement."
    },
    {
      question: "Que faire si mon matériel arrive défectueux ?",
      response:
        "Tous nos produits sont testés avant expédition, mais si vous recevez un article défectueux, contactez-nous dans les 48h suivant la réception. Nous organisons immédiatement l'échange ou le remboursement, avec prise en charge des frais de retour. Conservez l'emballage d'origine et prenez des photos du défaut pour accélérer le traitement de votre demande."
    },
    {
      question: "Proposez-vous une garantie étendue ?",
      response:
        "Outre la garantie légale de conformité de 2 ans, nous proposons une extension de garantie optionnelle de 1 à 3 ans supplémentaires selon les produits. Cette garantie couvre les pannes, l'usure normale et inclut un service de remplacement rapide. Elle est souscriptible jusqu'à 30 jours après votre achat et représente généralement 10-15% du prix du produit."
    },
    {
      question: "Puis-je retourner un article qui ne me convient pas ?",
      response:
        "Conformément au droit de rétractation, vous disposez de 14 jours après réception pour retourner tout article ne vous convenant pas, sans avoir à justifier votre décision. Le produit doit être dans son état d'origine avec tous ses accessoires. Les frais de retour sont à votre charge sauf si l'article était défectueux. Le remboursement intervient sous 14 jours après réception du retour."
    },
    {
      question: "Acceptez-vous le paiement en plusieurs fois ?",
      response:
        "Nous proposons le paiement en 3 ou 4 fois sans frais par carte bancaire pour tout achat supérieur à 100€, ainsi que des solutions de financement jusqu'à 24 mois pour les achats importants. Vous pouvez également régler par PayPal, virement bancaire ou chèque. Toutes les transactions sont sécurisées par protocole SSL et nous ne conservons aucune donnée bancaire sur nos serveurs."
    }
  ];

  // ----- Sélecteurs -----
  const container = document.getElementById("faqContainer");           // .faq__list (role=list)
  const tpl = document.getElementById("faq-item-template");            // <template>
  const form = document.getElementById("faqForm");
  const input = document.getElementById("questionInput");
  const feedback = document.getElementById("faqFeedback");             // optionnel

  if (!container || !tpl) {
    console.warn("[faq.js] Conteneur ou template manquant.");
    return;
  }

  const setFeedback = (msg = "", ok = true) => {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.style.color = ok ? "green" : "red";
  };

  const uid = (() => {
    let i = 0;
    return () => (++i).toString(36) + "-" + Date.now().toString(36);
  })();

  // ----- Rendu d’un item à partir du template -----
  function renderItem({ question, response }, { append = true } = {}) {
    const id = uid();
    const node = tpl.content.cloneNode(true);

    const article = node.querySelector(".faq__item");
    const btn     = node.querySelector(".faq__question");
    const qText   = node.querySelector(".faq__q-text");
    const panel   = node.querySelector(".faq__answer");
    const aText   = node.querySelector(".faq__a-text");

    // Texte sécurisé
    qText.textContent = question;
    aText.textContent = response;

    // Liaisons ARIA/IDs
    const panelId = `faq-panel-${id}`;
    panel.id = panelId;
    panel.hidden = true;
    btn.setAttribute("aria-controls", panelId);
    btn.setAttribute("aria-expanded", "false");

    // Ajout dans la liste
    if (append) container.appendChild(node);
    else container.prepend(node);
  }

  function renderAll() {
    container.setAttribute("role", "list");
    container.innerHTML = "";
    faqData.forEach(item => renderItem(item, { append: true }));
  }

  // ----- Ouverture / Fermeture -----
  function closeAllExcept(exceptBtn) {
    const buttons = container.querySelectorAll(".faq__question[aria-expanded='true']");
    buttons.forEach(b => {
      if (b === exceptBtn) return;
      b.setAttribute("aria-expanded", "false");
      const pid = b.getAttribute("aria-controls");
      const p = pid && document.getElementById(pid);
      if (p) p.hidden = true;
    });
  }

  function toggle(btn) {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    const pid = btn.getAttribute("aria-controls");
    const panel = pid && document.getElementById(pid);
    if (!panel) return;

    if (expanded) {
      btn.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    } else {
      closeAllExcept(btn);
      btn.setAttribute("aria-expanded", "true");
      panel.hidden = false;
    }
  }

  // Délégation d’événements (un seul listener pour toute la FAQ)
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq__question");
    if (!btn) return;
    toggle(btn);
  });

  // ----- Formulaire d’ajout -----
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input?.value?.trim();
    if (!val) {
      setFeedback("Veuillez saisir une question.", false);
      input?.focus();
      return;
    }
    const newItem = {
      question: val,
      response: "Réponse en attente de traitement par notre équipe."
    };
    faqData.push(newItem);
    renderItem(newItem, { append: true });
    setFeedback("Votre question a bien été ajoutée à la FAQ.", true);
    form.reset();
  });

  // ----- Init -----
  renderAll();
})();
