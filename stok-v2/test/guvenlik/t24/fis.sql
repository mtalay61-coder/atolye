-- t24: bir firmada alış faturası + bağlı ödeme makbuzu (uygulamanın fis_kes yolu: stok + cari + kasa tek işlem).
-- psql değişkenleri: f (a/b), urun, cari, adet, fiyat, odeme. Çıktı: fiş numarası.
select public.fis_kes(jsonb_build_object(
  'istek', 'istek-' || :'f' || '-1',
  'fis', jsonb_build_object('aile', 'stok', 'tur', 'Alış', 'onek', 'AF', 'kaynak', 'Satınalma', 'cariId', :'cari', 'defter', 'Genel',
                            'paraBirimi', 'TRY', 'tutar', :adet * :fiyat,
                            'kalemler', jsonb_build_array(jsonb_build_object('urunId', :'urun', 'renk', 'Siyah', 'miktar', :adet, 'birimFiyat', :fiyat))),
  'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'h-' || :'f' || '-1', 'urunId', :'urun', 'renk', 'Siyah',
                                                                            'miktar', :adet, 'kaynak', 'Satınalma', 'cariId', :'cari'))),
  'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'c-' || :'f' || '-1', 'cari_id', :'cari', 'tarih', '2026-11-17',
                                                                            'yon', 'Alacak', 'tutar', :adet * :fiyat))),
  'bagli', jsonb_build_object(
    'fis', jsonb_build_object('aile', 'para', 'tur', 'Ödeme', 'onek', 'ÖD', 'cariId', :'cari', 'kasaHesapId', 'K1', 'tutar', :odeme),
    'kasa', jsonb_build_object('hareketler', jsonb_build_array(jsonb_build_object('id', 'k-' || :'f' || '-1', 'hesap_id', 'K1',
      'veri', jsonb_build_object('id', 'k-' || :'f' || '-1', 'tarih', '2026-11-17', 'yon', 'Çıkış', 'tutar', :odeme)))),
    'cari', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'c-' || :'f' || '-2', 'cari_id', :'cari', 'tarih', '2026-11-17',
                                                                              'yon', 'Borç', 'tutar', :odeme)))))) ->> 'fisNo';
