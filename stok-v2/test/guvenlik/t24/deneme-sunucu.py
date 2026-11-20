#!/usr/bin/env python3
# DENEME SUNUCUSU — yalnız deneme Supabase projesine bağlanan, ana projeye ve başka her yere bağlantıyı TARAYICIDA engelleyen
# yerel sunucu (18 Kasım, v1.744.25; DENEME-PROJESI.md adım 6).
#
# NEDEN SUNUCUDA (uygulamada değil): koruma, sayfayla birlikte gönderilen Content-Security-Policy başlığıdır. Tarayıcı bu
# başlıktaki `connect-src` listesinde olmayan adrese fetch / XHR / WebSocket isteğini AĞA ÇIKMADAN reddeder. Uygulama dosyası
# (atolye-erp-vX.Y.Z.html) hiç değişmez — yayın paketiyle bayt bayt aynı dosya sınanır; GitHub Pages bu başlığı göndermediği
# için yayındaki uygulamaya da hiçbir etkisi yoktur.
#
# KAPANAN YOLLAR (sınandı: deneme-provasi.js):
#   · Firma kodu ("nds" vb.): rehber önce `firmalar.json`'u (bu sunucu 404 verir), sonra GitHub'daki rehberi
#     (mtalay61-coder.github.io) dener — ikincisi CSP'yle engellenir; kod çözülemez.
#   · Gelişmiş alanına ana projenin adresi: bağlantı denemesi (/auth/v1/settings) CSP'yle engellenir; seçim yazılmaz. Ayrıca
#     bu sunucu ana projenin adresiyle hiç BAŞLAMAZ.
#   · Sonradan herhangi bir yolla ana proje seçilse bile (eski yerel kayıt vb.) bütün Supabase istekleri engellenir.
#   · Döviz kuru kaynakları ve api.anthropic.com da engellenir (deneme ortamında dışarı veri çıkmaz).
# AÇIK KALANLAR: sayfanın kendisi, React vb. modüller (esm.sh — betik yükleme, connect-src değil), yazı tipleri, deneme projesi.
#
# Engellenen her istek tarayıcı tarafından bu sunucuya bildirilir (report-uri) ve terminalde "ENGELLENDİ" diye yazılır.
# Sunucu yalnız 127.0.0.1'den dinler ve yalnız verilen uygulama dosyasını sunar (surum.json, firmalar.json vb. → 404).
#
# Kullanım:  py deneme-sunucu.py --proje https://<proje-kimliği>.supabase.co [--dosya atolye-erp-v1.744.25.html] [--port 8080]
import argparse, hashlib, http.server, json, os, re, sys

ANA_PROJE = "mqdgucoomgqcvhvgixbl"          # canlı (ana firma) projesi — bu sunucuyla ASLA kullanılmaz


def ayristir():
    p = argparse.ArgumentParser(description="Atölye ERP deneme sunucusu (yalnız deneme Supabase projesi)")
    p.add_argument("--proje", required=True, help="deneme projesinin adresi: https://<20 harfli kimlik>.supabase.co")
    p.add_argument("--dosya", default=None, help="sunulacak uygulama dosyası (varsayılan: klasördeki en yeni atolye-erp-v*.html)")
    p.add_argument("--port", type=int, default=8080)
    return p.parse_args()


def proje_kimligi(adres):
    m = re.fullmatch(r"https://([a-z0-9]{20})\.supabase\.co/?", (adres or "").strip())
    if not m:
        sys.exit("DUR: --proje yalnız https://<20 harfli kimlik>.supabase.co biçiminde olabilir (Supabase > Settings > API > Project URL).")
    if m.group(1) == ANA_PROJE:
        sys.exit("DUR: bu ANA PROJENİN (canlı) adresi. Deneme sunucusu ana projeyle çalışmaz.")
    return m.group(1)


def surum_anahtari(ad):
    return [int(x) for x in re.findall(r"\d+", ad)]


def main():
    a = ayristir()
    ref = proje_kimligi(a.proje)
    klasor = os.getcwd()                    # komut, uygulama dosyasının bulunduğu klasörde çalıştırılır
    adaylar = sorted([f for f in os.listdir(klasor) if re.fullmatch(r"atolye-erp-v[\d.]+\.html", f)], key=surum_anahtari)
    dosya = a.dosya or (adaylar[-1] if adaylar else None)
    if not dosya or not re.fullmatch(r"atolye-erp-v[\d.]+\.html", os.path.basename(dosya)) or not os.path.isfile(os.path.join(klasor, dosya)):
        sys.exit("DUR: klasörde atolye-erp-vX.Y.Z.html bulunamadı (komutu dosyanın bulunduğu klasörde çalıştırın).")
    dosya = os.path.basename(dosya)
    with open(os.path.join(klasor, dosya), "rb") as f:
        icerik = f.read()
    deneme = f"https://{ref}.supabase.co"
    csp = "; ".join([
        f"connect-src 'self' {deneme} wss://{ref}.supabase.co",
        f"img-src 'self' data: blob: {deneme}",
        f"media-src 'self' data: blob: {deneme}",
        "frame-src 'none'", "object-src 'none'", "form-action 'self'", "base-uri 'self'",
        "report-uri /csp-ihlal",
    ])

    class Isleyici(http.server.BaseHTTPRequestHandler):
        def log_message(self, *x):
            pass

        def do_GET(self):
            yol = self.path.split("?")[0]
            if yol == "/":
                self.send_response(302); self.send_header("Location", "/" + dosya); self.end_headers(); return
            if yol != "/" + dosya:
                self.send_response(404); self.send_header("Content-Type", "text/plain; charset=utf-8"); self.end_headers()
                self.wfile.write("yok (deneme sunucusu yalnız uygulama dosyasını sunar)".encode()); return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Security-Policy", csp)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(icerik)

        def do_POST(self):
            if self.path.split("?")[0] != "/csp-ihlal":
                self.send_response(404); self.end_headers(); return
            n = int(self.headers.get("Content-Length") or 0)
            try:
                r = json.loads(self.rfile.read(n) or b"{}").get("csp-report", {})
            except Exception:
                r = {}
            hedef = r.get("blocked-uri", "?")
            isaret = "  << ANA PROJE" if ANA_PROJE in hedef else ""
            print(f"ENGELLENDİ: {hedef} ({r.get('effective-directive') or r.get('violated-directive', '?')}){isaret}", flush=True)
            self.send_response(204); self.end_headers()

    print(f"deneme sunucusu · http://127.0.0.1:{a.port}/{dosya}", flush=True)
    print(f"  dosya SHA-256: {hashlib.sha256(icerik).hexdigest()}", flush=True)
    print(f"  izinli tek Supabase projesi: {deneme}  (ana proje ve diğer adresler tarayıcıda engellenir)", flush=True)
    print("  durdurmak: Ctrl+C", flush=True)
    try:
        http.server.ThreadingHTTPServer(("127.0.0.1", a.port), Isleyici).serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
