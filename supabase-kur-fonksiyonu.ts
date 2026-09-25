// ================= TCMB KUR FONKSİYONU (Supabase Edge Function) =================
//
// NEDEN GEREKLİ
//
// Tarayıcı, TCMB'nin `today.xml` adresini DOĞRUDAN okuyamaz: TCMB sunucusu CORS başlığı
// göndermiyor, yani "bu adresi başka sitedeki bir sayfa da okuyabilir" iznini vermiyor. Bu bir
// hata değil, tarayıcının güvenlik kuralı.
//
// Uygulama bugüne kadar halka açık aracılara (allorigins, codetabs, corsproxy, thingproxy)
// güveniyordu. Onlar sık çöküyor, hız sınırına takılıyor ve ne zaman çalışacağı belli olmuyor —
// bu yüzden kur çoğu zaman "Elle" giriliyordu.
//
// Bu fonksiyon aynı işi yapar ama BİZE AİTTİR: TCMB'den XML'i alır, ayrıştırır, CORS başlığıyla
// iki sayı döner. Veri yine RESMÎ TCMB verisidir — arada duran biz olduğumuz için değişmez.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez)
//
//   1. Supabase panelinde:  Edge Functions  →  Create function  →  adı:  kur
//   2. Bu dosyanın tamamını düzenleyiciye yapıştırın.
//   3. Deploy.
//   4. Function ayarlarında  "Verify JWT"  KAPALI olmalı.
//
// Neden JWT kapalı: uygulama `Authorization` başlığı GÖNDERMİYOR, çünkü yeni tip Supabase
// anahtarları (`sb_publishable_…`) JWT değildir ve doğrulamadan geçemez. Taşınan veri zaten
// herkese açık TCMB kuru; korunacak bir sır yok.
//
// Fonksiyon kurulmazsa uygulama ÇALIŞMAYA DEVAM EDER: 404 alır ve sessizce halka açık aracılara
// düşer (yavaş ve güvenilmez ama işleyen yol). Yani bu kurulum zorunlu değil, hızlandırıcı.
// ---------------------------------------------------------------------------------------------

const TCMB = "https://www.tcmb.gov.tr/kurlar/today.xml";

// CORS başlıkları HER YANITTA — hata yanıtlarında da. Yalnız başarılı yanıta koymak, tarayıcının
// hatayı okuyamamasına ve "Failed to fetch" gibi anlamsız bir mesaj görmesine yol açar.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// XML'den bir para biriminin SATIŞ kurunu okur.
//
// `ForexSelling` (döviz satış) tercih edilir; TCMB bazı birimlerde onu boş bırakıp yalnız
// `BanknoteSelling` (efektif satış) doldurur. İkisi de yoksa null döner ve çağıran karar verir —
// uydurma bir sayı döndürmek, yanlış kurla fatura kesilmesi demek olurdu.
function kurOku(xml: string, kod: string): number | null {
  // Düzenli ifade kullanılıyor: Deno'da tarayıcıdaki `DOMParser` yok ve tek bir alan için XML
  // ayrıştırıcı kurmak gereksiz bir bağımlılık olurdu.
  const blok = xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${kod}"[\\s\\S]*?</Currency>`));
  if (!blok) return null;
  const al = (etiket: string) => {
    const m = blok[0].match(new RegExp(`<${etiket}>([^<]*)</${etiket}>`));
    const v = m ? parseFloat(m[1].trim()) : NaN;
    return v > 0 ? v : null;
  };
  return al("ForexSelling") ?? al("BanknoteSelling");
}

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // TCMB bazen yavaş yanıt veriyor; süresiz beklemek fonksiyonu kilitler.
    //
    // 6 SANİYE, uygulamanın beklediği 15 saniyeden BELİRGİN OLARAK KISA. Sıra önemli: fonksiyon
    // önce pes edip "TCMB yanıt vermedi" JSON'unu dönmeli ki kullanıcı gerçek sebebi görsün.
    // Tersi olursa (fonksiyon uzun bekler, uygulama kısa) ekranda hep "ulaşılamadı" yazar ve
    // asıl sorun gizlenir — ilk kurulumda tam olarak bu oldu.
    const kontrol = new AbortController();
    const zamanAsimi = setTimeout(() => kontrol.abort(), 6000);
    const yanit = await fetch(TCMB, { signal: kontrol.signal });
    clearTimeout(zamanAsimi);

    if (!yanit.ok) {
      return new Response(
        JSON.stringify({ hata: `TCMB yanıt vermedi (${yanit.status})` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const xml = await yanit.text();
    const USD = kurOku(xml, "USD");
    const EUR = kurOku(xml, "EUR");

    // İKİSİ DE ŞART. Tek kurla dönmek, uygulamada yarısı güncel yarısı eski bir çift bırakırdı ve
    // hangisinin ne zaman alındığı belirsizleşirdi.
    if (!USD || !EUR) {
      return new Response(
        JSON.stringify({ hata: "XML okundu ama USD/EUR satış kuru bulunamadı" }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // `tarih` XML'in kendi başlığından: kurun HANGİ GÜNE ait olduğu, değerin kendisi kadar önemli.
    // Hafta sonu ve tatillerde TCMB son iş gününün kurunu döner; uygulama bunu "bayat" olarak
    // işaretleyebilsin diye tarihi de gönderiyoruz.
    //
    // `Tarih` kullanılıyor, `Date` DEĞİL: TCMB ikisini de yazar ama biçimleri farklıdır —
    // Tarih="02.09.2026" (gg.aa.yyyy), Date="09/02/2026" (aa/gg/yyyy). Uygulama tarafı
    // gg.aa.yyyy bekliyor; `Date` gönderilseydi ayrıştırılamaz ve tarih sessizce kayıt anına
    // düşerdi — yani bayatlık uyarısı yine çalışmazdı.
    const tarih = xml.match(/Tarih="([^"]+)"/)?.[1] ?? null;

    return new Response(
      JSON.stringify({ USD, EUR, tarih, kaynak: "TCMB" }),
      {
        headers: {
          ...CORS,
          "Content-Type": "application/json",
          // Aynı gün içinde tekrar tekrar TCMB'ye gitmenin anlamı yok: kur günde bir kez açıklanır.
          "Cache-Control": "public, max-age=1800",
        },
      },
    );
  } catch (e) {
    const ad = (e as Error).name;
    return new Response(
      JSON.stringify({
        hata: ad === "AbortError"
          ? "TCMB 6 saniyede yanıt vermedi"
          : String((e as Error).message || e),
      }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
