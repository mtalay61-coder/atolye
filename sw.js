// ATÖLYE ERP — SERVİS ÇALIŞANI (24 Eylül, v1.440.0)
//
// TEK İŞİ: uygulamayı "kurulabilir" yapmak. Tarayıcı, fetch dinleyen bir servis çalışanı yoksa
// "Uygulamayı yükle" seçeneğini göstermiyor.
//
// ÖNBELLEĞE ALMIYOR — bilerek. Uygulama tek HTML dosyası ve sürüm güncellemesi başlatıcı sayfadan
// geliyor. Araya önbellek girseydi "yeni sürümü yayınladım ama eski açılıyor" sorunları başlardı;
// kazancı yok, riski çok. İstek olduğu gibi ağa gidiyor.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* araya girmiyor: tarayıcı kendi yolundan devam eder */ });
