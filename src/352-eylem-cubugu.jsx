// ================= EYLEM ÇUBUĞU =================
//
// Kullanıcı (18 Eylül): *"Kaydet, vazgeç butonları uygulamanın her yerinde dağınık. Sağ üstte
// bulunan butonların içinde olsun, zaten el alışkanlığı var... Silme, düzeltme, kaydetme yan yana
// olsun."*
//
// SORUN: her ekran kendi düğmesini kendi yerine koymuştu — kimi formun altında, kimi kartın
// sağında, kimi listenin üstünde. Kullanıcı her ekranda düğmeyi ARAMAK zorundaydı; en sık yapılan
// işlem (kaydet) en çok aranan şey haline gelmişti.
//
// ÇÖZÜM: tek bileşen, iki yerde. Tam ekran pencerede BAŞLIK ÇUBUĞUNUN sağında (Kapat/Küçült'ün
// solunda), gömülü kartlarda kartın kendi başlığının sağında. İkisinde de aynı sıra, aynı renk.
//
// SIRA — soldan sağa: Kaydet · Düzenle · Sil. Yıkıcı olan (Sil) en sağda DEĞİL: kapatma refleksiyle
// sağ üst köşeye giden parmak Sil'e çarpmasın diye Kapat'tan uzağa, dizinin başına konuyor.
//
// KAYDET İKİ YERDE OLABİLİR: uzun formda kullanıcı aşağıdayken "doldurdum, şimdi ne yapacağım"
// anında göz aşağıdadır. Aynı eylemin iki yerde durması kafa karıştırmaz; karıştıran şey aynı işin
// iki farklı isimle iki yerde olmasıdır.

// ERP ARAYÜZ STANDARDI (kullanıcı, 20 Eylül — "araç çubuğunu tek parça haline getirin"):
//   Yeni · Kaydet · Düzenle · Kopyala · Sil ┆ Ara · Filtre ⟶ Yenile · Yazdır · Excel ┆ Küçült · Kapat
// Sıra bileşenin İÇİNDE sabit; sayfada olmayan aksiyon listeden çıkar, kalanların sırası
// değişmez. Kullanılamayan aksiyon GİZLENMEZ — `disabled` verilir ve `title` nedenini yazar.
//
// Sıra numarası: eylemler hangi sırada verilirse verilsin bu tabloya göre dizilir.
const EYLEM_TURLERI = {
  yeni:    { ad: "Yeni",     sira: 10, ikon: "i-plus", renk: "var(--erp-primary-2)", dolgu: "var(--erp-primary)", kisayol: "Ctrl+N" },
  kaydet:  { ad: "Kaydet",   sira: 20, ikon: "i-save", renk: "var(--erp-primary-2)", dolgu: "var(--erp-primary)", kisayol: "Ctrl+S" },
  duzenle: { ad: "Düzenle",  sira: 30, ikon: "i-edit", renk: "var(--erp-info)", dolgu: null,      kisayol: "F2" },
  kopyala: { ad: "Kopyala",  sira: 40, ikon: "i-copy", renk: "var(--erp-info)", dolgu: null,      kisayol: null },
  sil:     { ad: "Sil",      sira: 50, ikon: "i-trash", renk: "var(--erp-danger)", dolgu: null,      kisayol: "Del" },
  ara:     { ad: "Ara",      sira: 60, ikon: "i-search", renk: "var(--erp-text-2)", dolgu: null,      kisayol: null },
  filtre:  { ad: "Filtre",   sira: 70, ikon: "i-filter", renk: "var(--erp-text-2)", dolgu: null,      kisayol: null },
  yenile:  { ad: "Yenile",   sira: 80, ikon: "i-refresh", renk: "var(--erp-text-2)", dolgu: null,      kisayol: "F5" },
  yazdir:  { ad: "Yazdır",   sira: 90, ikon: "i-print", renk: "var(--erp-text-2)", dolgu: null,      kisayol: null },
  excel:   { ad: "Excel",    sira: 100, ikon: "i-export", renk: "var(--erp-text-2)", dolgu: null,     kisayol: null },
  vazgec:  { ad: "Vazgeç",   sira: 110, ikon: "i-close", renk: "var(--erp-text-2)", dolgu: null,     kisayol: "Esc" },
};

// eylemler: [{ tur, ad?, ikon?, onClick, gizli?, pasif?, ipucu? }]
// `tur` bilinen bir eylemse adı ve rengi oradan gelir; `ad` verilirse o kazanır.
function EylemCubugu({ eylemler, kucuk }) {
  // `gizli` artık YOK SAYILIYOR: standarda göre kullanılamayan aksiyon disabled olur, kaybolmaz.
  // Sıralama tablodan; bilinmeyen türler sona.
  //
  // PENCERE BAŞLIĞINDA "VAZGEÇ" YOK (23 Eylül, v1.430.0 — kullanıcı: "kapatma butonu 2 tane var").
  // Başlıkta zaten "Kapat" var; Vazgeç ikon olarak (X) çizilince YAN YANA İKİ KAPATMA görünüyordu
  // ve hangisinin ne yaptığı belirsizdi (ikisi de kaydetmeden çıkar). Vazgeç formun kendi
  // altındaki düğmede duruyor; Esc kısayolu da çalışmaya devam ediyor (kısayol çubuğa değil,
  // bildirilen eylem listesine bakıyor).
  const liste = (eylemler || [])
    .filter((e) => e && e.onClick)
    .filter((e) => !(kucuk && e.tur === "vazgec"))
    .sort((a, b) => ((EYLEM_TURLERI[a.tur] || {}).sira || 999) - ((EYLEM_TURLERI[b.tur] || {}).sira || 999));
  if (liste.length === 0) return null;
  return (
    <span data-eylem-cubugu="1" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {liste.map((e, i) => {
        const tur = EYLEM_TURLERI[e.tur] || {};
        const ad = e.ad || tur.ad || "";
        const dolgulu = !!tur.dolgu;
        return (
          // ERP STANDARDI (20 Eylül, dosyalar geldi): tüm aksiyon ikonlarının tek sınıfı
          // `.erp-ib` (30×30, mobilde 44×44), ikon sprite'tan (#i-save gibi). Yazı yok — ad ve
          // kısayol title'da; ekran okuyucu için aria-label. Kaydet birincil (kırmızı dolgu),
          // Sil tehlike (hover'da kırmızı). Standart: sayfada tek dolu kırmızı buton.
          <button
            key={e.tur || ad || i}
            type="button"
            className={`erp-ib${tur.dolgu ? " erp-ib--primary" : ""}${e.tur === "sil" ? " erp-ib--danger" : ""}`}
            data-eylem={e.tur || ad}
            disabled={!!e.pasif}
            aria-label={ad}
            title={(e.pasif && e.ipucu) ? e.ipucu : `${ad}${tur.kisayol ? ` · ${tur.kisayol}` : ""}`}
            onClick={e.onClick}
          >
            {tur.ikon
              ? <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><use href={`#${tur.ikon}`} /></svg>
              : (e.ikon || <span style={{ fontSize: 11, fontWeight: 700 }}>{ad}</span>)}
          </button>
        );
      })}
    </span>
  );
}

// PENCERE EYLEMLERİ KAYDI
//
// Tam ekran pencerenin başlığı App'te tek yerde çizilir, içeriği ise modülün kendisidir. Modülün
// eylemlerini başlığa taşımak için prop zinciri kurmak, her modülü ayrı ayrı değiştirmek demekti.
// Onun yerine küçük bir kayıt: modül `pencereEylemleriBildir(pencereId, eylemler)` der, başlık
// okur. Abonelik React state'ini tetikliyor, yoksa başlık yenilenmezdi.
const _pencereEylemleri = new Map();
const _pencereEylemDinleyicileri = new Set();

function pencereEylemleriBildir(pencereId, eylemler) {
  if (!pencereId) return;
  if (!eylemler || eylemler.length === 0) _pencereEylemleri.delete(pencereId);
  else _pencereEylemleri.set(pencereId, eylemler);
  _pencereEylemDinleyicileri.forEach((f) => f());
}

function pencereEylemleriOku(pencereId) {
  return _pencereEylemleri.get(pencereId) || [];
}

function pencereEylemAbone(f) {
  _pencereEylemDinleyicileri.add(f);
  return () => _pencereEylemDinleyicileri.delete(f);
}


// KLAVYE KISAYOLLARI (ERP standardı: "Ctrl+S, F2, Del, F5, Esc çalışıyor").
//
// Aktif pencerenin eylem çubuğundaki işlere bağlanır. Kısayol yalnız o iş ÇUBUKTA VARSA ve
// pasif değilse çalışır — çubukta olmayan bir işi klavyeden tetiklemek, kullanıcının ekranda
// görmediği bir şeyi yapmak olurdu.
//
// Tarayıcı varsayılanları engelleniyor: Ctrl+S "sayfayı kaydet" penceresi açıyor, F5 sayfayı
// yeniliyordu — bir ERP'de ikisi de felaket (form kaybolur).
//
// Yazı alanı içindeyken Del ve Esc'e dokunulmuyor: kullanıcı metin siliyor ya da açılır listeyi
// kapatıyor olabilir.
function kisayolEylemi(e, eylemler) {
  const yaziAlaninda = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")
    || (e.target && e.target.isContentEditable);
  const bul = (tur) => (eylemler || []).find((x) => x && x.tur === tur && x.onClick && !x.pasif);
  let hedef = null;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") hedef = bul("kaydet");
  else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "n") hedef = bul("yeni");
  else if (e.key === "F2") hedef = bul("duzenle");
  else if (e.key === "F5") hedef = bul("yenile");
  else if (e.key === "Delete" && !yaziAlaninda) hedef = bul("sil");
  else if (e.key === "Escape" && !yaziAlaninda) hedef = bul("vazgec");
  return hedef;
}
