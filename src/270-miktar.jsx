// =============================================================================================
// İFADE HESAPLAYAN MİKTAR ALANI
//
// Reçete miktarları atölyede nadiren hazır bir sayıdır: "bir metreden 8 çift çıkıyor" ya da
// "120 desimetrekare deri, çifti 14" gibi hesaplanır. Kullanıcı bunu telefonda ayrı bir hesap
// makinesinde yapıp sonucu geri yazıyordu — hem yavaş hem de yuvarlama hatasına açık.
//
// Alanın kendisi hesaplıyor: `1/8` yazılır, yanında `= 0,125` görünür, alandan çıkınca kaydedilir.
// Ayrı bir açılır hesap makinesi TERCİH EDİLMEDİ: telefonda pencere açıp kapamak, alanın içine
// yazmaktan yavaş.
//
// eval KULLANILMIYOR. Kullanıcının yazdığı metni çalıştırmak, hesap makinesi gibi masum bir
// özellikte bile keyfi kod çalıştırma yolu açar. Kendi ayrıştırıcımız yalnızca sayı ve dört
// işlem tanıyor; başka her şey geçersiz sayılıyor.
function ifadeHesapla(metin) {
  const ham = String(metin == null ? "" : metin).trim().replace(/,/g, ".");
  if (!ham) return null;
  // Beyaz liste: rakam, nokta, dört işlem, parantez, boşluk. Harf ya da başka bir şey varsa çık.
  if (!/^[0-9.+\-*/() ]+$/.test(ham)) return null;

  let i = 0;
  const bosluk = () => { while (ham[i] === " ") i++; };
  function sayi() {
    bosluk();
    if (ham[i] === "(") {
      i++; const d = toplama(); bosluk();
      if (ham[i] !== ")") throw new Error("parantez");
      i++; return d;
    }
    if (ham[i] === "-") { i++; return -sayi(); }
    if (ham[i] === "+") { i++; return sayi(); }
    const bas = i;
    while (i < ham.length && /[0-9.]/.test(ham[i])) i++;
    if (i === bas) throw new Error("sayı bekleniyordu");
    const d = parseFloat(ham.slice(bas, i));
    if (!isFinite(d)) throw new Error("geçersiz sayı");
    return d;
  }
  function carpma() {
    let sol = sayi();
    for (;;) {
      bosluk();
      const op = ham[i];
      if (op !== "*" && op !== "/") return sol;
      i++;
      const sag = sayi();
      // Sıfıra bölme sessizce Infinity üretirdi ve stok hesabına sızardı.
      if (op === "/" && sag === 0) throw new Error("sıfıra bölme");
      sol = op === "*" ? sol * sag : sol / sag;
    }
  }
  function toplama() {
    let sol = carpma();
    for (;;) {
      bosluk();
      const op = ham[i];
      if (op !== "+" && op !== "-") return sol;
      i++;
      const sag = carpma();
      sol = op === "+" ? sol + sag : sol - sag;
    }
  }
  try {
    const sonuc = toplama();
    bosluk();
    if (i !== ham.length) return null;      // artık karakter kaldıysa ifade bozuk
    if (!isFinite(sonuc)) return null;
    // Reçete miktarları dört haneye kadar anlamlı; kayan nokta artığı (0.30000000000000004) sızmasın.
    return Math.round(sonuc * 10000) / 10000;
  } catch (e) {
    return null;
  }
}

// Reçete miktar hücresi. `type="number"` KULLANILMIYOR: tarayıcı "1/8" gibi bir ifadeyi geçersiz
// sayıp alanı boşaltıyor, kullanıcının yazdığı kayboluyordu. inputMode="decimal" telefonda yine
// sayı klavyesi açıyor.
function MiktarGirisi({ deger, onKaydet, genislik = 50 }) {
  const [metin, setMetin] = useState(String(deger ?? ""));
  useEffect(() => { setMetin(String(deger ?? "")); }, [deger]);

  const hesaplanan = ifadeHesapla(metin);
  const ifadeMi = /[+\-*/()]/.test(metin.trim().slice(1)); // baştaki eksiyi işlem sayma
  const gecersiz = metin.trim() !== "" && hesaplanan === null;

  function kaydet() {
    const yeni = ifadeHesapla(metin);
    if (!(yeni > 0)) { setMetin(String(deger ?? "")); return; }  // geçersiz giriş eski değere döner
    if (yeni === deger) { setMetin(String(deger)); return; }
    onKaydet(yeni);
    setMetin(String(yeni));   // ifade yerine sonucu göster: kaydedilen değer neyse o görünsün
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <input
        type="text" inputMode="decimal"
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        onBlur={kaydet}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        title="Hesap yazabilirsiniz: 1/8, 120/14, 2.5*3"
        className="mono"
        style={{
          // ALT SINIR VAR: çağıran daha dar bir genişlik istese de uygulanmıyor. Reçetede
          // yapıştırıcı, çivi, iplik gibi malzemeler binde birler mertebesinde tüketiliyor;
          // "0,0125" yedi karakter. Dar alan bunu "0," diye kesiyor ve kullanıcı kaydettiği
          // değeri göremiyor — girdiğinden emin olamadığı bir alan, olmayan alandan kötü.
          width: Math.max(genislik, 78), padding: "4px 7px", fontSize: 12, borderRadius: "var(--erp-r-sm)",
          border: `1px solid ${gecersiz ? "var(--erp-orange)" : "var(--erp-border)"}`,
        }}
      />
      {ifadeMi && hesaplanan !== null && (
        <span className="mono" style={{ fontSize: 10, color: "var(--erp-primary)", fontWeight: 700, lineHeight: 1.4 }}>
          = {hesaplanan}
        </span>
      )}
      {gecersiz && (
        <span className="mono" style={{ fontSize: 10, color: "var(--erp-warn)", lineHeight: 1.4 }}>geçersiz</span>
      )}
    </span>
  );
}

