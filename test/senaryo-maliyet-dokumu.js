// SENARYO — REÇETE MALİYET DÖKÜMÜ (kullanıcı, 21 Eylül: "stoğun para birimi ve kendi birimi ile
// tutarı ve TL tutarı; reçetede hangi para birimiyle maliyet isteniyorsa ona bölecek; ayrı bir
// alanda her birimin toplamları"). Kullanıcıya önce örnek gösterildi, onayladı ("çok iyi").
//
// Örnekle AYNI veri: kur $48,70 €55,90; deri 2,5 $ (simgeyle), bez 1,2 €, astar 18 ₺, taban 3 $,
// yapıştırıcı 25 ₺. Beklenen: toplam 368,25 ₺ = 7,56 $; dağılım $ %83 · ₺ %13 · € %5.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {const t={...TOHUM};
const muh=JSON.parse(TOHUM["muhasebe:data"]);muh.kurlar={USD:48.70,EUR:55.90};t["muhasebe:data"]=JSON.stringify(muh);
const st=JSON.parse(TOHUM["stok:items"]);
const yeni=(id,ad,fiyat,pb,birim)=>({id,ad,kategori:"Hammadde",birim,alisFiyati:fiyat,alisParaBirimi:pb,variants:[{renk:"",beden:"",miktar:100}],hareketler:[],recete:[],prosesUcretleri:{}});
st.push(yeni("h1","Süet Deri",2.5,"$","desi"),yeni("h2","Takviye Bezi",1.2,"€","m"),yeni("h3","Dana Astar",18,"₺","desi"),yeni("h4","Taban",3,"$","çift"),yeni("h5","Yapıştırıcı",25,"₺","adet"));
const bot=st.find(p=>p.id==="u2");bot.maliyetBirimi="USD";bot.prosesUcretleri={};
const r=(h,ad,m,b)=>({hammaddeUrunId:h,hammaddeAd:ad,mamulRenk:"Siyah",renk:"",beden:"",miktar:m,birim:b,proses:"Kesim"});
bot.recete=[r("h1","Süet Deri",1.3,"desi"),r("h2","Takviye Bezi",0.25,"m"),r("h3","Dana Astar",2.2,"desi"),r("h4","Taban",1,"çift"),r("h5","Yapıştırıcı",0.3,"adet")];
t["stok:items"]=JSON.stringify(st);
const {tarayici,sayfa}=await uygulamaAc(t,{hataYaz:false});const hatalar=[];const h=hatalar;sayfa.on("pageerror",e=>h.push(e.message.slice(0,150)));await sayfa.setViewportSize({width:1100,height:900});await sayfa.waitForTimeout(2500);
await sayfa.evaluate(()=>{const b=document.querySelector("[data-nav=\"Stok\"]");if(b)b.click();});await sayfa.waitForTimeout(900);
await sayfa.evaluate(()=>{const el=[...document.querySelectorAll("*")].find(e=>e.children.length===0&&(e.textContent||"").trim()==="Bot"&&e.getBoundingClientRect().width>0);let p=el;for(let i=0;i<8&&p;i++,p=p.parentElement){if(p.onclick||p.tagName==="BUTTON"){p.click();return;}}});await sayfa.waitForTimeout(1200);
await sayfa.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim() === "Maliyet"&&x.offsetParent);if(b)b.click();});await sayfa.waitForTimeout(900);
// Birim fiyat hücresi artık düzenlenebilir kutu (21 Eylül): değeri kutudan okunuyor.
const tablo=await sayfa.evaluate(()=>{const t=document.querySelector("[data-maliyet-dokumu]");return t?[...t.querySelectorAll("tr")].map(r=>[...r.children].map(c=>{const i=c.querySelector("input");const ek=c.querySelector("[data-fiyat-kaynagi]");const metin=c.textContent.replace(ek?ek.textContent:"","").trim();return i?`${Number(i.value).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})} ${metin}`.trim():metin;}).join(" | ")):null;});
const dag=await sayfa.evaluate(()=>{const d=document.querySelector("[data-maliyet-dagilim]");return d?[...d.children].map(c=>c.textContent.replace(/\s+/g," ").trim()):null;});
// MALİYET YAZDIR (21 Eylül): seçili birimde ($) kâğıt hali. Toplam fiyat $ ile yazılmalı.
  await sayfa.evaluate(() => { const b = document.querySelector("[data-maliyet-yazdir-ac]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  const yazdir = await sayfa.evaluate(() => {
    const y = document.querySelector("[data-maliyet-yazdir]");
    if (!y) return null;
    const t = document.querySelector("[data-maliyet-yazdir-toplam]");
    return { acildi: true, baslik: (y.innerText.match(/Ürün Maliyeti[^\n]*/) || [""])[0].slice(0, 40), toplamFiyat: t ? t.textContent.trim() : null,
      hammaddeSatiri: /Süet Deri/.test(y.innerText) };
  });
  await tarayici.close();
  return { hatalar, tablo, dag, yazdir };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
