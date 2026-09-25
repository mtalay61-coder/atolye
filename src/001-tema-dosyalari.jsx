// ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: src/tema/erp-tokens.css, src/tema/erp-icons.svg (tema-gom.js)
const ERP_TOKENS_CSS = `/* ERP arayüz standardı — tek dosya token seti
   Uygulamanın en üstünde, kendi CSS'inizden ÖNCE yükleyin. */

@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&display=swap");

:root {
  /* Tipografi */
  --erp-font: "Archivo", system-ui, sans-serif;

  /* Arayüz nötrleri (sıcak) */
  --erp-text: #24201b;
  --erp-text-2: #6d6357;
  --erp-text-3: #8b8073;
  --erp-line: #c8bcac;
  --erp-line-soft: #e0d6c7;

  /* Arka plan katmanları */
  --erp-shell: #2f2620;        /* yan menü */
  --erp-shell-2: #3d332a;      /* aktif menü öğesi */
  --erp-shell-ink: #e8ded1;    /* menü yazısı */
  --erp-topbar: #fbf7f1;       /* üst çubuk */
  --erp-page: #f6f1ea;         /* sayfa zemini */
  --erp-panel: #fffdf9;        /* panel, tablo, kart */
  --erp-zebra: #f2ece3;        /* şerit satır */
  --erp-hover: #ece4d9;        /* satır hover */
  --erp-head: #eee6da;         /* tablo başlığı */

  /* Aksiyon */
  --erp-accent: #ec3013;
  --erp-accent-hover: #dd2b0f;
  --erp-accent-press: #ae1800;
  --erp-accent-tint: #ffe0d9;  /* seçili satır */

  /* Durum */
  --erp-ok: #55702b;   --erp-ok-tint: #e7ecd6;
  --erp-wait: #a1651a; --erp-wait-tint: #f7e7cd;
  --erp-info: #2f6b6b; --erp-info-tint: #dbe9e5;
  --erp-idle: #4b4339; --erp-idle-tint: #eee6da;
  --erp-void: #ae1800; --erp-void-tint: #ffe0d9;

  /* Ölçü */
  --erp-toolbar-h: 44px;
  --erp-row-h: 30px;
  --erp-icon-btn: 30px;
  --erp-icon: 16px;
  --erp-radius: 0px;
}

body { font-family: var(--erp-font); color: var(--erp-text); background: var(--erp-page); }

/* İkon butonu — tüm aksiyon ikonlarının tek sınıfı */
.erp-ib {
  display: grid; place-items: center;
  width: var(--erp-icon-btn); height: var(--erp-icon-btn);
  padding: 0; border: 1px solid transparent; border-radius: var(--erp-radius);
  background: transparent; color: var(--erp-text); cursor: pointer;
}
.erp-ib svg { width: var(--erp-icon); height: var(--erp-icon); }
.erp-ib:hover { background: var(--erp-hover); }
.erp-ib:active { background: var(--erp-line-soft); }
.erp-ib:focus-visible { outline: 2px solid var(--erp-accent); outline-offset: 1px; }
.erp-ib[disabled] { opacity: .35; cursor: not-allowed; }
.erp-ib--primary { background: var(--erp-accent); color: #fff; }
.erp-ib--primary:hover { background: var(--erp-accent-hover); }
/* PENCERE BAŞLIĞINDA (koyu bordo/renkli şerit) DOLGULU KAYDET SIRITIYORDU (23 Eylül, v1.430.0 —
   kullanıcı: "kaydet bordo renkte kırmızı sırıtıyor"). Başlık zaten renkli bir zemin; üstüne
   ikinci bir kırmızı dolgu koymak iki kırmızıyı çakıştırıyor. Şeritte buton saydam duruyor,
   ikon beyaz; üzerine gelince hafif beyaz perde. Sayfa içi çubuklarda dolgu aynen kalıyor. */
.erp-pencere-baslik .erp-ib { color: #fff; }
.erp-pencere-baslik .erp-ib--primary { background: rgba(255,255,255,0.16); color: #fff; }
.erp-pencere-baslik .erp-ib--primary:hover { background: rgba(255,255,255,0.30); }
.erp-pencere-baslik .erp-ib:hover { background: rgba(255,255,255,0.18); }
.erp-ib--danger:hover { background: var(--erp-accent); color: #fff; }

/* Araç çubuğu */
.erp-toolbar {
  display: flex; align-items: center; gap: 4px;
  height: var(--erp-toolbar-h); padding: 0 8px;
  background: var(--erp-topbar); border-bottom: 2px solid var(--erp-line);
}
.erp-toolbar__sep { width: 1px; height: 22px; background: var(--erp-line); margin: 0 6px; }
.erp-toolbar__gap { flex: 1; }

/* Tablo */
.erp-table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--erp-panel); }
.erp-table th {
  height: var(--erp-row-h); padding: 0 10px; text-align: left;
  font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
  background: var(--erp-head); border-bottom: 2px solid var(--erp-line);
}
.erp-table td { height: var(--erp-row-h); padding: 0 10px; border-bottom: 1px solid var(--erp-line-soft); }
.erp-table tbody tr:nth-child(even) { background: var(--erp-zebra); }
.erp-table tbody tr:hover { background: var(--erp-hover); }
.erp-table tbody tr[aria-selected="true"] { background: var(--erp-accent-tint); }
.erp-num { text-align: right; font-variant-numeric: tabular-nums; }

/* Durum rozeti — renk + ikon + metin birlikte */
.erp-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 7px; font-size: 11px; font-weight: 600;
  background: var(--erp-idle-tint); color: var(--erp-idle);
}
.erp-badge svg { width: 12px; height: 12px; }
.erp-badge--ok   { background: var(--erp-ok-tint);   color: var(--erp-ok); }
.erp-badge--wait { background: var(--erp-wait-tint); color: var(--erp-wait); }
.erp-badge--info { background: var(--erp-info-tint); color: var(--erp-info); }
.erp-badge--void { background: var(--erp-void-tint); color: var(--erp-void); }

/* Uygulama iskeleti */
.erp-shell { display: grid; grid-template-columns: 176px minmax(0, 1fr); min-height: 100vh; }
.erp-nav { background: var(--erp-shell); color: var(--erp-shell-ink); padding: 12px 0; }
.erp-nav a { display: block; padding: 7px 12px; font-size: 12.5px; color: inherit; opacity: .72; text-decoration: none; }
.erp-nav a:hover { opacity: 1; background: var(--erp-shell-2); }
.erp-nav a[aria-current="page"] { opacity: 1; color: #fff; font-weight: 600; background: var(--erp-shell-2); box-shadow: inset 3px 0 0 var(--erp-accent); }
.erp-main { background: var(--erp-page); }
.erp-panel { background: var(--erp-panel); border: 1px solid var(--erp-line); }

/* Mobil: dokunma ölçüsü */
@media (max-width: 720px) {
  :root { --erp-icon-btn: 44px; --erp-icon: 18px; --erp-row-h: 44px; --erp-toolbar-h: 52px; }
  .erp-shell { grid-template-columns: 1fr; }
}
`;
const ERP_ICONS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
<defs>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M12 5v14"></path></symbol>
<symbol id="i-save" viewBox="0 0 24 24"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path></symbol>
<symbol id="i-edit" viewBox="0 0 24 24"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></symbol>
<symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></symbol>
<symbol id="i-print" viewBox="0 0 24 24"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect></symbol>
<symbol id="i-export" viewBox="0 0 24 24"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></symbol>
<symbol id="i-collapse" viewBox="0 0 24 24"><path d="m7 20 5-5 5 5"></path><path d="m7 4 5 5 5-5"></path></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></symbol>
<symbol id="i-undo" viewBox="0 0 24 24"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13"></path></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M21.8 10A10 10 0 1 1 17 3.34"></path><path d="m9 11 3 3L22 4"></path></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></symbol>
<symbol id="i-back" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></symbol>
<symbol id="i-ban" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="m4.9 4.9 14.2 14.2"></path></symbol>
<symbol id="i-draft" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></symbol>
</defs>
</svg>`;
