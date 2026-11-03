#!/usr/bin/env node
// 1.744.7 — FİŞLERİ SİLİNMİŞ SİPARİŞ SİLİNEBİLMELİ (kullanıcı 3 Kasım, ALS-1001: "Bu siparişin fişleri silindi … şu anda bağlantısı
// yok, silebilmemiz gerekli"). 1.744.4'te fis_siparis_teslim_koru / fis_kalem_teslim_koru iptal edilmiş satırları da teslim geçmişi
// sayıyordu (F2 karar K1): fişi iptal edilmiş sipariş hiç silinemiyordu (KR002), "İptal" durumunda da kalıyordu.
// Kahin:
//   a) teslim → fiş iptali → sipariş iptali → silme: sipariş ve kalemi gider, iptal satırı kalır; geçmiş bağı boş, izi
//      ek.silinenSiparis'te; sahipsiz satır yok (D2a/D2b/D2e 0).
//   b) teslim → fiş iptali → (sipariş iptal edilmeden) doğrudan silme: aynı sonuç.
//   c) GERÇEK teslim (iptal edilmemiş fiş) → sipariş iptali → silme: KR002, sipariş "İptal" olarak kalır, kalem durur.
//   d) yalnız iptal satırı olan siparişin doğrudan (REST) silinmesi hâlâ KR002 — boşaltma yalnız fis_bag_coz silme dalında.
//   e) iptal satırının geçmiş bağı başka yoldan değiştirilemez (KR001).
const F = require("../f0/f11-ortak.js");
const { ON, psql } = F;
let hata = 0;
const kontrol = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] gerçek ${JSON.stringify(gercek)} · beklenen ${JSON.stringify(beklenen)}`); };
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;
const kim = (sql) => { try { psql(`\\set VERBOSITY verbose\nbegin; ${KIM} ${sql}; commit;`); return null; }
  catch (e) { return (String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/) || [])[1] || "HATA"; } };
const teslim = (s, k, adet, istek) => F.rpc("fis_kes", F.teslimYuku({ s, kalemId: k, adet, ekran: 0, istek }));
const fisIptal = (s, k, fisNo, adet) => F.rpc("fis_iptal", F.iptalYuku({ s, kalemId: k, fisNo, adet, ekran: adet }));
const bagCoz = (s, sil) => { const r = F.rpc("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo, sil }); return r.ok ? "ok" : r.kod; };
const sip = (id) => (F.jsonSorgu(`select durum from public.siparisler where id='${id}'`)[0] || { durum: "yok" }).durum;
const kalemVar = (id) => psql(`select count(*) from public.siparis_kalemleri where id='${id}'`) === "1";
const satirlar = (fis) => F.jsonSorgu(`select h.iptal, h.siparis_id, h.kalem_id, h.gecmis_siparis_id, h.gecmis_kalem_id,
  h.ek->'silinenSiparis'->>'id' as iz_siparis, h.ek->'silinenSiparis'->>'kalemId' as iz_kalem from public.stk_hareket h where h.fis_id='${fis}' order by h.id`);
const sahipsiz = (on) => { const d = F.denetim(on); return [d.D2a_sahipsiz_hareket_kalem_yok || 0, d.D2b_sahipsiz_hareket_siparis_yok || 0, d.D2e_gecmis_bag_kalem_yok || 0]; };

console.log(`t-siparis-sil · önek ${ON} · kurallar ${F.kurallarAcik() ? "açık" : "KAPALI"}`);
for (const [harf, onceIptal] of [["a", true], ["b", false]]) {
  const on = `${ON}-ss${harf}`, A = `${on}A`;
  const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0)]));
  const fis = teslim(s, A, 3, `${on}i1`).sonuc.fisNo;
  kontrol(`SS.${harf}.fis-iptal`, fisIptal(s, A, fis, 3).ok, true);
  if (onceIptal) kontrol(`SS.${harf}.siparis-iptal`, [bagCoz(s, false), sip(s.id)], ["ok", "İptal"]);
  kontrol(`SS.${harf}.sil`, bagCoz(s, true), "ok");
  kontrol(`SS.${harf}.siparis-ve-kalem-gitti`, [sip(s.id), kalemVar(A)], ["yok", false]);
  const st = satirlar(fis);
  kontrol(`SS.${harf}.iptal-satiri-kaldi-bag-bos-iz-var`, st.map((x) => [x.iptal, x.siparis_id, x.kalem_id, x.gecmis_siparis_id, x.gecmis_kalem_id, x.iz_siparis, x.iz_kalem]),
    st.map(() => [true, null, null, null, null, s.id, A]));
  kontrol(`SS.${harf}.sahipsiz-yok`, sahipsiz(on), [0, 0, 0]);
  if (harf === "a") kontrol("SS.e.gecmis-bag-baska-yoldan-degismez", ["KR001","42501"].includes(kim(`update public.stk_hareket set gecmis_siparis_id='${s.id}' where fis_id='${fis}'`)), true);
}
{
  const on = `${ON}-ssc`, A = `${on}A`;
  const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0)]));
  const fis = teslim(s, A, 3, `${on}i1`).sonuc.fisNo;
  kontrol("SS.c.siparis-iptal", bagCoz(s, false), "ok");
  kontrol("SS.c.gercek-teslimli-silinmez", bagCoz(s, true), "KR002");
  kontrol("SS.c.iptal-olarak-kaldi", [sip(s.id), kalemVar(A), satirlar(fis).map((x) => x.gecmis_kalem_id)], ["İptal", true, satirlar(fis).map(() => A)]);
}
{
  const on = `${ON}-ssd`, A = `${on}A`;
  const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0)]));
  const fis = teslim(s, A, 3, `${on}i1`).sonuc.fisNo;
  fisIptal(s, A, fis, 3); bagCoz(s, false);
  kontrol("SS.d.dogrudan-silme-red", kim(`delete from public.siparisler where id='${s.id}'`), "KR002");
  kontrol("SS.d.siparis-duruyor", sip(s.id), "İptal");
}
console.log(`── t-siparis-sil.js: ${hata === 0 ? "temiz" : hata + " kırmızı"} ──`);
process.exit(hata ? 1 : 0);
