#!/usr/bin/env bash
# Supabase'e tek yapıştırmada verilecek dosyayı üretir: kurulum (stok-v2.sql) + göç/geçiş işlevleri (stok-v2-goc.sql) +
# geçişin kendisi. ÜRETİLEN dosya (stok-v2-gecis-tek-dosya.sql) elle düzenlenmez; kaynaklar değişince yeniden üret.
set -euo pipefail
cd "$(dirname "$0")"
CIKTI=stok-v2-gecis-tek-dosya.sql
{
  echo "-- ====================================================================================================================="
  echo "--  STOK v2 — KURULUM + GEÇİŞ, TEK DOSYA (ÜRETİLDİ: stok-v2/tek-dosya.sh — elle düzenlemeyin)"
  echo "--  Supabase › SQL Editor › New query › bu dosyanın TAMAMI › Run."
  echo "--  ÖNCE uygulamanın v1.726.0 (ya da sonrası) yayında olmalı: eski sürüm geçişten sonra stok yazamaz."
  echo "--  Sonuçta geçiş raporu döner (taşınan ürün/varyant/fiş/hareket, tanımsız renkler, farklar)."
  echo "--  Geri dönmek için:  select jsonb_pretty(public.stk_geri_don());"
  echo "-- ====================================================================================================================="
  echo
  cat stok-v2.sql
  echo
  cat stok-v2-goc.sql
  echo
  echo "-- GEÇİŞ"
  echo "select jsonb_pretty(public.stk_gecis());"
} > "$CIKTI"
echo "üretildi: stok-v2/$CIKTI ($(wc -l < "$CIKTI") satır)"
