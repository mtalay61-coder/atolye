/* Atölye kuralları kod olarak: ikonlar, araç çubuğu sırası, kısayollar, bildirim süresi.
   Uygulama bu tabloları kopyalamaz, buradan alır. Sayfadaki <i data-ik="i-save"></i> yer tutucuları ikonla değiştirilir. */
(function () {
  var IKONLAR = {"i-plus": "<path d=\"M5 12h14\"><\/path><path d=\"M12 5v14\"><\/path>", "i-save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"><\/path><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"><\/path><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"><\/path>", "i-edit": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"><\/path><path d=\"m15 5 4 4\"><\/path>", "i-trash": "<path d=\"M10 11v6\"><\/path><path d=\"M14 11v6\"><\/path><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"><\/path><path d=\"M3 6h18\"><\/path><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"><\/path>", "i-copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"><\/rect><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"><\/path>", "i-search": "<path d=\"m21 21-4.34-4.34\"><\/path><circle cx=\"11\" cy=\"11\" r=\"8\"><\/circle>", "i-filter": "<path d=\"M3 6h18\"><\/path><path d=\"M7 12h10\"><\/path><path d=\"M10 18h4\"><\/path>", "i-refresh": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"><\/path><path d=\"M21 3v5h-5\"><\/path><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"><\/path><path d=\"M8 16H3v5\"><\/path>", "i-print": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"><\/path><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"><\/path><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"><\/rect>", "i-export": "<path d=\"M12 3v12\"><\/path><path d=\"m7 10 5 5 5-5\"><\/path><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"><\/path>", "i-collapse": "<path d=\"m7 20 5-5 5 5\"><\/path><path d=\"m7 4 5 5 5-5\"><\/path>", "i-expand": "<path d=\"m7 15 5 5 5-5\"><\/path><path d=\"m7 9 5-5 5 5\"><\/path>", "i-close": "<path d=\"M18 6 6 18\"><\/path><path d=\"m6 6 12 12\"><\/path>", "i-undo": "<path d=\"M3 7v6h6\"><\/path><path d=\"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13\"><\/path>", "i-check": "<path d=\"M21.8 10A10 10 0 1 1 17 3.34\"><\/path><path d=\"m9 11 3 3L22 4\"><\/path>", "i-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"><\/path><path d=\"M12 9v4\"><\/path><path d=\"M12 17h.01\"><\/path>", "i-back": "<path d=\"m12 19-7-7 7-7\"><\/path><path d=\"M19 12H5\"><\/path>", "i-clock": "<path d=\"M12 6v6l4 2\"><\/path><circle cx=\"12\" cy=\"12\" r=\"10\"><\/circle>", "i-info": "<circle cx=\"12\" cy=\"12\" r=\"10\"><\/circle><path d=\"M12 16v-4\"><\/path><path d=\"M12 8h.01\"><\/path>", "i-ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"><\/circle><path d=\"m4.9 4.9 14.2 14.2\"><\/path>", "i-draft": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z\"><\/path><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"><\/path>"};
  function ikon(ad) {
    var ic = IKONLAR[ad];
    if (!ic) return "";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ic + "</svg>";
  }
  // Araç çubuğu: sıra burada sabit. Ekranda olmayan çıkar, kalanların sırası değişmez.
  var EYLEMLER = [
    { tur: "yeni", ad: "Yeni", ikon: "i-plus", kisayol: "Ctrl+N", grup: 1, birincil: true },
    { tur: "kaydet", ad: "Kaydet", ikon: "i-save", kisayol: "Ctrl+S", grup: 1, birincil: true },
    { tur: "duzenle", ad: "Düzenle", ikon: "i-edit", kisayol: "F2", grup: 1 },
    { tur: "kopyala", ad: "Kopyala", ikon: "i-copy", kisayol: null, grup: 1 },
    { tur: "sil", ad: "Sil", ikon: "i-trash", kisayol: "Del", grup: 1, tehlike: true },
    { tur: "ara", ad: "Ara", ikon: "i-search", kisayol: null, grup: 2 },
    { tur: "filtre", ad: "Filtre", ikon: "i-filter", kisayol: null, grup: 2 },
    { tur: "yenile", ad: "Yenile", ikon: "i-refresh", kisayol: "F5", grup: 3 },
    { tur: "yazdir", ad: "Yazdır", ikon: "i-print", kisayol: null, grup: 3 },
    { tur: "excel", ad: "Excel", ikon: "i-export", kisayol: null, grup: 3 },
    { tur: "kucult", ad: "Küçült", ikon: "i-collapse", kisayol: null, grup: 4 },
    { tur: "kapat", ad: "Kapat", ikon: "i-close", kisayol: "Esc", grup: 4 }
  ];
  // eylemler: { tur: { pasif?: "neden" } }. Sıra ve gruplar tablodan gelir.
  function aracCubugu(eylemler, baslik) {
    var html = baslik ? '<span class="erp-toolbar__baslik">' + baslik + "</span>" : "";
    var sonGrup = 0;
    EYLEMLER.forEach(function (e) {
      if (!(e.tur in eylemler)) return;
      var d = eylemler[e.tur] || {};
      if (sonGrup && e.grup !== sonGrup) html += e.grup === 3 ? '<span class="erp-toolbar__gap"></span>' : '<span class="erp-toolbar__sep"></span>';
      sonGrup = e.grup;
      var sinif = "erp-ib" + (e.birincil && d.birincil !== false ? " erp-ib--primary" : "") + (e.tehlike ? " erp-ib--danger" : "");
      var ipucu = d.pasif ? d.pasif : e.ad + (e.kisayol ? " · " + e.kisayol : "");
      html += '<button type="button" class="' + sinif + '" data-eylem="' + e.tur + '" aria-label="' + e.ad + '" title="' + ipucu + '"' + (d.pasif ? " disabled" : "") + ">" + ikon(e.ikon) + "</button>";
    });
    return html;
  }
  // Bildirim süresi: 4 sn + her 20 karakter için 1 sn, en çok 12 sn; Geri al varsa 9 sn.
  function bildirimSuresi(metin, geriAl) {
    if (geriAl) return 9000;
    return Math.min(12000, 4000 + Math.floor(String(metin || "").length / 20) * 1000);
  }
  var KISAYOLLAR = { "Ctrl+S": "kaydet", "Ctrl+N": "yeni", "F2": "duzenle", "F5": "yenile", "Delete": "sil", "Escape": "kapat" };
  var DURUMLAR = {
    ok: { ikon: "i-check", sinif: "erp-badge--ok" }, wait: { ikon: "i-clock", sinif: "erp-badge--wait" },
    info: { ikon: "i-info", sinif: "erp-badge--info" }, idle: { ikon: "i-ban", sinif: "" },
    void: { ikon: "i-alert", sinif: "erp-badge--void" }, taslak: { ikon: "i-draft", sinif: "erp-badge--info" }
  };
  function rozet(durum, metin) {
    var d = DURUMLAR[durum] || DURUMLAR.idle;
    return '<span class="erp-badge ' + d.sinif + '">' + ikon(d.ikon) + metin + "</span>";
  }
  function ikonlariYerlestir(kok) {
    (kok || document).querySelectorAll("i[data-ik]").forEach(function (el) {
      var t = document.createElement("span");
      t.innerHTML = ikon(el.getAttribute("data-ik"));
      el.replaceWith(t.firstChild || document.createTextNode(""));
    });
    (kok || document).querySelectorAll("[data-arac]").forEach(function (el) {
      var veri = {};
      try { veri = JSON.parse(el.getAttribute("data-arac")); } catch (e) {}
      el.innerHTML = aracCubugu(veri, el.getAttribute("data-baslik") || "");
    });
  }

  // ===== ARAMA: yazdıkça daralan liste =====
  // Kural: yazılan her kelime kaydın aranan alanlarından birinin İÇİNDE geçmeli (baştan olması gerekmez),
  // sıra önemsiz, Türkçe büyük/küçük harf ve şapka/nokta farkı yok ("cevik" → "Çevik", "IŞIK" → "ışık").
  var KATLA = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };
  // Karakter karakter katlar; uzunluk korunur, böylece vurgu konumları özgün metne aynen uyar.
  function katla(metin) {
    var s = String(metin == null ? "" : metin), o = "";
    for (var i = 0; i < s.length; i++) {
      var c = s[i].toLocaleLowerCase("tr");
      c = c.length === 1 ? c : c[0];
      o += KATLA[c] || c;
    }
    return o;
  }
  // kayit: aranan alanların metinleri dizisi; kod: varsa birebir kod/barkod eşleşmesi öne alınır.
  // Dönüş: null (eşleşmedi) ya da { puan, vurgular: [[alanSirasi, bas, son], …] }.
  function eslesme(sorgu, alanlar, kod) {
    var kelimeler = katla(sorgu).split(/\s+/).filter(Boolean);
    if (!kelimeler.length) return { puan: 0, vurgular: [] };
    var katli = alanlar.map(katla), puan = 0, vurgular = [];
    if (kod != null && katla(kod) === kelimeler.join(" ")) puan += 100;
    for (var k = 0; k < kelimeler.length; k++) {
      var w = kelimeler[k], bulundu = false;
      for (var a = 0; a < katli.length; a++) {
        var yer = katli[a].indexOf(w);
        if (yer < 0) continue;
        bulundu = true;
        vurgular.push([a, yer, yer + w.length]);
        puan += yer === 0 ? 6 : /[\s\-·.,/()]/.test(katli[a][yer - 1]) ? 4 : 1;
        puan += a === 0 ? 1 : 0;
        break;
      }
      if (!bulundu) return null;
    }
    return { puan: puan, vurgular: vurgular };
  }
  function vurgula(metin, araliklar) {
    var s = String(metin == null ? "" : metin);
    if (!araliklar.length) return kac(s);
    araliklar = araliklar.slice().sort(function (x, y) { return x[0] - y[0]; });
    var o = "", i = 0;
    araliklar.forEach(function (r) { if (r[0] < i) return; o += kac(s.slice(i, r[0])) + "<mark>" + kac(s.slice(r[0], r[1])) + "</mark>"; i = r[1]; });
    return o + kac(s.slice(i));
  }
  function kac(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sayiYaz(n, ondalik) {
    return Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: ondalik || 0, maximumFractionDigits: ondalik || 0 });
  }

  // aramaliSecici(kok, ayar) — uygulamadaki BÜTÜN liste seçimlerinin tek bileşeni.
  // ayar: { kaynak: [kayit], alanlar: function(kayit) -> [ad, kod, …ek aranan alanlar],
  //         kod: function(kayit) -> kod/barkod, alt: function(kayit) -> ikinci satır,
  //         ek: function(kayit) -> sağ sütun HTML (stok, bakiye), etiket: "cari",
  //         yeni: function(yazilan) (varsa "+ Yeni … aç" satırı), sec: function(kayit),
  //         secili: kayit, son: [kayit] (boşken gösterilen son kullanılanlar), enCok: 50 }
  function aramaliSecici(kok, ayar) {
    var enCok = ayar.enCok || 50, etkin = 0, sonuc = [], secili = ayar.secili || null;
    kok.classList.add("erp-ara");
    kok.innerHTML = '<div class="erp-ara__kutu">' + ikon("i-search") + '<input class="erp-input" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list"><button type="button" class="erp-ara__temizle" aria-label="Seçimi temizle" hidden>' + ikon("i-close") + '</button></div><div class="erp-ara__liste" role="listbox" hidden></div>';
    var giris = kok.querySelector("input"), liste = kok.querySelector(".erp-ara__liste"), temizle = kok.querySelector(".erp-ara__temizle");
    if (ayar.id) giris.id = ayar.id;
    giris.placeholder = ayar.ipucu || "Yaz: ad, kod ya da içinde geçen kelime";
    function etiketYaz(k) { var a = ayar.alanlar(k); var kd = ayar.kod ? ayar.kod(k) : ""; return (kd ? kd + " · " : "") + a[0]; }
    function goster() {
      var q = giris.value.trim();
      var adaylar = q ? ayar.kaynak : (ayar.son && ayar.son.length ? ayar.son : ayar.kaynak);
      sonuc = [];
      adaylar.forEach(function (k) {
        var alanlar = ayar.alanlar(k), kd = ayar.kod ? ayar.kod(k) : null;
        var e = eslesme(q, [alanlar[0], kd || ""].concat(alanlar.slice(1)), kd);
        if (e) sonuc.push({ k: k, e: e });
      });
      if (q) sonuc.sort(function (x, y) { return y.e.puan - x.e.puan; });
      // Okutulan barkod/kod birebir tutuyorsa liste açılmadan seçilir.
      if (q && sonuc.length && sonuc[0].e.puan >= 100 && ayar.kod && katla(ayar.kod(sonuc[0].k)) === katla(q) && ayar.barkodlaSec !== false) { sec(sonuc[0].k); return; }
      var gorunen = sonuc.slice(0, enCok); etkin = 0;
      var html = !q && ayar.son && ayar.son.length ? '<div class="erp-ara__bilgi">Son kullanılanlar</div>' : "";
      html += gorunen.map(function (r, i) {
        var alanlar = ayar.alanlar(r.k), kd = ayar.kod ? ayar.kod(r.k) : "";
        var v0 = r.e.vurgular.filter(function (v) { return v[0] === 0; }).map(function (v) { return [v[1], v[2]]; });
        var v1 = r.e.vurgular.filter(function (v) { return v[0] === 1; }).map(function (v) { return [v[1], v[2]]; });
        var alt = ayar.alt ? ayar.alt(r.k) : "";
        return '<div class="erp-ara__satir" role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '"><span class="erp-ara__ad">' + (kd ? '<span class="erp-ara__kod">' + vurgula(kd, v1) + "</span>" : "") + vurgula(alanlar[0], v0) + (alt ? '<span class="erp-ara__alt">' + kac(alt) + "</span>" : "") + '</span><span class="erp-ara__ek">' + (ayar.ek ? ayar.ek(r.k) : "") + "</span></div>";
      }).join("");
      if (q && !sonuc.length) html += '<div class="erp-ara__bilgi">"' + kac(q) + '" ile eşleşen ' + (ayar.etiket || "kayıt") + " yok.</div>";
      if (sonuc.length > enCok) html += '<div class="erp-ara__bilgi">' + (sonuc.length - enCok) + " sonuç daha var; yazmaya devam et.</div>";
      if (ayar.yeni && q) html += '<button type="button" class="erp-ara__yeni" data-yeni="1">' + ikon("i-plus") + '"' + kac(q) + '" adıyla yeni ' + (ayar.etiket || "kayıt") + " aç</button>";
      liste.innerHTML = html; liste.hidden = false; giris.setAttribute("aria-expanded", "true");
    }
    function kapat() { liste.hidden = true; giris.setAttribute("aria-expanded", "false"); }
    function sec(k) { secili = k; giris.value = etiketYaz(k); temizle.hidden = false; kapat(); if (ayar.sec) ayar.sec(k); }
    function etkinYap(i) {
      var satirlar = liste.querySelectorAll(".erp-ara__satir"); if (!satirlar.length) return;
      etkin = (i + satirlar.length) % satirlar.length;
      satirlar.forEach(function (s, j) { s.setAttribute("aria-selected", String(j === etkin)); });
      satirlar[etkin].scrollIntoView({ block: "nearest" });
    }
    giris.addEventListener("focus", function () { if (secili) giris.select(); else goster(); });
    giris.addEventListener("input", function () { secili = null; temizle.hidden = !giris.value; goster(); });
    giris.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (liste.hidden) goster(); else etkinYap(etkin + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); etkinYap(etkin - 1); }
      else if (e.key === "Enter") { if (!liste.hidden && sonuc[etkin]) { e.preventDefault(); sec(sonuc[etkin].k); } }
      else if (e.key === "Escape") { if (!liste.hidden) { e.stopPropagation(); kapat(); } }
    });
    liste.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var y = e.target.closest("[data-yeni]"); if (y) { kapat(); ayar.yeni(giris.value.trim()); return; }
      var s = e.target.closest(".erp-ara__satir"); if (s) sec(sonuc[+s.getAttribute("data-i")].k);
    });
    giris.addEventListener("blur", function () {
      setTimeout(kapat, 120);
      // Seçilmeden bırakılan yazı kayıt sayılmaz: kutu son seçime döner.
      if (!secili) { giris.value = ""; temizle.hidden = true; } else giris.value = etiketYaz(secili);
    });
    temizle.addEventListener("click", function () { secili = null; giris.value = ""; temizle.hidden = true; if (ayar.sec) ayar.sec(null); giris.focus(); });
    if (secili) { giris.value = etiketYaz(secili); temizle.hidden = false; }
    return { sec: sec, deger: function () { return secili; }, odak: function () { giris.focus(); } };
  }

  // ===== TEMA =====
  // Tema Tanımlar › Görünüm'den seçilir: firmanın varsayılanı + kullanıcının kendi seçimi (ayar tablosu).
  // Uygulanması tek satır: <html data-theme="…">. Kod hiçbir yerde renk değeri yazmaz.
  var TEMALAR = [
    { id: "light", ad: "Atölye", aciklama: "Varsayılan. Sıcak nötrler, tek kırmızı aksiyon." },
    { id: "gece", ad: "Gece", aciklama: "Koyu zemin; akşam vardiyası ve loş ortam." },
    { id: "deniz", ad: "Deniz", aciklama: "Soğuk tonlu açık tema, mavi aksiyon." },
    { id: "kontrast", ad: "Yüksek kontrast", aciklama: "Bütün yazılar en az 7:1; zayıf görme ve güneşli atölye." }
  ];
  function temaUygula(id, kok) {
    var gecerli = TEMALAR.some(function (t) { return t.id === id; }) ? id : "light";
    (kok || document.documentElement).setAttribute("data-theme", gecerli);
    return gecerli;
  }

  // ===== MENÜ =====
  // menuHtml([{ tur?, ad, ikon?, kisayol?, pasif?: "neden", tehlike? } | "-" | { baslik }]).
  // Bağlam menüsünde araç çubuğundaki eylemler AYNI sırayla ve aynı adla durur; menüye özel eylem yoktur.
  function menuHtml(ogeler) {
    return '<div class="erp-menu" role="menu">' + ogeler.map(function (o) {
      if (o === "-") return '<div class="erp-menu__ayrac" role="separator"></div>';
      if (o.baslik) return '<div class="erp-menu__baslik">' + kac(o.baslik) + "</div>";
      var tur = o.tur ? EYLEMLER.filter(function (e) { return e.tur === o.tur; })[0] : null;
      var ad = o.ad || (tur && tur.ad) || "", ik = o.ikon || (tur && tur.ikon), ks = o.kisayol || (tur && tur.kisayol) || "";
      var tehlike = o.tehlike || (tur && tur.tehlike);
      return '<button type="button" role="menuitem" class="erp-menu__oge' + (tehlike ? " erp-menu__oge--tehlike" : "") + '"' + (o.pasif ? ' disabled title="' + kac(o.pasif) + '"' : "") + ">" + (ik ? ikon(ik) : "<span></span>") + "<span>" + kac(ad) + '</span><span class="erp-menu__kisayol">' + kac(ks) + "</span></button>";
    }).join("") + "</div>";
  }
  window.Atolye = { IKONLAR: IKONLAR, EYLEMLER: EYLEMLER, KISAYOLLAR: KISAYOLLAR, DURUMLAR: DURUMLAR, ikon: ikon, aracCubugu: aracCubugu, rozet: rozet, bildirimSuresi: bildirimSuresi, ikonlariYerlestir: ikonlariYerlestir, katla: katla, eslesme: eslesme, vurgula: vurgula, sayiYaz: sayiYaz, aramaliSecici: aramaliSecici, TEMALAR: TEMALAR, temaUygula: temaUygula, menuHtml: menuHtml };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { ikonlariYerlestir(); });
  else ikonlariYerlestir();
})();
