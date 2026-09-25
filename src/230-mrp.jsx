function mrpHesapla(siparisler, stok, uretim, sadeceUretimPlanli) {
  // Sadece "İptal" olmayan ve hâlâ karşılanmamış kalemi bulunan satış siparişleri dikkate alınır.
  const bekleyenSatislar = (siparisler || []).filter((s) => s.tip === "Satış" && s.durum !== "İptal");
  const ihtiyacGruplari = {}; // "hammaddeUrunId|renk|beden" -> { hammaddeUrunId, hammaddeAd, renk, beden, birim, gereken, kaynaklar: [...] }

  // Bir üretim siparişindeki belirli bir proses adımının TAMAMLANIP TAMAMLANMADIĞINI bulur — tamamlandıysa
  // bu prosese ait reçete satırının hammaddesi ZATEN tüketilmiştir (bkz. kural 2 yukarıda).
  function prosesTamamlandiMi(uretimSiparisNo, prosesAdi) {
    const bagliUretim = (uretim || []).find((o) => o.siparisNo === uretimSiparisNo);
    if (!bagliUretim) return false; // üretim silinmiş/bulunamıyor — güvenli tarafta kal, henüz tüketilmedi say
    const adim = (bagliUretim.prosesIlerleme || []).find((p) => p.proses === prosesAdi);
    return !!(adim && adim.tamamlandiMi);
  }

  bekleyenSatislar.forEach((s) => {
    s.kalemler.forEach((k) => {
      const kalan = k.miktar - (k.karsilanan || 0);
      if (kalan <= 0) return;
      // KURAL 1: Satınalmaya planlanmış kalemler hammadde tüketmez — hariç tutulur.
      if (k.planlama && k.planlama.tip === "Satınalma") return;
      // "Sipariş İhtiyaç Planlama" (sadeceUretimPlanli) modunda, HENÜZ planlanmamış kalemler de hariç
      // tutulur — bu görünüm SADECE zaten aktif bir üretim emrine bağlanmış mamüllerle ilgilenir.
      if (sadeceUretimPlanli && (!k.planlama || k.planlama.tip !== "Üretim")) return;
      const urun = stok.find((p) => p.id === k.urunId);
      if (!urun || urun.kategori !== "Mamul" || !urun.recete || urun.recete.length === 0) return;
      const eslesenler = urun.recete.filter(
        (r) => r.mamulRenk === k.renk && (r.mamulBeden === k.beden || r.mamulBeden === "Tüm Bedenler")
      );
      eslesenler.forEach((r) => {
        // KURAL 2: Üretime planlanmışsa ve bu prosesin hammaddesi zaten tüketildiyse, tekrar sayma.
        if (k.planlama && k.planlama.tip === "Üretim" && r.proses && prosesTamamlandiMi(k.planlama.referansNo, r.proses)) {
          return;
        }
        const tuketilecek = Math.round(r.miktar * kalan * 100) / 100;
        if (!(tuketilecek > 0)) return;
        // Siparişte kutu seçilmişse reçetedeki ambalaj satırının rengi onunla değiştirilir —
        // ihtiyaç, satın alma ve rezervasyon GERÇEKTEN kullanılacak renk üzerinden hesaplanır.
        // Reçetedeki renge bakmak, siparişe özel kutunun stok durumunu hiç görmemek demekti.
        const etkinRenk = ambalajRengiUygula(r, s, stok, k);
        const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}`;
        if (!ihtiyacGruplari[anahtar]) {
          ihtiyacGruplari[anahtar] = {
            hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, renk: etkinRenk, beden: r.beden,
            birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), gereken: 0, kaynaklar: [],
          };
        }
        ihtiyacGruplari[anahtar].gereken = Math.round((ihtiyacGruplari[anahtar].gereken + tuketilecek) * 100) / 100;
        ihtiyacGruplari[anahtar].kaynaklar.push({
          siparisId: s.id, siparisNo: s.siparisNo, urunAd: k.urunAd, kalemRenk: k.renk, kalemBeden: k.beden, adet: kalan,
          // hammaddeMiktar: bu sipariş kaleminin, BU hammadde hücresine (renk+beden) yaptığı GERÇEK
          // hammadde katkısı. `adet` mamul adedidir — rezervasyon payını mamul adedine göre dağıtmak
          // yanlış olurdu (aynı mamulün farklı renkleri farklı reçete miktarı tüketebilir). Satın alma
          // rezervasyonu bu alan üzerinden, tüketim oranıyla orantılı dağıtılır.
          hammaddeMiktar: tuketilecek,
          planliMi: !!k.planlama, planTipi: k.planlama ? k.planlama.tip : null,
          uretimSiparisNo: k.planlama && k.planlama.tip === "Üretim" ? k.planlama.referansNo : null,
        });
      });
    });
  });

  // ---- EKSİ STOK BİR İHTİYAÇ DEĞİL, BİR KAYIT HATASIDIR ---------------------------------------
  //
  // Kullanıcı (7 Eylül): "Eksi stoklar için tedarik aslında mantıksız, çünkü eksi stok olamaz;
  // yoktan var olamaz. Eksi stoğu ihtiyaç için değil, DEĞERLENDİRME için kullanalım."
  //
  // Malzeme fiziksel olarak eksiye düşemez. `Taban −112` demek "112 taban borçluyum" değil,
  // "112 tabanın GİRİŞİNİ yapmamışım ama tüketmişim" demektir. Yani gerçek stok BİLİNMİYOR:
  // 0 da olabilir, 300 de.
  //
  // Bu yüzden eksi değerden satın alma miktarı türetilmez — `−112` görüp 112 sipariş etmek,
  // zaten depoda duran malı ikinci kez almak olabilir. (6 Eylül'de eksi stok ihtiyaca EKLENMİŞTİ;
  // o günkü asıl şikâyet "görünmüyor" idi. Görünmesi doğru, satın almaya dönüşmesi yanlış.)
  //
  // İki karar birlikte uygulanıyor (kullanıcı ikisini de seçti):
  //   SIFIR SAY   → hesapta eksi değer 0 kabul edilir. "Elimde hiç yok" varsayımı; en fazla
  //                 ihtiyacı olduğundan az gösterir, asla fazla sipariş ürettirmez.
  //   İŞARETLE    → satır "stok bilinmiyor, sayım gerekli" diye damgalanır. Sayı veriliyor ki iş
  //                 tıkanmasın, ama sayının güvenilmez olduğu ekranda yazılı.
  //
  // Sipariş talebi olmayan eksi stoklu kalemler de listeye giriyor: miktar üretmiyorlar (gereken 0,
  // stok 0 sayıldığı için eksik de 0) ama SAYIM UYARISI olarak görünüyorlar.
  //
  // KAPSAM hammadde ve yarı mamul: bu ekran SATIN ALMA planlaması yapıyor. Eksiye düşmüş bir
  // MAMUL satın alınmaz, üretilir — o ayrı bir ekranın işi.
  (stok || []).forEach((p) => {
    if (p.kategori !== "Hammadde" && p.kategori !== "Yarı Mamul") return;
    (p.variants || []).forEach((v) => {
      if ((v.miktar || 0) >= 0) return;
      const anahtar = `${p.id}|${v.renk}|${v.beden}`;
      if (ihtiyacGruplari[anahtar]) return;
      ihtiyacGruplari[anahtar] = {
        hammaddeUrunId: p.id, hammaddeAd: p.ad, renk: v.renk, beden: v.beden,
        birim: p.birim || "", gereken: 0,
        // KAYNAK BOŞ DEĞİL: "bu satır neden burada" sorusunun cevabı satırın kendisinde dursun.
        // Sipariş kaynaklı satırlarda kaynak sipariştir; burada eksi stoğun kendisi.
        kaynaklar: [],
        eksiStoktan: true,
      };
    });
  });

  return Object.values(ihtiyacGruplari).map((g) => {
    const hammaddeUrun = stok.find((p) => p.id === g.hammaddeUrunId);
    const hamStok = hammaddeUrun ? ((hammaddeUrun.variants.find((v) => v.renk === g.renk && v.beden === g.beden) || {}).miktar || 0) : 0;
    // EKSİ STOK SIFIR SAYILIR (bkz. yukarıdaki gerekçe). Ham değer ayrıca taşınıyor: ekranda
    // "kaydın kaç eksiye düştüğü" gösterilecek, çünkü sayımı yapacak kişi o sayıyı arayacak.
    const stokBilinmiyor = hamStok < 0;
    const mevcutStok = stokBilinmiyor ? 0 : hamStok;
    const alisFiyati = (hammaddeUrun && hammaddeUrun.alisFiyati) || 0;
    const minStok = hammaddeUrun ? ((hammaddeUrun.variants.find((v) => v.renk === g.renk && v.beden === g.beden) || {}).minStok || 0) : 0;
    const fark = Math.round((mevcutStok - g.gereken) * 100) / 100;
    const eksikMiktar = fark < 0 ? Math.abs(fark) : 0;
    return {
      ...g, mevcutStok, hamStok, stokBilinmiyor, minStok, alisFiyati, fark, eksikMi: fark < 0,
      eksikMiktar, eksikMaliyet: Math.round(eksikMiktar * alisFiyati * 100) / 100,
    };
  }).sort((a, b) => (a.eksikMi === b.eksikMi ? b.eksikMaliyet - a.eksikMaliyet || b.gereken - a.gereken : a.eksikMi ? -1 : 1));
}

// "Planlama" ana sekmesi, alt sekmelerden oluşur — şu an sadece "Hammadde İhtiyaç" (MRP) var, ama
// yapı, ileride "Merkezi Tedarik Planlama" gibi başka alt sekmeler eklemeye hazır şekilde kuruldu.
function PlanlamaModule({ siparisler, stok, uretim, cariler, asortiler, onGoToSiparis, onGoToUrun, onGoToUretim, onPlanlaUretim, onPlanlaSatinAlma, onPlanlaHammaddeSatinAlma, onPlanlamaTemizle, onAsortiOlustur }) {
  const [altSekme, setAltSekme] = useState("siparisPlanlama");
  const ALT_SEKMELER = [
    { key: "siparisPlanlama", label: "Sipariş Planlama" },
    { key: "siparisIhtiyac", label: "Sipariş İhtiyaç Planlama" },
    { key: "hammadde", label: "Hammadde İhtiyaç" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid #E4D8C0", paddingBottom: 10 }}>
        {ALT_SEKMELER.map((s) => {
          const aktif = altSekme === s.key;
          const renk = "#B8860B"; // MODUL_RENK.planlama ile aynı — bu bileşen ana bileşenin dışında olduğu için sabit tekrarlanır
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setAltSekme(s.key)}
              style={{
                padding: "7px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${aktif ? renk : "var(--erp-border)"}`,
                background: aktif ? alfaEkle(renk, "1A") : "#fff",
                color: aktif ? renk : "var(--erp-text)",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {altSekme === "siparisPlanlama" && (
        <SiparisPlanlamaSekmesi
          siparisler={siparisler}
          stok={stok}
          cariler={cariler}
          uretim={uretim}
          asortiler={asortiler}
          onGoToSiparis={onGoToSiparis}
          onGoToUretim={onGoToUretim}
          onPlanlaUretim={onPlanlaUretim}
          onPlanlaSatinAlma={onPlanlaSatinAlma}
          onPlanlamaTemizle={onPlanlamaTemizle}
          onAsortiOlustur={onAsortiOlustur}
        />
      )}
      {altSekme === "siparisIhtiyac" && (
        <HammaddeIhtiyacSekmesi
          siparisler={siparisler}
          stok={stok}
          uretim={uretim}
          onGoToSiparis={onGoToSiparis}
          onGoToUrun={onGoToUrun}
          onGoToUretim={onGoToUretim}
          cariler={cariler}
          onPlanlaHammaddeSatinAlma={onPlanlaHammaddeSatinAlma}
          sadeceUretimPlanli
          aciklamaMetni="ZATEN üretime planlanmış (aktif üretim emri açılmış) mamüllerin, henüz karşılanmamış hammadde ihtiyacı — üretime planlanmamış bekleyen kalemler bu görünümde yer almaz (onlar Hammadde İhtiyaç sekmesinde)."
          bosDurumMetni="Üretime planlanmış, henüz karşılanmamış bir hammadde ihtiyacı yok."
        />
      )}
      {altSekme === "hammadde" && (
        <HammaddeIhtiyacSekmesi siparisler={siparisler} stok={stok} uretim={uretim} onGoToSiparis={onGoToSiparis} onGoToUrun={onGoToUrun} onGoToUretim={onGoToUretim} cariler={cariler} onPlanlaHammaddeSatinAlma={onPlanlaHammaddeSatinAlma} />
      )}
    </div>
  );
}

// ---- REZERVASYON DEPOSU ----
// "Şu an ne, kim için ayrılmış?" sorusunun tek ekranda cevabı. Bilgi iki ayrı yerde duruyordu
// (alış kalemleri ve stok defteri) ve hiçbir yerde bir arada görünmüyordu; bir hammaddenin
// serbest miktarını bulmak için siparişleri tek tek açmak gerekiyordu.
// ---- FİRE RAPORU ----
// Tüm üretimlerdeki hurda ve tamir kayıtlarını tarar, istenen boyuta göre gruplar.
// Boyutlar ayrı ayrı anlamlı: proses "nerede kaybediyoruz", personel "kimin işinde",
// model "hangi ürün sorunlu", sebep "neden" sorusunu cevaplar.
function fireOzeti(uretimler, cariler, boyut) {
  const gruplar = {};
  const ekle = (anahtar, tur, adet, ucretKaybi) => {
    if (!gruplar[anahtar]) gruplar[anahtar] = { anahtar, hurda: 0, tamir: 0, ucretKaybi: 0 };
    gruplar[anahtar][tur] += adet;
    gruplar[anahtar].ucretKaybi += ucretKaybi || 0;
  };

  (uretimler || []).forEach((u) => {
    (u.prosesIlerleme || []).forEach((p) => {
      (p.atamalar || []).filter((a) => a.tamamlandiMi).forEach((a) => {
        const s = atamaSonucu(a);
        const personelAdi = ((cariler || []).find((c) => c.id === a.personelId) || {}).unvan || "—";
        const anahtarSec = (sebep) => {
          if (boyut === "proses") return p.proses;
          if (boyut === "personel") return personelAdi;
          if (boyut === "model") return `${u.model} · ${u.renk}`;
          return sebep || "Belirtilmedi";
        };
        s.hurda.forEach((h) => ekle(anahtarSec(h.sebep), "hurda", h.miktar || 0, 0));
        s.tamir.forEach((t) => ekle(anahtarSec(t.sebep), "tamir", t.miktar || 0, (t.ucret || 0) * (t.miktar || 0)));
      });
    });
  });

  const liste = Object.values(gruplar);
  liste.sort((a, b) => (b.hurda + b.tamir) - (a.hurda + a.tamir));
  return liste;
}

function FireRaporu({ uretimler, cariler }) {
  const [boyut, setBoyut] = useState("proses");
  const BOYUTLAR = [
    { key: "proses", ad: "Prosese göre", soru: "Nerede kaybediyoruz?" },
    { key: "personel", ad: "Personele göre", soru: "Kimin işinde fire yüksek?" },
    { key: "model", ad: "Modele göre", soru: "Hangi ürün sorunlu?" },
    { key: "sebep", ad: "Sebebe göre", soru: "Neden oluyor?" },
  ];
  const satirlar = fireOzeti(uretimler, cariler, boyut);
  const toplamHurda = satirlar.reduce((t, s) => t + s.hurda, 0);
  const toplamTamir = satirlar.reduce((t, s) => t + s.tamir, 0);
  const toplamUcret = Math.round(satirlar.reduce((t, s) => t + s.ucretKaybi, 0) * 100) / 100;
  const aktifBoyut = BOYUTLAR.find((b) => b.key === boyut);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px", lineHeight: 1.6 }}>
        Üretimde hurdaya çıkan ve tamire gönderilen çiftler. <b>Hurda</b> tamamen kayıptır —
        harcanan hammadde çöpe gider ve o aşamanın ücreti ödenmez. <b>Tamir</b> kayıp değildir ama
        ek işçilik maliyeti doğurur.
      </p>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {BOYUTLAR.map((b) => {
          const aktif = boyut === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setBoyut(b.key)}
              title={b.soru}
              style={{
                padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${aktif ? "var(--erp-warn)" : "var(--erp-border-2)"}`,
                background: aktif ? "var(--erp-warn)" : "#fff",
                color: aktif ? "var(--erp-panel-2)" : "var(--erp-text-2)",
              }}
            >
              {b.ad}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>hurda {toplamHurda}</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#B8860B" }}>tamir {toplamTamir}</span>
          {toplamUcret > 0 && (
            <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
              tamir işçiliği {toplamUcret.toLocaleString("tr-TR")} ₺
            </span>
          )}
        </span>
      </div>

      {satirlar.length === 0 ? (
        <EmptyState text="Henüz fire kaydı yok. Üretim teslim alınırken hurda ya da tamir girildiğinde burada görünür." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>
                  {aktifBoyut.ad.replace("göre", "").toUpperCase().trim()}
                </th>
                <th style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", color: "var(--erp-warn)" }}>HURDA</th>
                <th style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", color: "#B8860B" }}>TAMİR</th>
                <th style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", color: "var(--erp-text-2)" }}>TOPLAM</th>
                <th style={{ fontSize: 10, textAlign: "right", padding: "5px 8px", color: "var(--erp-text-2)" }}>TAMİR İŞÇİLİĞİ</th>
                <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>PAY</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s, i) => {
                const toplam = s.hurda + s.tamir;
                const pay = toplamHurda + toplamTamir > 0 ? toplam / (toplamHurda + toplamTamir) : 0;
                return (
                  <tr key={i} style={{ borderTop: "1px solid #E4D8C0" }}>
                    <td style={{ fontSize: 12, fontWeight: 600, padding: "5px 8px" }}>{s.anahtar}</td>
                    <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", fontWeight: 700, color: s.hurda > 0 ? "var(--erp-warn)" : "var(--erp-border)" }}>{s.hurda || "—"}</td>
                    <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", fontWeight: 700, color: s.tamir > 0 ? "#B8860B" : "var(--erp-border)" }}>{s.tamir || "—"}</td>
                    <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{toplam}</td>
                    <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", color: "var(--erp-text-2)" }}>
                      {s.ucretKaybi > 0 ? `${Math.round(s.ucretKaybi * 100) / 100} ₺` : "—"}
                    </td>
                    <td style={{ padding: "5px 8px", minWidth: 120 }}>
                      {/* Oran çubuğu: sayıları karşılaştırmak yerine görmek, hangi kalemin baskın
                          olduğunu bir bakışta söyler. */}
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ flex: 1, height: 6, background: "var(--erp-border-2)", borderRadius: "var(--erp-r-sm)", overflow: "hidden", minWidth: 60 }}>
                          <span style={{ display: "block", width: `${Math.round(pay * 100)}%`, height: "100%", background: "var(--erp-warn)" }} />
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", width: 32 }}>%{Math.round(pay * 100)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RezervasyonDeposu({ siparisler, stok, stokRezervasyonlari, uretim, cariler, onGoToSiparis, onGoToUrun, onSatinAlPlanla, onAlisFisi, koliler, tanimlar, onFisAc, showToast }) {
  const [altSekme, setAltSekme] = useState("rezervasyon");
  const [arama, setArama] = useState("");
  // VARSAYILAN "tumu": Depo ekranı açıldığında ilk soru "depomda ne var" — açığı olmayan bir
  // malzemenin görünmemesi, deponun kendisini gizliyordu. Stokta 11 siyah duruyorsa listede
  // olmalı; açık/rezervasyon süzgeçleri isteyen bir adım ötede duruyor.
  const [suzgec, setSuzgec] = useState("tumu"); // "acik" | "rezerveli" | "tumu"

  const satirlar = [];
  (stok || []).forEach((p) => {
    // Mamuller de depoda duruyor: üretilip stoğa alınan ayakkabı da bir depo kalemidir.
    // Eskiden eleniyordu ve "depoda ne var" sorusu yarım cevaplanıyordu. Kategori sütunu
    // ikisini birbirinden ayırıyor, listede olmaları karışıklık yaratmıyor.
    (p.variants || []).forEach((v) => {
      const d = stokDurumu(p.id, v.renk, v.beden, siparisler, stokRezervasyonlari, stok);
      // "DEPODAKİ HER ŞEY" GERÇEKTEN HER ŞEY.
      //
      // Eskiden hareketi olmayan (stok 0, talep 0, yolda 0) renk/bedenler her süzgeçte eleniyordu.
      // Kullanıcı: "şu anda ihtiyacı olmayan ürünler görünmüyor… depoda stoğu olan, stok dahil
      // çeksin, yanında alış ve satın al dursun." Süzgecin adı "depodaki her şey" iken bir kısmını
      // gizlemek sözü tutmamaktı; ayrıca hiç hareketi olmayan bir malzeme için de alış yapılabilir
      // (stok tazeleme, yeni renk açma).
      //
      // Diğer iki süzgeç (açığı olanlar / rezervasyonlu) zaten daraltıcı; eleme onlara bırakıldı.
      if (suzgec !== "tumu") {
        const hareketVar = d.stok !== 0 || d.toplamTalep > 0 || d.yoldaSerbest > 0 || d.yoldaRezerve > 0;
        if (!hareketVar) return;
      }
      if (suzgec === "acik" && d.acikToplam <= 0) return;
      if (suzgec === "rezerveli" && d.toplamTalep <= 0) return;
      satirlar.push({
        urunId: p.id, urunAd: p.ad, birim: p.birim, kategori: p.kategori,
        renk: v.renk, beden: v.beden, ...d,
      });
    });
  });

  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const gorunen = q
    ? satirlar.filter((s) =>
        `${s.urunAd} ${s.renk} ${s.beden} ${s.talepler.map((t) => t.siparisNo || "").join(" ")}`
          .toLocaleLowerCase("tr-TR").includes(q))
    : satirlar;

  // Açığı olanlar üstte: bu ekranda aranan şey satın alınması gereken malzemedir.
  gorunen.sort((a, b) => (b.acikToplam > 0) - (a.acikToplam > 0) || a.urunAd.localeCompare(b.urunAd, "tr"));

  const toplamAcik = stokYuvarla(gorunen.reduce((t, s) => t + s.acikToplam, 0));
  const siparisKumesi = new Set();
  gorunen.forEach((s) => s.talepler.forEach((t) => { if (t.siparisNo) siparisKumesi.add(t.siparisNo); }));

  const SUZGECLER = [
    { key: "acik", ad: "Açığı olanlar", renk: "var(--erp-warn)" },
    { key: "rezerveli", ad: "Rezervasyonlu", renk: "var(--erp-brown)" },
    { key: "tumu", ad: "Depodaki her şey", renk: "var(--erp-text-2)" },
  ];

  return (
    <div>
      {/* MODÜL BAŞLIĞI KALDIRILDI (kullanıcı, 12 Eylül: "Depo'nun yarısına yakını arama, sekme vs."):
          App zaten üst şeritte "Depo" basıyor (TAB_TITLES); burada ikinci kez 20px başlık +
          açıklama iki satır yer kaplıyordu. Açıklama sekmenin ipucunda.

          Depo iki soruya bakar: "elimde ne var, kime söz verilmiş" ve "ne kadarını kaybediyoruz".
          İkisi de malzemenin akıbetiyle ilgili; ayrı modüllere bölmek yerine sekme yeterli. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, borderBottom: "1px solid #E4D8C0", alignItems: "center", flexWrap: "wrap" }}>
        {[
          // DEPO İKİYE AYRILDI. Hammadde "ne almalıyım", mamul "ne üretmeliyim" sorusunu
          // cevaplıyor; ikisi aynı listede karışınca bakan kişi hangi soruya baktığını
          // unutuyordu.
          { key: "rezervasyon", ad: "Hammadde Deposu", ipucu: "Hammadde rezervasyon ve tedarik durumu. Talep reçeteye göre yazılır, stokla sınırlanmaz; stok ve rezervesiz alımlarla karşılanamayan kısım AÇIKTIR — satın alınması gereken odur. Satıra tıklayınca hangi siparişin ne istediği ve hangi alışın yolda olduğu görünür." },
          { key: "mamul", ad: "Mamul Deposu", ipucu: "Mamul stoğu, siparişlere ayrılan ve serbest miktar" },
          { key: "fire", ad: "Fire Raporu", ipucu: "Üretimde hurdaya ve tamire giden çiftler" },
          // OKUT (22 Eylül, v1.411.0): telefon kamerasıyla barkod okutup malın depodaki hâlini
          // görmek. Salt okuma; sayım (Say kipi) sonraki adım.
          { key: "okut", ad: "Okut", ipucu: "Barkod okutarak malın depodaki durumuna bak (kamera ya da okuyucu)" },
          // SEVKİYAT (22 Eylül, v1.415.0): depodan sevk — koli okut, sipariş kendiliğinden bulunsun.
          { key: "sevkiyat", ad: "Sevkiyat", ikon: Truck, ipucu: "Kolileri okutup depodan sevk et" },
        ].map((s) => {
          const aktif = altSekme === s.key;
          return (
            <button
              key={s.key}
              type="button"
              title={s.ipucu}
              onClick={() => setAltSekme(s.key)}
              style={{
                padding: "5px 10px", fontSize: 12, fontWeight: aktif ? 700 : 600, cursor: "pointer",
                background: aktif ? "#5A6B4E" : "transparent",
                color: aktif ? "var(--erp-panel-2)" : "var(--erp-text-3)",
                border: "none", borderRadius: "6px 6px 0 0",
              }}
            >
              {s.ikon ? <s.ikon size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> : null}{s.ad}
            </button>
          );
        })}
      </div>

      {altSekme === "fire" && <FireRaporu uretimler={uretim} cariler={cariler} />}

      {altSekme === "sevkiyat" && (
        <SevkiyatEkrani
          koliler={koliler} siparisler={siparisler} cariler={cariler} stok={stok} tanimlar={tanimlar} uretim={uretim}
          onFisAc={onFisAc} showToast={showToast} onGoToSiparis={onGoToSiparis}
        />
      )}

      {altSekme === "okut" && (
        <DepoOkut
          stok={stok} siparisler={siparisler} uretim={uretim} koliler={koliler} cariler={cariler}
          stokRezervasyonlari={stokRezervasyonlari} tanimlar={tanimlar} onGoToUrun={onGoToUrun}
          showToast={showToast}
        />
      )}

      {altSekme === "mamul" && (
        <MamulDeposu
          stok={stok}
          siparisler={siparisler}
          uretim={uretim}
          koliler={koliler}
          onGoToUrun={onGoToUrun}
        />
      )}

      {altSekme === "rezervasyon" && (<>
      {/* Açıklama paragrafı sekmenin ipucuna taşındı; arama + süzgeçler + özet tek satır, sıkı. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flex: "1 1 180px", minWidth: 160 }}>
          <Search size={13} color="var(--erp-text-3)" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Hammadde, renk ya da sipariş no…"
            title="Talep reçeteye göre yazılır; stok ve yoldaki alımlarla karşılanamayan kısım AÇIKTIR"
            style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
          />
        </span>
        <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {SUZGECLER.map((f) => {
            const aktif = suzgec === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSuzgec(f.key)}
                style={{
                  padding: "3px 9px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${aktif ? f.renk : "var(--erp-border-2)"}`,
                  background: aktif ? f.renk : "#fff",
                  color: aktif ? "var(--erp-panel-2)" : "var(--erp-text-2)",
                }}
              >
                {f.ad}
              </button>
            );
          })}
        </span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: toplamAcik > 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
          {gorunen.length} kalem · {siparisKumesi.size} sipariş{toplamAcik > 0 ? ` · açık ${toplamAcik}` : " · açık yok"}
        </span>
      </div>

      {gorunen.length === 0 ? (
        <EmptyState
          text={
            suzgec === "acik"
              ? "Açığı olan hammadde yok — tüm talepler stok ve yoldaki alımlarla karşılanıyor."
              : suzgec === "rezerveli"
                ? "Rezervasyonlu hammadde yok. Bir siparişe üretim kararı verildiğinde talepler buraya yazılır."
                : "Depoda hareket görmüş kalem yok."
          }
        />
      ) : (
        <StokDurumuMatrisi
          satirlar={gorunen}
          onGoToSiparis={onGoToSiparis}
          onGoToUrun={onGoToUrun}
          onSatinAlPlanla={onSatinAlPlanla}
          onAlisFisi={onAlisFisi}
        />
      )}
      </>)}
    </div>
  );
}

