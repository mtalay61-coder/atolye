#!/usr/bin/env python3
# DÜZELTME ADIMI ÜRETİCİSİ (v1.730.1) — canlıda geçişi yapılmış modüllere, kurulum dosyalarını baştan çalıştırmadan, yalnız
# DEĞİŞEN işlevleri vermek için. İşlevler kaynak dosyalardan ÇIKARILIR (elle kopyalanmaz → kaynakla hep aynı); çıktı
# editor-icin.py'den geçer (Supabase SQL Editor kuralı). Kullanım: python3 duzeltme-uret.py > ham.sql (tek-dosya.sh çağırır).
import re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def islev(dosya, ad):
    s = open(dosya, encoding="utf-8").read()
    m = re.search(r"^create or replace function public\." + re.escape(ad) + r"\(", s, re.M)
    if not m:
        sys.exit(f"bulunamadı: {dosya} {ad}")
    son = s.index("end $$;", m.start()) + len("end $$;")
    return s[m.start():son]

parcalar = [
    "-- v1.730.1 DÜZELTME — baştan aşağı denetim. Yalnız işlev ve tetikleyici tanımları; veri değişmez. Tekrar çalıştırılabilir.",
    islev("stok-v2.sql", "v2_yazma_acik"),
    "revoke all on function public.v2_yazma_acik(text) from public, anon, authenticated;",
    islev("stok-v2.sql", "stk_yaz"),
    islev("stok-v2-goc.sql", "stk_goc_karsilastir"),
    "revoke all on function public.stk_goc_karsilastir() from public, anon, authenticated;",
    islev("cari-v2.sql", "car_yaz"),
    islev("cari-v2-goc.sql", "car_geri_don"),
    "revoke all on function public.car_geri_don() from public, anon, authenticated;",
    islev("alt-v2.sql", "alt_yaz"),
    islev("kasa-v2.sql", "kas_yaz"),
    islev("liste-v2.sql", "lst_yaz"),
    islev("kasa-v2.sql", "fis_yaz"),
    "revoke all on function public.fis_yaz(jsonb) from public, anon;",
    "grant execute on function public.fis_yaz(jsonb) to authenticated;",
    "revoke all on function public.degisiklik_izle_kur(text) from public, anon, authenticated;",
    open("../rls-rol.sql", encoding="utf-8").read(),
]
print("\n\n".join(parcalar))
