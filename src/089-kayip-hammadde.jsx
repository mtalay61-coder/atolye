// ================= REÇETEDE OLUP STOKTA OLMAYAN HAMMADDE — ONARIM (3 Ekim, v1.556.0) =================
//
// Kullanıcı: "Jut stoğu açtım ve reçeteye ekledim, Jut'u silmedim ama stokta görünmüyor; mamul reçetede
// görünüyor." Sebep yazma katmanındaydı (025/040: internetsizken açılan ürün buluta hiç gitmedi, fark
// belleği "gitti" sandı) — o açık kapatıldı. Bu dosya ZATEN kaybolmuş olanları geri kurar: reçete satırı
// hammaddenin KİMLİĞİNİ, adını, birimini, rengini ve boyunu taşıyor. Ürün AYNI KİMLİKLE yeniden açılınca
// reçete bağı kendiliğinden yerine oturur (reçete hiç değiştirilmez). Fiyat, tedarikçi, stok no gibi
// reçetede olmayan bilgiler boş gelir — kullanıcı tamamlar; stok miktarı 0 (hareketi yoksa doğrusu bu).

// Saf. Döner: [{ id, ad, birim, renkler: [..], bedenler: [..], kullananlar: [mamul adları] }] — ada göre sıralı.
function kayipHammaddeler(stok) {
  const varIdler = new Set((stok || []).map((u) => u && u.id));
  const harita = new Map();
  (stok || []).forEach((u) => (u.recete || []).forEach((r) => {
    const id = r && r.hammaddeUrunId;
    if (!id || varIdler.has(id)) return;
    if (!harita.has(id)) harita.set(id, { id, ad: r.hammaddeAd || "?", birim: r.birim || "", renkler: new Set(), bedenler: new Set(), kullananlar: new Set() });
    const h = harita.get(id);
    if (r.renk) h.renkler.add(r.renk);
    if (r.beden) h.bedenler.add(r.beden);
    if (!h.birim && r.birim) h.birim = r.birim;
    h.kullananlar.add(u.ad || u.id);
  }));
  return Array.from(harita.values())
    .map((h) => ({ ...h, renkler: Array.from(h.renkler).sort(), bedenler: Array.from(h.bedenler).sort(), kullananlar: Array.from(h.kullananlar).sort() }))
    .sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
}

// Kayıp hammaddeyi stok kartı olarak kurar (aynı kimlik). Renk yoksa ölçüsüz tek satır ("Standart" yer tutucu
// değil, boş renk — reçete satırı da renksizse eşleşme boşla). Boy varsa her renk × boy.
function kayipHammaddeKarti(h) {
  const renkler = h.renkler.length ? h.renkler : [""];
  const bedenler = h.bedenler.length ? h.bedenler : [""];
  const variants = [];
  renkler.forEach((renk) => bedenler.forEach((beden) => variants.push({ renk, beden, miktar: 0 })));
  return {
    id: h.id, ad: h.ad, kategori: "Hammadde", birim: h.birim || "adet",
    olcuTipi: h.bedenler.length ? "Boyut" : "Serbest",
    variants, hareketler: [], recete: [], alisFiyati: 0,
    // Nereden geldiği kartta görünsün: kullanıcı fiyat/tedarikçi gibi boş alanları tamamlaması gerektiğini bilsin.
    not: `Reçetelerden geri kuruldu (${new Date().toLocaleDateString("tr-TR")}) — fiyat, tedarikçi ve stok bilgisini kontrol edin.`,
    geriKuruldu: true,
  };
}
