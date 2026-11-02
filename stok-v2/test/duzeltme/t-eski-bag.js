#!/usr/bin/env node
// 1.744.3 DÜZELTME — siparis_canli_bag_koru yalnız YENİ kurulan bağı denetlemeli (inceleme bulgusu 3, 2 Kasım).
// 1.744.3 her UPDATE'te satırdaki BÜTÜN bağları denetliyordu: koruma kurulmadan önce iptal edilmiş siparişe rezerveli eski
// üretim / kalem / koli / sipariş kaydının başka bir alanı (aşama, fiyat, not) bile değiştirilemiyordu (KR006). Kural "iptal
// edilmiş siparişe YENİ operasyon bağı kurulamaz"; var olan eski bağ denetimde görünür, çözülmesi ayrı iş.
// Kahin: eski bağlı satırın bağ dışı alanı değişir; bağ korunur; aynı iptal siparişe YENİ bağ (başka satırda ya da bağ alanını
// değiştirerek) hâlâ KR006; bağı kaldırmak serbest.
const assert = require("assert/strict");
const T = require("../f0/ortak");
const id = T.ON + "-eb";
let hata = 0;
const kontrol = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] gerçek ${JSON.stringify(gercek)} · beklenen ${JSON.stringify(beklenen)}`); };
function kim(sql) {
  try { T.psql(`\\set VERBOSITY verbose\nbegin; select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated; ${sql}; commit;`); return null; }
  catch (e) { return (String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/) || [])[1] || "HATA"; }
}
T.psql("alter table public.uretim add column if not exists rezervasyon_siparis_id text");
// ESKİ VERİ (koruma kurulmadan önce; JWT'siz bakım oturumu tetikleyiciyi atlar): iptal edilmiş sipariş + ona bağlı kayıtlar
T.psql(`insert into public.siparisler(id,siparis_no,tip,cari_id,durum) values('${id}-ipt','SAT-${id}','Satış','c-yeni','İptal'),
    ('${id}-ali','ALS-${id}','Alış','c-yeni','İptal'), ('${id}-s','SAT2-${id}','Satış','c-yeni','Bekliyor');
  insert into public.uretim(id,rezervasyon_siparis_id) values('${id}-u','${id}-ipt');
  insert into public.siparis_kalemleri(id,siparis_id,urun_id,renk,miktar,rezervasyonlar,planlama) values
    ('${id}-k','${id}-s','u-yeni','Siyah',5,'[{"siparisId":"${id}-ipt","miktar":2}]','{"tip":"Satınalma","referansNo":"ALS-${id}"}');`);
kontrol("EB.uretim-baska-alan", kim(`update public.uretim set ek = coalesce(ek,'{}'::jsonb) || '{"asama":"Dikim"}' where id='${id}-u'`), null);
// Kalem tablosuna doğrudan yazma alt modülü açıkken kapalı (42501); kalem yazmaları alt_yaz'dan geçer.
kontrol("EB.kalem-alt_yaz-fiyat", (() => { const r = T.rpc("alt_yaz", { siparis_kalemleri: { satirlar: [{ id: `${id}-k`, fiyat: 130 }] } }); return r.ok ? null : (r.kod || r.hata); })(), null);
kontrol("EB.bag-korundu", T.psql(`select rezervasyon_siparis_id from public.uretim where id='${id}-u'`), `${id}-ipt`);
kontrol("EB.yeni-bag-red-uretim", kim(`insert into public.uretim(id,rezervasyon_siparis_id) values('${id}-u2','${id}-ipt')`), "KR006");
kontrol("EB.yeni-bag-red-rezervasyon-eklenir", (() => { const r = T.rpc("alt_yaz", { siparis_kalemleri: { satirlar: [{ id: `${id}-k`, rezervasyonlar: [{ siparisId: `${id}-ipt`, miktar: 2 }, { siparisId: `${id}-ali`, miktar: 1 }] }] } }); return r.ok ? null : (r.kod || r.hata); })(), "KR006");
kontrol("EB.bag-kaldirmak-serbest", kim(`update public.uretim set rezervasyon_siparis_id = null where id='${id}-u'`), null);
kontrol("EB.kaldirilan-bag-geri-kurulamaz", kim(`update public.uretim set rezervasyon_siparis_id = '${id}-ipt' where id='${id}-u'`), "KR006");
console.log(`── t-eski-bag.js: ${hata === 0 ? "temiz" : hata + " kırmızı"} ──`);
process.exit(hata ? 1 : 0);
