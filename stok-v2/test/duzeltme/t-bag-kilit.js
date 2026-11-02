#!/usr/bin/env node
// 1.744.3 DÜZELTME — siparis_canli_bag_koru ∥ başlık düzenlemesi: kilit sırası (inceleme bulgusu 1, 2 Kasım).
// 1.744.3'te alt_yaz satırları TEK TEK yazıyor: ilk satırın deyimi bitince degisiklik.tekil alınıyor, sonraki satırın
// siparis_canli_bag_koru tetikleyicisi planlamadaki Alış siparişine / rezervasyondaki siparişe FOR SHARE istiyordu — tekil'den
// SONRA yeni satır kilidi (KİLİT SIRASI KURALI ihlali). Aynı anda o siparişin başlığı (REST PATCH) güncellenirse: başlık satırı →
// deyim sonunda tekil; alt_yaz tekil → başlık satırı ⇒ kilitlenme. Ölçüm (1.744.3, doğal 100): 31 kilitlenme; F2'de 0.
// Kahin: kilitlenme 0 ve iki işlem de tamamlanır (ikisi de meşru; biri bekler). İstemcideki 40P01 otomatik tekrarı burada YOK —
// doğrudan SQL ile ölçülür, tekrar kilitlenmeyi gizleyemez.
// Kullanım: node t-bag-kilit.js   (BK_N doğal tekrar, varsayılan 100; BK_ZORLA zorlanmış tekrar, varsayılan 3)
const F = require("../f0/f11-ortak.js");
const { ON } = F;
const N = Number(process.env.BK_N || 100);
const R = Number(process.env.BK_ZORLA || 3);
const KIM = `select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true); set local role authenticated;`;
const kimlikli = (sql) => F.oturum(`begin; ${KIM} ${sql}; commit;`);
let sayac = 0;

// S1 (Satış, kalemleri yazılan) + S2 (bağın hedefi). tur = 'planlama': S2 Alış, kalemler planlama.referansNo = S2 no;
// tur = 'rezervasyon': S2 Satış, kalemler rezervasyonlar[].siparisId = S2.
function kur(tur) {
  const on = `${ON}-bk${(sayac++).toString(36)}`;
  const s2tip = tur === "planlama" ? "Alış" : "Satış";
  F.psql(`insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ('${on}-s1', 'SAT-${on}', 'Satış', 'c-yeni', 'Bekliyor'),
    ('${on}-s2', '${s2tip === "Alış" ? "ALS" : "SAT2"}-${on}', '${s2tip}', 'c-yeni', 'Bekliyor');`);
  const bag = tur === "planlama" ? { planlama: { tip: "Satınalma", referansNo: `ALS-${on}` } } : { rezervasyonlar: [{ siparisId: `${on}-s2`, miktar: 1 }] };
  // Önce bağsız 20 satır (a..), sonra bağlı 20 satır (b..): alt_yaz kimlik sırasıyla yazar → tekil bağsız satırda alınır.
  const satirlar = [];
  for (let j = 10; j < 30; j++) satirlar.push({ id: `${on}-a${j}`, siparis_id: `${on}-s1`, urun_id: "u-yeni", renk: "Siyah", miktar: 1 });
  for (let j = 10; j < 30; j++) satirlar.push({ id: `${on}-b${j}`, siparis_id: `${on}-s1`, urun_id: "u-yeni", renk: "Siyah", miktar: 1, ...bag });
  return { on, s2: `${on}-s2`, yuk: { siparis_kalemleri: { satirlar } } };
}
const altYaz = (x) => F.rpcSureli("alt_yaz", x.yuk);
const baslik = (x) => kimlikli(`update public.siparisler set ek = coalesce(ek, '{}'::jsonb) || '{"not":"başlık"}' where id = '${x.s2}'`);
const kilit = (r) => !!(r && !r.ok && /deadlock/i.test(r.hata || ""));

(async () => {
  console.log(`Bağ koruması ∥ başlık · önek ${ON} · N=${N} · zorla=${R}`);
  for (const tur of ["planlama", "rezervasyon"]) {
    // ZORLANMIŞ: tutucu S2'yi 1 sn tutar; başlık onun arkasında sıraya girer; alt_yaz tekil'i alıp S2'ye gelir.
    let kil = 0, bitmedi = 0; const ornek = [];
    for (let i = 0; i < R; i++) {
      const x = kur(tur);
      const tut = F.oturum(`begin; select 1 from public.siparisler where id = '${x.s2}' for update; select pg_sleep(1); commit;`);
      await F.uyu(200);
      const b = baslik(x);
      await F.uyu(200);
      const a = altYaz(x);
      const [ra, rb] = await Promise.all([a, b, tut]);
      if (kilit(ra) || kilit(rb)) kil += 1;
      if (!ra.ok || !rb.ok) { bitmedi += 1; if (ornek.length < 2) ornek.push({ alt_yaz: F.kisa(ra), baslik: rb.ok ? "ok" : rb.hata.slice(0, 80) }); }
    }
    F.kontrol(`BK.zorla-${tur}-kilit`, `alt_yaz (${tur} bağlı kalemler) ∥ bağın hedef siparişinin başlığı · zorlanmış ${R}: kilitlenme 0`,
      { sonra: { kilitlenme: kil, ornek }, gercek: kil, beklenen: 0 });
    F.kontrol(`BK.zorla-${tur}-tamam`, `zorlanmış ${R}: iki işlem de tamamlanır (biri bekler)`, { sonra: { tamamlanmayan: bitmedi }, gercek: bitmedi, beklenen: 0 });
    // DOĞAL: 0–9 ms rastgele aralık
    kil = 0; bitmedi = 0; const bas = Date.now();
    for (let i = 0; i < N; i++) {
      const x = kur(tur);
      const a = altYaz(x);
      await F.uyu(Math.floor(Math.random() * 10));
      const rb = await baslik(x);
      const ra = await a;
      if (kilit(ra) || kilit(rb)) kil += 1;
      if (!ra.ok || !rb.ok) bitmedi += 1;
    }
    F.kontrol(`BK.dogal-${tur}-kilit`, `alt_yaz (${tur}) ∥ başlık × ${N}: kilitlenme 0`,
      { sonra: { kilitlenme: kil, tamamlanmayan: bitmedi, sure_sn: Math.round((Date.now() - bas) / 1000) }, gercek: kil, beklenen: 0 });
  }
  F.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
