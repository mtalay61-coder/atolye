#!/usr/bin/env node
// DENETİM 18 — BAYAT OKUMA ("kapanış state'i")
//
// NEDEN VAR
// React'te bir fonksiyon, oluşturulduğu andaki state'in FOTOĞRAFINI taşır. İki durumda bu fotoğraf
// eskir ama kod onu hâlâ güncel sanır:
//
//   A) SET SONRASI OKUMA — `setStok(yeni)` çağrıldıktan sonra aynı fonksiyonda `stok` okunursa
//      ESKİ değer gelir. React yeni değeri bir sonraki çizimde verir, o satırda değil.
//      Hata vermez; yanlış sayıyla devam eder. (v1.307'de sipariş yolunda yaşandı: yan etkiler
//      defter yazımından önce çalışıyordu.)
//
//   B) AWAIT SONRASI OKUMA — `await tabloYaz(...)` beklenirken başka bir işlem state'i değiştirebilir.
//      Dönüşte okunan `stok` bekleme ÖNCESİNİN fotoğrafıdır; üstüne yazılırsa arada yapılan iş kaybolur.
//
// NASIL DÜZELTİLİR
//   A) Yeni değeri bir değişkende hesapla, hem set'e hem sonraki işe O DEĞİŞKENİ ver:
//        const yeni = stok.map(...); setStok(yeni); tabloYaz("stok", yeni);
//   B) Beklemeden sonra state'e dayalı güncelleme fonksiyonlu yapılmalı: `setStok(o => ...)`.
//      Yalnız okumak gerekiyorsa değeri beklemeden ÖNCE bir değişkene al ve bilerek onu kullan.
//
// MUAFİYET
//   Okumanın bilinçli olduğu yerler (ör. "bekleme öncesi hali" gerçekten isteniyorsa) satır sonuna
//   ya da bir üst satıra `// bayat-muaf: <gerekçe>` yazılarak geçilir. Gerekçesiz muafiyet geçmez.
//
// KAPSAM
//   "State" = useState ile ya da bileşen parametresi (props) olarak gelen ve yanında `setX`i de
//   bulunan ad. Fonksiyon içinde aynı adla yerel değişken tanımlanmışsa o ad state değildir, atlanır.
//
// SAYIM=1 node bayatdenetim.js atolye-erp.jsx  → muaf dahil tüm geçişleri listeler.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirlar = kaynak.split("\n");
const sf = ts.createSourceFile(dosya, kaynak, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);
const SAYIM = !!process.env.SAYIM;

const satirNo = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
const fonksiyonMu = (n) =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);

// ---- Kapsam: her fonksiyonun KENDİ tanımladığı adlar ------------------------------------------
// ad → "state" | "prop" | "yerel". useState dizisi "state"; parametre "prop"; diğer her şey "yerel".
const tanimlar = new Map(); // fonksiyon düğümü → Map(ad → tür)
const kokTanimlar = new Map(); // dosya düzeyi

const tanimDugumu = new Map(); // "fonksiyonBaşlangıcı:ad" → tanım düğümü (C türü için)
function adlariTopla(bag, tur, hedef, dugum, f) {
  if (!bag) return;
  if (ts.isIdentifier(bag)) {
    if (!hedef.has(bag.text)) {
      hedef.set(bag.text, tur);
      if (dugum) tanimDugumu.set(`${f ? f.getStart() : -1}:${bag.text}`, dugum);
    }
    return;
  }
  if (ts.isObjectBindingPattern(bag) || ts.isArrayBindingPattern(bag)) {
    for (const e of bag.elements) if (!ts.isOmittedExpression(e)) adlariTopla(e.name, tur, hedef, dugum, f);
  }
}

function sahipFonksiyon(n) {
  let p = n.parent;
  while (p && !fonksiyonMu(p)) p = p.parent;
  return p || null;
}
function tabloAl(f) {
  const anahtar = f || sf;
  const t = f ? tanimlar : kokTanimlar;
  if (f) { if (!tanimlar.has(f)) tanimlar.set(f, new Map()); return tanimlar.get(f); }
  return kokTanimlar;
}

function useStateMi(init) {
  if (!init || !ts.isCallExpression(init)) return false;
  const e = init.expression;
  const ad = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
  return ad === "useState" || ad === "useReducer";
}

(function topla(n) {
  if (fonksiyonMu(n)) {
    const t = tabloAl(n);
    for (const p of n.parameters) adlariTopla(p.name, "prop", t);
    if (n.name && ts.isIdentifier(n.name) && ts.isFunctionDeclaration(n)) adlariTopla(n.name, "yerel", tabloAl(sahipFonksiyon(n)), n, sahipFonksiyon(n));
  } else if (ts.isVariableDeclaration(n)) {
    // `const { stok, setStok } = d;` — hook/bileşen kendi parametresinden açıyorsa bu adlar
    // PROP'tur (dışarıdaki state'in fotoğrafı), yerel değişken değil. Bölünmüş dosyalardaki
    // `useUretimTeslim(d)` gibi hook'ların hepsi bu kalıpla state alıyor.
    let tur = useStateMi(n.initializer) && ts.isArrayBindingPattern(n.name) ? "state" : "yerel";
    if (tur === "yerel" && ts.isObjectBindingPattern(n.name) && n.initializer && ts.isIdentifier(n.initializer)) {
      const f = sahipFonksiyon(n);
      if (f && f.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === n.initializer.text)) tur = "prop";
    }
    adlariTopla(n.name, tur, tabloAl(sahipFonksiyon(n)), n, sahipFonksiyon(n));
  } else if (ts.isCatchClause(n) && n.variableDeclaration) {
    adlariTopla(n.variableDeclaration.name, "yerel", tabloAl(sahipFonksiyon(n)));
  }
  ts.forEachChild(n, topla);
})(sf);

// Bir adın, verilen düğümden yukarı doğru EN YAKIN tanımı: { fonksiyon, tur } | null
function enYakinTanim(ad, dugum) {
  let f = sahipFonksiyon(dugum);
  while (f) {
    const t = tanimlar.get(f);
    if (t && t.has(ad)) return { fonksiyon: f, tur: t.get(ad) };
    f = sahipFonksiyon(f);
  }
  if (kokTanimlar.has(ad)) return { fonksiyon: null, tur: kokTanimlar.get(ad) };
  return null;
}

// `setStok` → `stok`. Ad kuralı + useState çiftleri (kurala uymayan adlar için).
const ciftler = new Map(); // setter → state adı
(function ciftTopla(n) {
  if (ts.isVariableDeclaration(n) && useStateMi(n.initializer) && ts.isArrayBindingPattern(n.name)) {
    const [a, b] = n.name.elements;
    if (a && b && !ts.isOmittedExpression(a) && !ts.isOmittedExpression(b) && ts.isIdentifier(a.name) && ts.isIdentifier(b.name))
      ciftler.set(b.name.text, a.name.text);
  }
  ts.forEachChild(n, ciftTopla);
})(sf);
function stateAdi(setter) {
  if (ciftler.has(setter)) return ciftler.get(setter);
  const m = setter.match(/^set([A-ZÇĞİÖŞÜ])(.*)$/);
  if (!m) return null;
  return m[1].toLocaleLowerCase("tr") + m[2];
}
// "i" harfi: setIslemler → islemler (Türkçe küçültme İ→i, I→ı olurdu; ASCII I için de dene)
function adAdaylari(setter) {
  const s = stateAdi(setter);
  if (!s) return [];
  const m = setter.match(/^set(.)(.*)$/);
  const ascii = m[1].toLowerCase() + m[2];
  return [...new Set([s, ascii])];
}

// Ad, bu okuma noktasında gerçekten state/prop mu? (yerel gölge değil)
function stateOkumasiMi(ad, dugum, setterAdi) {
  const t = enYakinTanim(ad, dugum);
  if (!t) return false;
  if (t.tur === "state") return true;
  if (t.tur === "prop") {
    // Prop olarak gelen `stok`un yanında `setStok` da aynı yerden (ya da yukarıdan) erişilebilir olmalı
    const s = enYakinTanim(setterAdi, dugum);
    return !!s && (s.tur === "prop" || s.tur === "state");
  }
  return false;
}

// Tanımlayıcı gerçekten bir OKUMA mı (özellik adı, nesne anahtarı, tanım adı değil)
function okumaMi(id) {
  const p = id.parent;
  if (!p) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if (ts.isPropertyAssignment(p) && p.name === id) return false;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p)) && p.name === id) return false;
  if (ts.isBindingElement(p) && p.propertyName === id) return false;
  if (ts.isFunctionDeclaration(p) && p.name === id) return false;
  if (ts.isJsxAttribute(p)) return false;
  if (ts.isMethodDeclaration(p) && p.name === id) return false;
  return true;
}

function muafMi(pos) {
  const s = satirNo(pos) - 1;
  const bu = satirlar[s] || "";
  const ust = satirlar[s - 1] || "";
  const m = (bu + "\n" + ust).match(/bayat-muaf:\s*(\S.*)?/);
  return !!(m && m[1] && m[1].trim().length > 2);
}

// F içinde, F'nin KENDİ gövdesine ait düğümleri gez (iç içe fonksiyonlara in ya da inme).
// Set ile okuma birbirini DIŞLAYAN dallarda mı? (if/else, ?:, switch case'leri) ya da set'ten
// sonra kendi bloğunda return/throw var mı? İkisinde de okuma set'i hiç "görmez", bulgu değildir.
function atalar(n) { const a = []; for (let p = n; p; p = p.parent) a.push(p); return a; }
function dislayanDallarda(setDugumu, okuma, firlatabilir) {
  const aS = atalar(setDugumu), aO = new Set(atalar(okuma));
  let lca = null, cocukS = null;
  for (let i = 0; i < aS.length; i++) if (aO.has(aS[i])) { lca = aS[i]; cocukS = aS[i - 1]; break; }
  if (!lca) return false;
  const aOl = atalar(okuma); const cocukO = aOl[aOl.indexOf(lca) - 1];
  if (ts.isIfStatement(lca) && cocukS && cocukO && cocukS !== cocukO && cocukS !== lca.expression && cocukO !== lca.expression) return true;
  if (ts.isConditionalExpression(lca) && cocukS !== lca.condition && cocukO !== lca.condition && cocukS !== cocukO) return true;
  if (ts.isCaseBlock(lca) && cocukS !== cocukO) return true;
  // await FIRLATABİLİR: yolda catch'li bir try bloğu varsa, aradaki return hata yolunda atlanır
  // ve okuma yine görülür. Bu durumda return'e dayalı eleme yapılmaz.
  if (firlatabilir) {
    for (let i = 0; aS[i] !== lca; i++) {
      const b = aS[i];
      if (ts.isBlock(b) && b.parent && ts.isTryStatement(b.parent) && b.parent.tryBlock === b && b.parent.catchClause) return false;
    }
  }
  // set'ten sonra, LCA'ya varmadan önceki bloklardan birinde return/throw → okuma o yoldan gelmez
  for (let i = 0; aS[i] !== lca; i++) {
    const b = aS[i + 1];
    // try bloğundaki return, hata yolunda ATLANIR (await fırlatırsa catch'e ve sonrasına düşülür).
    const tryBlogu = b && ts.isBlock(b) && b.parent && ts.isTryStatement(b.parent) && b.parent.tryBlock === b;
    if (b && !tryBlogu && (ts.isBlock(b) || ts.isCaseClause(b) || ts.isDefaultClause(b))) {
      const st = b.statements; const k = st.indexOf(aS[i]);
      for (let j = k + 1; j < st.length; j++)
        if (st[j].getEnd() <= okuma.getStart() &&
            (ts.isReturnStatement(st[j]) || ts.isThrowStatement(st[j]) || ts.isBreakStatement(st[j]) || ts.isContinueStatement(st[j]))) return true;
    }
    // `if (x) { setA(); return; }` biçimindeki tek satırlık dal da buraya düşer
    if (ts.isReturnStatement(aS[i]) && aS[i] !== setDugumu) return true; // `return setA(...)`
  }
  return false;
}

// `return;` sonrasında kalan ölü kod: hiç çalışmaz, bulgu üretmesin.
function erisilemezMi(n) {
  for (let c = n; c && c.parent; c = c.parent) {
    const b = c.parent;
    if (ts.isBlock(b) || ts.isCaseClause(b) || ts.isDefaultClause(b) || ts.isSourceFile(b)) {
      const st = b.statements; const k = st.indexOf(c);
      for (let j = 0; j < k; j++) if (ts.isReturnStatement(st[j]) || ts.isThrowStatement(st[j])) return true;
    }
  }
  return false;
}
function icindeMi(dis, ic) { return dis.getStart() <= ic.getStart() && ic.getEnd() <= dis.getEnd(); }

function gez(n, ziyaret, icFonksiyonlaraGir) {
  ts.forEachChild(n, function g(c) {
    if (fonksiyonMu(c) && !icFonksiyonlaraGir) return;
    ziyaret(c);
    ts.forEachChild(c, g);
  });
}

const bulgular = [];
const goruldu = new Set();
function bulguEkle(tur, id, detay, fonk) {
  if (erisilemezMi(id)) return;
  const anahtar = tur + ":" + id.getStart();
  if (goruldu.has(anahtar)) return;
  goruldu.add(anahtar);
  const muaf = muafMi(id.getStart());
  if (muaf && !SAYIM) return;
  bulgular.push({ tur, satir: satirNo(id.getStart()), ad: id.text, detay, muaf, fonk });
}

// Adsız fonksiyonlarda (onClick, useEffect gövdesi) en yakın ADLI atanın adı kullanılır;
// borç listesi satır numarasına değil ada bağlı kalsın diye.
function fonksiyonAdi(f) {
  for (let g = f; g; g = sahipFonksiyon(g)) {
    const ad = fonksiyonAdiTek(g);
    if (ad !== "(adsız)") return g === f ? ad : `${ad}›adsız`;
  }
  return "(adsız)";
}
function fonksiyonAdiTek(f) {
  if (f.name && ts.isIdentifier(f.name)) return f.name.text;
  const p = f.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isCallExpression(p) && p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name))
    return p.parent.name.text; // const x = useCallback(() => ...)
  return "(adsız)";
}

(function tara(n) {
  if (fonksiyonMu(n) && n.body) {
    const govde = n.body;
    // ---- A) set sonrası okuma ---------------------------------------------------------------
    const setler = []; // { adlar, setter, bitis }
    gez(govde, (c) => {
      if (ts.isCallExpression(c) && ts.isIdentifier(c.expression) && /^set[A-ZÇĞİÖŞÜ]/.test(c.expression.text)) {
        const adlar = adAdaylari(c.expression.text);
        if (adlar.length) setler.push({ adlar, dugum: c, setter: c.expression.text, bitis: c.getEnd(), satir: satirNo(c.getStart()) });
      }
    }, false);
    if (setler.length) {
      gez(govde, (c) => {
        if (!ts.isIdentifier(c) || !okumaMi(c)) return;
        for (const s of setler) {
          if (!s.adlar.includes(c.text)) continue;
          if (c.getStart() <= s.bitis) continue;
          if (!stateOkumasiMi(c.text, c, s.setter)) continue;
          if (dislayanDallarda(s.dugum, c)) continue;
          // Okuma F'nin içinde yerel bir gölgeye mi bağlı? enYakinTanim F'nin kendisini ya da
          // altını gösteriyorsa yerel sayılırdı; state/prop dönüyorsa F'nin DIŞINDAN geliyor demektir.
          const t = enYakinTanim(c.text, c);
          if (t && t.fonksiyon && (t.fonksiyon === n || n.getStart() < t.fonksiyon.getStart() && t.fonksiyon.getEnd() <= n.getEnd()) && t.tur !== "state") continue;
          bulguEkle("A", c, `${fonksiyonAdi(n)}: ${s.setter}(…) ${dosya}:${s.satir} çağrıldı, sonra \`${c.text}\` okunuyor — eski değer gelir`, fonksiyonAdi(n));
          break;
        }
      }, true);
    }
    // ---- B) await sonrası okuma -------------------------------------------------------------
    const asenkron = n.modifiers && n.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    if (asenkron) {
      // Her await ayrı değerlendirilir: okuma, kendisinden ÖNCE gelen ve aynı yolda olan (dışlayan
      // dalda ya da return'lü blokta kalmayan) bir await'ten sonra geliyorsa bulgudur.
      const awaitler = [];
      gez(govde, (c) => { if (ts.isAwaitExpression(c)) awaitler.push(c); }, false);
      const ilkAwait = awaitler.length ? Math.min(...awaitler.map((a) => a.getEnd())) : null;
      if (ilkAwait !== null) {
        gez(govde, (c) => {
          if (!ts.isIdentifier(c) || !okumaMi(c) || c.getStart() <= ilkAwait) return;
          if (!awaitler.some((a) => a.getEnd() < c.getStart() && !dislayanDallarda(a, c, true) && !icindeMi(a, c))) return;
          // Setter'ın kendisi (setStok) kararlı bir fonksiyondur, bekleme sonrası çağrılması doğru yol.
          if (ciftler.has(c.text) || /^set[A-ZÇĞİÖŞÜ]/.test(c.text)) return;
          const t = enYakinTanim(c.text, c);
          if (!t || (t.tur !== "state" && t.tur !== "prop")) return;
          // F'nin kendi parametresi ise dışarıdan gelen state değildir
          if (t.fonksiyon === n) return;
          if (t.fonksiyon && n.getStart() < t.fonksiyon.getStart() && t.fonksiyon.getEnd() <= n.getEnd()) return;
          const setter = "set" + c.text.charAt(0).toLocaleUpperCase("tr") + c.text.slice(1);
          const setterAscii = "set" + c.text.charAt(0).toUpperCase() + c.text.slice(1);
          if (!stateOkumasiMi(c.text, c, setter) && !stateOkumasiMi(c.text, c, setterAscii)) return;
          bulguEkle("B", c, `${fonksiyonAdi(n)}: \`await\` sonrası \`${c.text}\` okunuyor — bekleme öncesinin fotoğrafı`, fonksiyonAdi(n));
        }, true);
      }
    }
  }
  ts.forEachChild(n, tara);
})(sf);

// ---- C) EKSİK BAĞIMLILIK ------------------------------------------------------------------------
// `useCallback(fn, [a, b])` / `useEffect` / `useMemo`: fn yalnız a veya b değişince YENİDEN kurulur.
// fn içinde kullanılan, bileşende tanımlı ve çizimden çizime değişen bir ad dizide YOKSA, fn o adın
// ESKİ hâlini taşır. v1.406'daki asıl hata buydu: üretim geri alma, dizisinde olmayan
// `fisDefterindeIptal`in açılıştaki kopyasını (BOŞ defter) çağırıyordu.
// Kararlı adlar elenir: setter'lar, useRef, modül düzeyi adlar, sabit değerler.
const KANCALAR = new Set(["useCallback", "useMemo", "useEffect", "useLayoutEffect"]);
function kararliMi(ad, tanim, tur) {
  if (/^set[A-ZÇĞİÖŞÜ]/.test(ad) || ciftler.has(ad) || ad === "dispatch") return true;
  // Ref nesnesi çizimler arasında AYNI kalır (proje adlandırması: `…Ref`), prop olarak gelse bile.
  if (/Ref$/.test(ad)) return true;
  if (tur === "state" || tur === "prop") return false;
  if (!tanim) return false;
  if (ts.isVariableDeclaration(tanim)) {
    const init = tanim.initializer;
    if (!init) return false;
    if (ts.isCallExpression(init)) {
      const e = init.expression;
      const cad = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      if (cad === "useRef") return true;
    }
    if (sabitIfadeMi(init)) return true;
    if (init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword || init.kind === ts.SyntaxKind.NullKeyword) return true;
  }
  return false;
}
// `12 * 60 * 60 * 1000` gibi yalnız sabitlerden oluşan ifade her çizimde aynı değeri verir.
function sabitIfadeMi(e) {
  if (!e) return false;
  if (ts.isParenthesizedExpression(e)) return sabitIfadeMi(e.expression);
  if (ts.isStringLiteral(e) || ts.isNumericLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isPrefixUnaryExpression(e)) return sabitIfadeMi(e.operand);
  if (ts.isBinaryExpression(e)) return sabitIfadeMi(e.left) && sabitIfadeMi(e.right);
  return false;
}
// Bir ad, efekt gövdesinde SONRADAN mı çalışıyor? (22 Eylül, 24 efektin incelenmesinden çıkan ölçüt)
//  - efekt içindeki bir fonksiyon literalinin içinde (zamanlayıcı, dinleyici, kaydedilen onClick) —
//    senkron dizi yöntemleri (map, filter…) ve setter güncelleyicileri HARİÇ;
//  - efekt içindeki bir `await`ten sonra;
//  - çağrılmadan bir yere VERİLİYOR (nesne özelliği, çağrı argümanı): fonksiyon saklanıp sonra
//    çağrılacak — stok fişinin başlık Kaydet'i böyleydi.
// setTimeout/setInterval "set…" ile başlıyor ama setter DEĞİL — tam tersine en tipik gecikmeli çağrı.
const ZAMANLAYICI = new Set(["setTimeout", "setInterval", "setImmediate"]);
const setterMi = (ad) => /^set[A-ZÇĞİÖŞÜ]/.test(ad) && !ZAMANLAYICI.has(ad);
const SENKRON_YONTEM = new Set(["map", "filter", "find", "findIndex", "some", "every", "forEach", "reduce", "flatMap", "sort", "includes"]);
function gecikmeliMi(id, efektFn) {
  // saklanan fonksiyon referansı
  const p = id.parent;
  const cagrilanMi = p && ts.isCallExpression(p) && p.expression === id;
  if (!cagrilanMi && p && (ts.isPropertyAssignment(p) && p.initializer === id)) return true;
  if (!cagrilanMi && p && ts.isCallExpression(p) && p.arguments.includes(id)) {
    const cad = ts.isIdentifier(p.expression) ? p.expression.text : ts.isPropertyAccessExpression(p.expression) ? p.expression.name.text : "";
    if (!SENKRON_YONTEM.has(cad) && !setterMi(cad)) {
      const t = enYakinTanim(id.text, id);
      const tanim = t && t.fonksiyon ? tanimDugumu.get(`${t.fonksiyon.getStart()}:${id.text}`) : null;
      const fonkDegerMi = tanim && (ts.isFunctionDeclaration(tanim) || (ts.isVariableDeclaration(tanim) && tanim.initializer &&
        (fonksiyonMu(tanim.initializer) || (ts.isCallExpression(tanim.initializer) && /^use(Callback)$/.test(tanim.initializer.expression.getText())))));
      if (fonkDegerMi) return true;
    }
  }
  // iç fonksiyon literali
  for (let a = id.parent; a && a !== efektFn; a = a.parent) {
    if (!fonksiyonMu(a)) continue;
    const ust = a.parent;
    if (ust && ts.isCallExpression(ust) && ust.arguments.includes(a)) {
      const e = ust.expression;
      const cad = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      if (SENKRON_YONTEM.has(cad) || setterMi(cad)) continue;
      // hemen çağrılan async sarmal `(async () => {...})()` gövdesi: await kuralına bırak
      if (ust.expression === a) continue;
    }
    if (ust && ts.isCallExpression(ust) && ust.expression === a) continue;               // IIFE
    if (ust && ts.isParenthesizedExpression(ust) && ust.parent && ts.isCallExpression(ust.parent) && ust.parent.expression === ust) continue;
    return true;
  }
  // await sonrası (efekt gövdesi ya da içindeki hemen çağrılan async sarmal)
  let ilk = null;
  gez(efektFn, (c) => { if (ts.isAwaitExpression(c) && (ilk === null || c.getEnd() < ilk)) ilk = c.getEnd(); }, true);
  if (ilk !== null && id.getStart() > ilk) return true;
  return false;
}

const cBulgulari = [];
const tBulgulari = [];
(function cTara(n) {
  if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && KANCALAR.has(n.expression.text)
      && n.arguments.length >= 2 && ts.isArrayLiteralExpression(n.arguments[1])
      && n.arguments[0] && fonksiyonMu(n.arguments[0])) {
    const fn = n.arguments[0];
    const H = sahipFonksiyon(n);
    const diz = new Set();
    for (const el of n.arguments[1].elements) {
      let k = el; while (k && (ts.isPropertyAccessExpression(k) || ts.isElementAccessExpression(k) || ts.isNonNullExpression(k))) k = k.expression;
      if (k && ts.isIdentifier(k)) diz.add(k.text);
    }
    // T) TANIMDAN ÖNCE KULLANIM: dizi ÇİZİM ANINDA okunur. Aynı fonksiyonda aşağıda `const` ile
    // tanımlı bir ad buraya yazılırsa uygulama "Cannot access … before initialization" ile HİÇ
    // açılmaz (v1.405 reçete şablonu ve v1.407 fiş defteri — derleme ve denetimler görmedi).
    for (const el of n.arguments[1].elements) {
      let k = el; while (k && (ts.isPropertyAccessExpression(k) || ts.isElementAccessExpression(k))) k = k.expression;
      if (!k || !ts.isIdentifier(k)) continue;
      const t = enYakinTanim(k.text, k);
      if (!t || !H || t.fonksiyon !== H) continue;
      const tanim = tanimDugumu.get(`${H.getStart()}:${k.text}`);
      if (tanim && ts.isVariableDeclaration(tanim) && tanim.getStart() > n.getStart()
          && tanim.parent && (tanim.parent.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let))) {
        tBulgulari.push({ satir: satirNo(k.getStart()), ad: k.text, tanimSatir: satirNo(tanim.getStart()), fonk: kancaAdi(n) });
      }
    }
    const eksik = new Map();
    const etkiMi = n.expression.text === "useEffect" || n.expression.text === "useLayoutEffect";
    gez(fn, (c) => {
      if (!ts.isIdentifier(c) || !okumaMi(c) || diz.has(c.text) || eksik.has(c.text)) return;
      if (erisilemezMi(c)) return;
      const t = enYakinTanim(c.text, c);
      if (!t || !H || t.fonksiyon !== H) return;
      const tanim = tanimDugumu.get(`${H.getStart()}:${c.text}`);
      if (kararliMi(c.text, tanim, t.tur)) return;
      // EFEKTTE yalnız SONRADAN çalışan kullanım bayat okumadır (bkz. gecikmeliMi). Senkron kullanım,
      // efektin çalıştığı çizimin GÜNCEL değerini okur; eksik bağımlılık orada yalnız "şu değişince
      // yeniden çalışma" demektir — tetikleyici efektlerde bilinçli seçim.
      if (etkiMi && !gecikmeliMi(c, fn)) return;
      eksik.set(c.text, c);
    }, true);
    for (const [ad, id] of eksik) {
      if (muafMi(id.getStart()) && !SAYIM) continue;
      cBulgulari.push({ tur: "C", satir: satirNo(id.getStart()), ad, fonk: kancaAdi(n), kanca: n.expression.text,
        bos: n.arguments[1].elements.length === 0, detay: "" });
    }
  }
  ts.forEachChild(n, cTara);
})(sf);
function kancaAdi(cagri) {
  const p = cagri.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  const f = sahipFonksiyon(cagri);
  return `${f ? fonksiyonAdi(f) : "(kök)"}›${cagri.expression.text}`;
}
if (process.env.C_SAYIM) {
  const bos = cBulgulari.filter((b) => b.bos).length;
  console.log(`C: ${cBulgulari.length} eksik (boş dizili kancalarda ${bos}); kanca sayısı: ${new Set(cBulgulari.map((b) => b.fonk + b.satir)).size}`);
  const say = {}; for (const b of cBulgulari) say[b.kanca] = (say[b.kanca] || 0) + 1; console.log(say);
  for (const b of cBulgulari) console.log(`  ${dosya}:${b.satir} ${b.kanca}${b.bos ? "[]" : ""} ${b.fonk} ← ${b.ad}`);
  process.exit(0);
}

// EFEKT BORCU KALDIRILDI (22 Eylül, v1.408.0): 24 efektin hepsi incelendi. Efektte yalnız
// SONRADAN çalışan kullanım bulgu sayılıyor (gecikmeliMi); kalan 5 zararsız BORC listesinde.
const ETKI_BORC = new Set();

// ---- BİLİNEN GEÇİŞLER (BORÇ) ------------------------------------------------------------------
// Denetleyici yazıldığında (22 Eylül, v1.405.0) bulunanlar. Anahtar: "fonksiyon|değişken|tür".
// GERÇEK olanlar düzeltilince buradan SİLİNMELİ; liste büyümemeli, yalnız küçülmeli.
// Yeni bir geçiş bu listede yoksa BULGU verir.
const BORC = new Map(process.env.SAYIM || process.env.BORCSUZ ? [] : [
  // — ZARARSIZ: okunan alan set ile değişmiyor ya da yol pratikte dışlanıyor —
  ["uretimProsesAtamaTeslimAl|siparisler|A", "zararsız: yalnız rezervasyon değişti, okunan `karsilanan`"],
  ["uretimProsesVer|cariler|A", "zararsız: okunan personel unvanı, hareketle değişmiyor"],
  ["yedegiUygula|stok|B", "zararsız: yalnız mevcut görselleri korumak için, geri yükleme her şeyi değiştiriyor"],
  ["AtolyeERP›adsız|aktifKullanici|A", "zararsız: okunan `ad`/`id` set ile değişmiyor; useEffect'teki iki koşul birbirini dışlıyor"],
  ["StokModule›adsız|yeniOlcuAdi|A", "zararsız: Escape dalı sonraki satırda return ediyor"],
  ["grupEkle|eklenenGruplar|A", "zararsız: yeni anahtar filtrede ayrıca eleniyor"],
  // — C, efektlerde SONRADAN çalışan kullanım (22 Eylül incelemesi) —
  ["useAcilisYukleme›useEffect|acilisGocuUygula|C", "zararsız: veriyi parametreyle alıyor, yalnız kararlı showToast'a bağlı"],
  ["useAcilisYukleme›useEffect|showToast|C", "zararsız: showToast kararlı"],
  ["useYedekleme›useEffect|otomatikYedekAl|C", "zararsız: yükleme biten çizimin verisi; boş/kilitli veride yedek almıyor"],
  ["HammaddeIhtiyacSekmesi›useEffect|onHedefTuketildi|C", "zararsız: yalnız \"hedef görüldü\" bildirimi"],
  ["SiparisModule›useEffect|onYeniAlisTuketildi|C", "zararsız: yalnız \"hedef görüldü\" bildirimi"],
]);
// C bulguları ana akışa katılıyor; efekt borcundakiler ayrı sayılıyor.
const cEtkiBorcu = [];
for (const b of cBulgulari) {
  b.detay = `${b.fonk}: \`${b.ad}\` ${b.kanca} bağımlılık dizisinde yok — fonksiyon ${b.ad}'in ESKİ hâlini taşır`;
  const anahtar = `${b.fonk}|${b.ad}|C`;
  if (b.kanca !== "useCallback" && b.kanca !== "useMemo" && ETKI_BORC.has(anahtar)) cEtkiBorcu.push({ ...b, anahtar });
  else bulgular.push(b);
}
const borcBulgulari = [];
const kalanBulgular = [];
for (const b of bulgular) {
  const anahtar = `${b.fonk}|${b.ad}|${b.tur}`;
  if (BORC.has(anahtar)) borcBulgulari.push({ ...b, not: BORC.get(anahtar), anahtar });
  else kalanBulgular.push(b);
}
const kullanilanBorc = new Set(borcBulgulari.map((b) => b.anahtar));
const kullanilanEtki = new Set(cEtkiBorcu.map((b) => b.anahtar));
const oluBorc = [...BORC.keys()].filter((k) => !kullanilanBorc.has(k))
  .concat([...ETKI_BORC].filter((k) => !kullanilanEtki.has(k)));

bulgular.sort((a, b) => a.satir - b.satir);
if (SAYIM) {
  for (const b of bulgular) console.log(`  ${b.muaf ? "·" : "✗"} [18/${b.tur}] ${dosya}:${b.satir} ${b.detay}   {${b.fonk}|${b.ad}|${b.tur}}`);
  const a = bulgular.filter((b) => b.tur === "A").length, bb = bulgular.length - a;
  console.log(`  toplam: A=${a} B=${bb} (muaf: ${bulgular.filter((b) => b.muaf).length})`);
  process.exit(0);
}
if (process.env.BORC) {
  for (const b of borcBulgulari) console.log(`  · [18 borç] ${dosya}:${b.satir} \`${b.ad}\` (${b.fonk}) — ${b.not}`);
  for (const b of cEtkiBorcu) console.log(`  · [18 efekt borcu] ${dosya}:${b.satir} \`${b.ad}\` (${b.fonk}) — incelenmedi`);
}
let cik = 0;
for (const b of tBulgulari) {
  console.log(`  ✗ [18 tanımdan önce] ${dosya}:${b.satir} ${b.fonk}: bağımlılık dizisindeki \`${b.ad}\` ${dosya}:${b.tanimSatir} satırında tanımlı — uygulama AÇILMAZ; tanımı yukarı taşı`);
  cik = 1;
}
if (kalanBulgular.length) {
  for (const b of kalanBulgular) console.log(`  ✗ [18 bayat okuma/${b.tur}] ${dosya}:${b.satir} ${b.detay}`);
  console.log(`    düzeltme: yeni değeri değişkende tut (A) / fonksiyonlu set kullan (B) / adı bağımlılık dizisine ekle (C); bilinçliyse \`// bayat-muaf: <gerekçe>\``);
  cik = 1;
}
if (oluBorc.length) {
  // Borç kapandıysa listeden de çıkmalı — yoksa aynı adla dönen yeni hata sessizce geçer.
  for (const k of oluBorc) console.log(`  ✗ [18 bayat okuma] borç listesinde artık karşılığı olmayan kayıt: ${k} — listeden sil`);
  cik = 1;
}
if (cik) process.exit(1);
const gercekFonk = new Set([...BORC].filter(([, v]) => v.startsWith("GERÇEK")).map(([k]) => k.split("|")[0]));
const borcNotu = BORC.size ? ` · ${BORC.size} borç, ${gercekFonk.size} gerçek (BORC=1 ile listele)` : "";
console.log(`  18   bayat okuma ............ TEMİZ${borcNotu}`);
