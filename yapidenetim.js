#!/usr/bin/env node
// Denetim 1-6. Her biri bu projede GERÇEKTEN yaşanmış bir hata sınıfını hedefliyor;
// genel amaçlı bir linter değil, geçmişte canı yakan şeylerin kontrol listesi.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const bulgular = [];
const satirNo = (pos) => kaynak.slice(0, pos).split("\n").length;
const bildir = (no, kod, mesaj) => bulgular.push({ no, kod, mesaj });

const sf = ts.createSourceFile(dosya, kaynak, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);

// ---- 1) SÖZDİZİMİ ----------------------------------------------------------------------------
const sozdizimi = sf.parseDiagnostics || [];
sozdizimi.slice(0, 15).forEach((d) => {
  bildir(satirNo(d.start || 0), 1, ts.flattenDiagnosticMessageText(d.messageText, " "));
});
if (sozdizimi.length) {
  rapor();
  process.exit(1); // sözdizimi bozukken diğer denetimler anlamsız
}

// ---- Kapsam çözümlemesi (2 ve 3 için ortak) ---------------------------------------------------
const KURESEL = new Set([
  "window", "document", "console", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean",
  "Date", "Map", "Set", "WeakMap", "Promise", "Error", "RegExp", "Symbol", "BigInt", "Intl", "Uint8Array", "Uint8ClampedArray", "Float32Array",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
  "encodeURI", "decodeURI", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "fetch", "Headers", "Request", "Response",
  "FormData", "Function", "Blob", "File", "FileReader", "URL", "URLSearchParams", "TextEncoder", "TextDecoder",
  "localStorage", "sessionStorage", "navigator", "location", "history", "alert", "confirm", "prompt",
  "Image", "Audio", "Intl", "structuredClone", "queueMicrotask", "AbortController", "atob", "btoa",
  "globalThis", "undefined", "NaN", "Infinity", "arguments", "this", "super", "module", "require",
  "process", "Buffer", "__dirname", "React", "ReactDOM",
  "DOMParser", "XMLSerializer", "MutationObserver", "ResizeObserver", "IntersectionObserver",
  "Event", "CustomEvent", "Node", "Element", "HTMLElement", "Worker", "Notification",
  "performance", "crypto", "matchMedia", "getComputedStyle", "print", "open", "close", "scrollTo",
]);

const kapsamlar = [new Map()]; // Map(ad -> bildirim konumu)
const tanimsizlar = [];
const tdzler = [];

function tanimla(ad, pos) {
  if (!ad) return;
  const ust = kapsamlar[kapsamlar.length - 1];
  if (!ust.has(ad)) ust.set(ad, pos);
}
function bul(ad) {
  for (let i = kapsamlar.length - 1; i >= 0; i--) if (kapsamlar[i].has(ad)) return kapsamlar[i];
  return null;
}

// Bağlama desenlerindeki (destructuring) tüm isimleri toplar.
function desendenIsimler(node, cikti) {
  if (!node) return;
  if (ts.isIdentifier(node)) { cikti.push(node); return; }
  if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
    node.elements.forEach((e) => { if (e && e.name) desendenIsimler(e.name, cikti); });
  }
}

// Bir düğümün altındaki TÜM bildirimleri, gövdeye inmeden önce kapsama yazar.
// Fonksiyon bildirimleri ve `var` yukarı çekilir; `const`/`let` çekilmez (TDZ denetimi bunun için).
function bildirimleriTopla(govde) {
  (govde.statements || []).forEach((st) => {
    if (ts.isFunctionDeclaration(st) && st.name) tanimla(st.name.text, st.pos);
    else if (ts.isClassDeclaration(st) && st.name) tanimla(st.name.text, st.pos);
    else if (ts.isVariableStatement(st)) {
      const cekilir = !(st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let));
      st.declarationList.declarations.forEach((d) => {
        const isimler = [];
        desendenIsimler(d.name, isimler);
        // const/let de kapsama YAZILIR ama konumuyla; TDZ denetimi konuma bakar.
        isimler.forEach((i) => tanimla(i.text, cekilir ? -1 : i.getStart()));
      });
    } else if (ts.isImportDeclaration(st) && st.importClause) {
      const ic = st.importClause;
      if (ic.name) tanimla(ic.name.text, -1);
      if (ic.namedBindings) {
        if (ts.isNamespaceImport(ic.namedBindings)) tanimla(ic.namedBindings.name.text, -1);
        else ic.namedBindings.elements.forEach((e) => tanimla(e.name.text, -1));
      }
    }
  });
}

function parametreleriTanimla(node) {
  (node.parameters || []).forEach((p) => {
    const isimler = [];
    desendenIsimler(p.name, isimler);
    isimler.forEach((i) => tanimla(i.text, -1));
  });
  if (node.name && ts.isIdentifier(node.name)) tanimla(node.name.text, -1); // adlandırılmış fonksiyon ifadesi
}

const KAPSAM_ACAN = (n) =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessor(n) ||
  ts.isSetAccessor(n) || ts.isBlock(n) || ts.isForStatement(n) || ts.isForOfStatement(n) ||
  ts.isForInStatement(n) || ts.isCatchClause(n) || ts.isClassDeclaration(n) || ts.isClassExpression(n);

// Modül gövdesindeki değerlendirme derinliği: 0 ise ifade AÇILIŞTA çalışır (TDZ riski burada).
let fonksiyonDerinligi = 0;

bildirimleriTopla(sf);

function gez(node) {
  const acar = KAPSAM_ACAN(node);
  const fonksiyonMu =
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) ||
    ts.isGetAccessor(node) || ts.isSetAccessor(node);

  if (acar) {
    kapsamlar.push(new Map());
    if (fonksiyonMu) parametreleriTanimla(node);
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const isimler = [];
      desendenIsimler(node.variableDeclaration.name, isimler);
      isimler.forEach((i) => tanimla(i.text, -1));
    }
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name) tanimla(node.name.text, -1);
    if (node.body && node.body.statements) bildirimleriTopla(node.body);
    else if (ts.isBlock(node)) bildirimleriTopla(node);
    if (ts.isForStatement(node) && node.initializer && ts.isVariableDeclarationList(node.initializer)) {
      node.initializer.declarations.forEach((d) => {
        const isimler = []; desendenIsimler(d.name, isimler); isimler.forEach((i) => tanimla(i.text, -1));
      });
    }
    if ((ts.isForOfStatement(node) || ts.isForInStatement(node)) &&
        node.initializer && ts.isVariableDeclarationList(node.initializer)) {
      node.initializer.declarations.forEach((d) => {
        const isimler = []; desendenIsimler(d.name, isimler); isimler.forEach((i) => tanimla(i.text, -1));
      });
    }
  }
  if (fonksiyonMu) fonksiyonDerinligi++;

  // --- kimlik kullanımı ---
  if (ts.isIdentifier(node)) {
    const ebeveyn = node.parent;
    const bildirimMi =
      (ts.isVariableDeclaration(ebeveyn) && ebeveyn.name === node) ||
      (ts.isFunctionDeclaration(ebeveyn) && ebeveyn.name === node) ||
      (ts.isParameter(ebeveyn) && ebeveyn.name === node) ||
      (ts.isBindingElement(ebeveyn) && (ebeveyn.name === node || ebeveyn.propertyName === node)) ||
      (ts.isPropertyAccessExpression(ebeveyn) && ebeveyn.name === node) ||
      (ts.isPropertyAssignment(ebeveyn) && ebeveyn.name === node) ||
      (ts.isShorthandPropertyAssignment(ebeveyn) && ebeveyn.name === node && false) ||
      (ts.isJsxAttribute(ebeveyn) && ebeveyn.name === node) ||
      (ts.isMethodDeclaration(ebeveyn) && ebeveyn.name === node) ||
      (ts.isPropertyDeclaration(ebeveyn) && ebeveyn.name === node) ||
      (ts.isClassDeclaration(ebeveyn) && ebeveyn.name === node) ||
      (ts.isImportSpecifier(ebeveyn)) || (ts.isImportClause(ebeveyn)) ||
      (ts.isLabeledStatement(ebeveyn) && ebeveyn.label === node) ||
      (ts.isEnumMember(ebeveyn)) ||
      (ts.isJsxClosingElement(ebeveyn));

    if (!bildirimMi) {
      const ad = node.text;
      // JSX etiket adı küçük harfle başlıyorsa HTML elemanıdır, kimlik değil.
      const jsxEtiket = (ts.isJsxOpeningElement(ebeveyn) || ts.isJsxSelfClosingElement(ebeveyn)) && ebeveyn.tagName === node;
      if (!(jsxEtiket && /^[a-z]/.test(ad)) && !KURESEL.has(ad)) {
        const kapsam = bul(ad);
        if (!kapsam) {
          // --- 3) TANIMSIZ İSİM ---
          tanimsizlar.push({ ad, pos: node.getStart() });
        } else if (fonksiyonDerinligi === 0) {
          // --- 2) TDZ: modül açılışında, bildiriminden ÖNCE kullanım ---
          const bildirimPos = kapsam.get(ad);
          if (bildirimPos >= 0 && node.getStart() < bildirimPos) tdzler.push({ ad, pos: node.getStart() });
        }
      }
    }
  }

  ts.forEachChild(node, gez);

  if (fonksiyonMu) fonksiyonDerinligi--;
  if (acar) kapsamlar.pop();
}
gez(sf);

// Aynı ismin onlarca kullanımı tek bulguya indirilir; rapor okunabilir kalsın.
const tekil = (liste) => {
  const m = new Map();
  liste.forEach((x) => { if (!m.has(x.ad)) m.set(x.ad, x); });
  return [...m.values()];
};
tekil(tdzler).forEach((x) => bildir(satirNo(x.pos), 2, `\`${x.ad}\` tanımlanmadan önce kullanılıyor (modül açılışında çalışır)`));
tekil(tanimsizlar).forEach((x) => bildir(satirNo(x.pos), 3, `\`${x.ad}\` hiçbir kapsamda tanımlı değil — prop geçirmeyi unutmuş olabilirsin`));

// ---- 3b) ÇİFT TANIM ----
// Bu bir SÖZDİZİMİ hatası değil, bağlayıcı (binder) hatasıdır; TypeScript'in ayrıştırıcısı
// yakalamıyor. Ama tarayıcıda etkisi en ağır olanlardan: modül hiç değerlendirilmiyor, React
// bağlanmıyor, ekranda paketleyicinin "Yükleniyor…" yazısı sonsuza kadar kalıyor. Hata mesajı
// da yok — hiçbir yerde. Bir kez yaşandı: var olan bir kuyruk değişkeniyle aynı ad kullanıldı.
{
  const sayac = new Map();
  const ekle = (ad, node) => {
    if (!sayac.has(ad)) sayac.set(ad, []);
    sayac.get(ad).push(node.getStart());
  };
  sf.statements.forEach((st) => {
    if (ts.isVariableStatement(st)) {
      st.declarationList.declarations.forEach((d) => {
        const isimler = [];
        desendenIsimler(d.name, isimler);
        isimler.forEach((i) => ekle(i.text, i));
      });
    } else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) {
      // Aşırı yükleme imzası yok bu projede; aynı adlı iki fonksiyon bildirimi de hata.
      ekle(st.name.text, st.name);
    }
  });
  sayac.forEach((konumlar, ad) => {
    if (konumlar.length > 1) {
      bildir(satirNo(konumlar[1]), 3,
        `\`${ad}\` modül düzeyinde ${konumlar.length} kez tanımlanmış (ilki ${dosya}:${satirNo(konumlar[0])}) — ` +
        `tarayıcı modülü hiç çalıştırmaz, uygulama "Yükleniyor…" ekranında kalır`);
    }
  });
}

// ---- 4) JSX YORUM SIZINTISI -------------------------------------------------------------------
// JSX gövdesinde `//` bir yorum değil, METİNDİR; olduğu gibi ekrana basılır.
(function jsxYorum(node) {
  if (ts.isJsxText(node)) {
    const ham = node.getFullText();
    ham.split("\n").forEach((sat, i) => {
      const t = sat.trim();
      if (t.startsWith("//") && t.length > 2) {
        bildir(satirNo(node.getFullStart()) + i, 4, `JSX gövdesinde \`//\` yorumu ekrana basılır: ${t.slice(0, 60)}`);
      }
    });
  }
  ts.forEachChild(node, jsxYorum);
})(sf);

// ---- 5) İFADE KONUMUNDA JSX YORUMU ------------------------------------------------------------
// `&& (` sonrası `{/* */}` JSX değil, blok/nesne olarak okunur → "{} is not a function".
{
  const kalip = /(&&|\|\||\?)\s*\(\s*\n\s*\{\s*\/\*/g;
  let m;
  while ((m = kalip.exec(kaynak))) {
    bildir(satirNo(m.index), 5, "`&& (` sonrası ilk satırda `{/* */}` — JSX değil ifade konumunda, çalışma anında çöker");
  }
}

// ---- 6) İÇ İÇE BUTON --------------------------------------------------------------------------
// Geçersiz HTML; tarayıcı ağacı sessizce yeniden kuruyor ve tıklama olayları kayboluyor.
(function butonlar(node, butonIcinde) {
  let simdi = butonIcinde;
  const ad = (n) => {
    const t = ts.isJsxElement(n) ? n.openingElement.tagName : n.tagName;
    return t && ts.isIdentifier(t) ? t.text : "";
  };
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    if (ad(node) === "button") {
      if (butonIcinde) bildir(satirNo(node.getStart()), 6, "<button> içinde <button> — geçersiz HTML, tıklama kaybolur");
      simdi = true;
    }
  }
  ts.forEachChild(node, (c) => butonlar(c, simdi));
})(sf, false);

// ---- rapor ------------------------------------------------------------------------------------
function rapor() {
  const ADLAR = {
    1: "sözdizimi", 2: "TDZ", 3: "tanımsız isim",
    4: "JSX yorum sızıntısı", 5: "ifade konumunda JSX yorumu", 6: "iç içe buton",
  };
  if (!bulgular.length) {
    console.log("  1-6  yapısal denetim ....... TEMİZ");
    return;
  }
  bulgular.sort((a, b) => a.kod - b.kod || a.no - b.no);
  bulgular.forEach((b) => console.log(`  ✗ [${b.kod} ${ADLAR[b.kod]}] ${dosya}:${b.no}  ${b.mesaj}`));
  console.log(`  1-6  yapısal denetim ....... ${bulgular.length} BULGU`);
}
rapor();
process.exit(bulgular.length ? 1 : 0);
