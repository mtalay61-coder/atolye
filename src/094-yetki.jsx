// ================= YETKİ KURALI =================
//
// 19 Eylül (2. madde): App'ten çıkarılan ilk SAF kural. Girdisi tanımlar, aktif kullanıcı, modül
// ve işlem tipi; çıktısı evet/hayır. Hiçbir state'e, hiçbir React kancasına bağlı değil — bu yüzden
// tek başına okunabiliyor ve tek başına test edilebiliyor.
//
// KURALLAR (sırayla):
//   1. Giriş sistemi kapalıysa (kurulum/test aşaması) hiçbir kısıtlama yok.
//   2. Kullanıcı yoksa hiçbir şey yok — giriş sistemi açıkken kimliksiz erişim olmaz.
//   3. Yönetici her şeye yetkili (rol şablonu değil, rolün kendisi).
//   4. Diğerlerinde modül × işlem kutusuna bakılır.
//
// islemTipi: "goruntuleme" | "duzenleme" | "kaydetme" | "silme"
function yetkiVarMi(tanimlar, aktifKullanici, modul, islemTipi) {
  if (!tanimlar || !tanimlar.girisAktifMi) return true;
  if (!aktifKullanici) return false;
  if (aktifKullanici.rol === "Yönetici") return true;
  const yetkiler = aktifKullanici.yetkiler || {};
  return !!(yetkiler[modul] && yetkiler[modul][islemTipi]);
}
