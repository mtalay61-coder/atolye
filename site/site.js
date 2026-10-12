// SİTE — ortak davranışlar: iletişim bilgilerini ayarlardan doldurma ve canlı koleksiyon.
(function () {
  const S = window.SITE || {};
  const doldurulmus = (v) => v && !/^\[.*\]$/.test(v);

  // [data-site="alan"] öğelerine ayardaki değer yazılır; doldurulmamış alanın kartı gizlenir.
  document.querySelectorAll("[data-site]").forEach((el) => {
    const v = S[el.dataset.site];
    if (!doldurulmus(v)) { const k = el.closest("[data-site-kart]"); if (k) k.hidden = true; return; }
    el.textContent = v;
    if (el.dataset.site === "telefon") el.href = "tel:" + v.replace(/[^\d+]/g, "");
    if (el.dataset.site === "eposta") el.href = "mailto:" + v;
  });
  document.querySelectorAll("[data-site-href]").forEach((el) => {
    const v = S[el.dataset.siteHref];
    if (doldurulmus(v)) el.href = v; else { el.hidden = true; const k = el.closest("[data-site-kart]"); if (k) k.hidden = true; }
  });
  const wa = document.querySelector("[data-whatsapp]");
  if (wa) { if (S.whatsapp) wa.href = "https://wa.me/" + S.whatsapp; else wa.hidden = true; }
  const harita = document.querySelector("[data-harita]");
  if (harita) {
    if (S.haritaSorgusu) harita.src = "https://www.google.com/maps?q=" + encodeURIComponent(S.haritaSorgusu) + "&output=embed";
    else { const k = harita.closest("[data-site-kart]"); if (k) k.hidden = true; }
  }
  const yil = document.querySelector("[data-yil]");
  if (yil) yil.textContent = new Date().getFullYear();

  // ---- CANLI KOLEKSİYON ----
  // Kaynak: Supabase `vitrin()` (vitrin.sql). Ağ yoksa ya da fonksiyon kurulmamışsa bölüm sade bir bilgi yazar; site bozulmaz.
  const izgara = document.querySelector("[data-koleksiyon]");
  if (!izgara) return;
  const suzgec = document.querySelector("[data-koleksiyon-suzgec]");
  const durum = (metin) => { izgara.innerHTML = '<div class="bilgi" style="grid-column:1/-1"></div>'; izgara.firstChild.textContent = metin; };
  durum("Koleksiyon yükleniyor…");

  fetch(S.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/vitrin", {
    method: "POST",
    headers: { apikey: S.supabaseAnahtar, Authorization: "Bearer " + S.supabaseAnahtar, "Content-Type": "application/json" },
    body: "{}",
  })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((urunler) => {
      if (!Array.isArray(urunler) || urunler.length === 0) { durum("Koleksiyon yakında burada."); return; }
      const tipler = Array.from(new Set(urunler.map((u) => u.tip).filter(Boolean)));
      let secili = "Tümü";
      const ciz = () => {
        izgara.innerHTML = "";
        urunler.filter((u) => secili === "Tümü" || u.tip === secili).forEach((u) => izgara.appendChild(urunKarti(u)));
      };
      if (suzgec && tipler.length > 1) {
        ["Tümü", ...tipler].forEach((t) => {
          const b = document.createElement("button");
          b.type = "button"; b.textContent = t; if (t === secili) b.className = "etkin";
          b.onclick = () => { secili = t; suzgec.querySelectorAll("button").forEach((x) => x.classList.toggle("etkin", x === b)); ciz(); };
          suzgec.appendChild(b);
        });
      }
      ciz();
    })
    .catch(() => durum("Koleksiyon şu an yüklenemedi. Bilgi için bize ulaşın."));

  // Kart: ilk renk resmi (yoksa kapak); renk düğmesine dokununca o rengin resmi. Fiyat yok — vitrin fonksiyonu fiyat döndürmez.
  function urunKarti(u) {
    const resimler = u.renk_resimleri || {};
    const renkler = (u.renkler && u.renkler.length ? u.renkler : Object.keys(resimler)).filter((r) => r && r !== "Standart");
    const ilkResim = () => (renkler.map((r) => resimler[r]).find(Boolean)) || u.kapak_resmi || "";
    const kart = document.createElement("article");
    kart.className = "urun";
    const resimKutu = document.createElement("div");
    resimKutu.className = "urun-resim";
    const img = document.createElement("img");
    img.loading = "lazy"; img.alt = u.ad;
    const goster = (src) => { if (src) { img.src = src; resimKutu.replaceChildren(img); } else { resimKutu.innerHTML = '<span class="yok">Görsel yakında</span>'; } };
    goster(ilkResim());
    const govde = document.createElement("div");
    govde.className = "urun-govde";
    const ad = document.createElement("div"); ad.className = "urun-ad"; ad.textContent = u.ad;
    govde.appendChild(ad);
    const alt = [u.tip, [u.sezon, u.sezon_yili].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    if (alt) { const a = document.createElement("div"); a.className = "urun-alt"; a.textContent = alt; govde.appendChild(a); }
    if (renkler.length) {
      const rk = document.createElement("div"); rk.className = "renkler";
      renkler.forEach((r, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "renk" + (i === 0 ? " etkin" : ""); b.textContent = r;
        b.onclick = () => { rk.querySelectorAll(".renk").forEach((x) => x.classList.toggle("etkin", x === b)); goster(resimler[r] || u.kapak_resmi); };
        rk.appendChild(b);
      });
      govde.appendChild(rk);
    }
    kart.append(resimKutu, govde);
    return kart;
  }
})();
