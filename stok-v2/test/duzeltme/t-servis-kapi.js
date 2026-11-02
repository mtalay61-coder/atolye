#!/usr/bin/env node
// 1.744.3 DÜZELTME — sürüm kapısı sunucu fonksiyonlarının yazmasını kesmemeli (inceleme bulgusu 2, 2 Kasım).
// min_istemci_surum açılınca stk_istemci_koru, x-atolye-surum başlığı taşımayan HER JWT'li yazmayı AT001 ile reddediyordu.
// Gün sonu Edge Function'ı service_role anahtarıyla gun_sonu_gonderim'e yazar, başlık göndermez → otomatik rapor sessizce durur
// (fonksiyon "kayıt yazılamadı" ile 200 döner). service_role anahtarı yalnız sunucu fonksiyonlarında (sır); kapı ESKİ UYGULAMA
// içindir, sunucu fonksiyonu için değil.
// İz tablosu (stk_istemci_iz) kapı kapalıyken HER yazma işleminde bir satır ekliyordu (sınırsız büyür); amacı hangi eski /
// sürümsüz uygulamanın hâlâ yazdığını görmek → yalnız sürüm başlığı OLMAYAN uygulama yazmasını kaydetmeli.
const assert = require("assert/strict");
const T = require("../f0/ortak");
const id = T.ON + "-sk";
T.psql(`create table if not exists public.gun_sonu_gonderim (gun text primary key, durum text, zaman timestamptz);
  grant all on public.gun_sonu_gonderim to service_role, authenticated;`);
// Canlıdaki gibi: gun-sonu.sql fiş defterinden ÖNCE kurulmuştur → kapı tetikleyicisi bu tabloda da var.
T.psql(`drop trigger if exists stk_istemci_koru on public.gun_sonu_gonderim;
  create trigger stk_istemci_koru before insert or update or delete on public.gun_sonu_gonderim for each row execute function public.stk_istemci_koru();`);
function yaz(rol, surum, sql) {
  const claims = rol === "service_role" ? { role: "service_role" } : { email: "ali@atolye.local", role: "authenticated" };
  try {
    T.psql(`\\set VERBOSITY verbose\nbegin; select set_config('request.jwt.claims','${JSON.stringify(claims)}',true);` +
      `select set_config('request.headers','${JSON.stringify(surum ? { "x-atolye-surum": surum } : {})}',true);` +
      `set local role ${rol}; ${sql}; commit;`);
    return null;
  } catch (e) { return (String(e.stderr).match(/ERROR:\s+([0-9A-Z]{5}):/) || [])[1] || "HATA"; }
}
let hata = 0;
const kontrol = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] gerçek ${JSON.stringify(gercek)} · beklenen ${JSON.stringify(beklenen)}`); };
// Güncellenecek satır bakım oturumuyla (JWT yok → kapı devre dışı) önceden yazılır: güncelleme 0 satıra düşüp tetikleyiciyi atlamasın.
T.psql(`insert into public.gun_sonu_gonderim(gun,durum) values('${id}-g','eski') on conflict do nothing;`);
try {
  T.psql("update public.stk_ayar set min_istemci_surum='1.744.3' where id='tekil'");
  kontrol("SK.servis-rolu-yazar", yaz("service_role", null, `insert into public.gun_sonu_gonderim(gun,durum) values('${id}','gönderiliyor')`), null);
  kontrol("SK.servis-rolu-gunceller", yaz("service_role", null, `update public.gun_sonu_gonderim set durum='gönderildi' where gun='${id}-g'`), null);
  kontrol("SK.surumsuz-uygulama-red", yaz("authenticated", null, `update public.gun_sonu_gonderim set durum='x' where gun='${id}-g'`), "AT001");
  kontrol("SK.eski-uygulama-red", yaz("authenticated", "1.742.1", `update public.gun_sonu_gonderim set durum='x' where gun='${id}-g'`), "AT001");
  kontrol("SK.guncel-uygulama-yazar", yaz("authenticated", "1.744.3", `update public.gun_sonu_gonderim set durum='y' where gun='${id}-g'`), null);
  T.psql("update public.stk_ayar set min_istemci_surum=null where id='tekil'");
  const izOnce = Number(T.psql("select count(*) from public.stk_istemci_iz"));
  yaz("authenticated", "1.744.3", `update public.gun_sonu_gonderim set durum='z' where gun='${id}-g'`);
  yaz("service_role", null, `update public.gun_sonu_gonderim set durum='z2' where gun='${id}-g'`);
  const izGuncel = Number(T.psql("select count(*) from public.stk_istemci_iz")) - izOnce;
  yaz("authenticated", null, `update public.gun_sonu_gonderim set durum='w' where gun='${id}-g'`);
  const izSurumsuz = Number(T.psql("select count(*) from public.stk_istemci_iz")) - izOnce - izGuncel;
  kontrol("SK.iz-yalniz-surumsuz", [izGuncel, izSurumsuz], [0, 1]);
} finally {
  T.psql("update public.stk_ayar set min_istemci_surum=null where id='tekil'");
}
console.log(`── t-servis-kapi.js: ${hata === 0 ? "temiz" : hata + " kırmızı"} ──`);
process.exit(hata ? 1 : 0);
