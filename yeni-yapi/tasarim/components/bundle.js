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
  window.Atolye = { IKONLAR: IKONLAR, EYLEMLER: EYLEMLER, KISAYOLLAR: KISAYOLLAR, DURUMLAR: DURUMLAR, ikon: ikon, aracCubugu: aracCubugu, rozet: rozet, bildirimSuresi: bildirimSuresi, ikonlariYerlestir: ikonlariYerlestir };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { ikonlariYerlestir(); });
  else ikonlariYerlestir();
})();
