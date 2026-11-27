--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: stk_fis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama, kullanici, olusturan, olusturma, iptal, iptal_zamani, iptal_eden, iptal_sebebi, goc, ek, aile, onek, istek, defter, kasa_hesap_id, para_birimi, kur, tutar, kdv, kalemler, bagli_fis) FROM stdin;
\.


--
-- Data for Name: car_hareket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.car_hareket (id, cari_id, tarih, zaman, yon, tutar, para_birimi, odeme_sekli, vade, defter, fis_no, siparis_no, uretim_id, urun_ad, renk, aciklama, ek, olusturan, olusturma, guncelleme, goc, iptal, iptal_zamani, iptal_eden, fis_id) FROM stdin;
\.


--
-- Data for Name: cariler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cariler (id, unvan, tip, ek, pasif, telefon, vergi_no, adres, para_birimi, resim, barkod_kodu, kod, bagli_prosesler, fiyat_grubu, surum, olusturma) FROM stdin;
inc-musteri	İnceleme Müşteri	Müşteri	\N	\N	\N	\N	\N	TRY	\N	\N	\N	\N	\N	1	2026-11-26 18:35:17.978018+00
ekr-musteri	Ekran Müşteri	Müşteri	{}	f	\N	\N	\N	USD	\N	\N	\N	[]	\N	1	2026-11-26 18:47:15.25009+00
\.


--
-- Data for Name: cek_gorselleri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cek_gorselleri (id, on_yuz, arka_yuz, guncellendi) FROM stdin;
\.


--
-- Data for Name: cekler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cekler (aciklama, banka, cari_id, durum, id, olusturma, seri_no, surum, tur, tutar, vade) FROM stdin;
\.


--
-- Data for Name: cop; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cop (id, tur, baslik, veri, silen, surum, olusturma) FROM stdin;
\.


--
-- Data for Name: degisiklik; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.degisiklik (id, sayaclar, zaman) FROM stdin;
tekil	{"cariler": 2, "urunler": 2, "stk_olcu": 6, "stk_renk": 11, "tanimlar": 1, "kas_hesap": 1, "siparisler": 1, "stk_varyant": 2, "siparis_kalemleri": 1}	2026-11-26 18:47:15.25009+00
\.


--
-- Data for Name: kas_cek; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kas_cek (id, sira, veri, olusturan, guncelleme, goc, iptal, iptal_zamani, iptal_eden) FROM stdin;
\.


--
-- Data for Name: fis_cek_iz; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fis_cek_iz (fis_id, cek_id, onceki, sonraki) FROM stdin;
\.


--
-- Data for Name: fis_karsilanan_iz; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fis_karsilanan_iz (id, zaman, eposta, islem, fis_no, kalem_id, tur, onceki_karsilanan, onceki_hesap, yeni_karsilanan) FROM stdin;
\.


--
-- Data for Name: fis_sayac; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fis_sayac (onek, gun, son) FROM stdin;
\.


--
-- Data for Name: gun_sonu_gonderim; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gun_sonu_gonderim (gun, durum, zaman) FROM stdin;
\.


--
-- Data for Name: gunluk; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gunluk (id, zaman, kullanici_id, kullanici_ad, eylem, kapsam, ayrinti) FROM stdin;
\.


--
-- Data for Name: hesaplar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hesaplar (ad, banka_adi, iban, id, para_birimi, pasif, surum, tur) FROM stdin;
\.


--
-- Data for Name: hesap_hareketleri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hesap_hareketleri (id, cari_id, tutar, aciklama, ek, fis_no, hesap_id, muhasebe_bag_id, olusturma, tarih, yon) FROM stdin;
\.


--
-- Data for Name: icerik; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.icerik (anahtar, deger, dil, guncelleme) FROM stdin;
\.


--
-- Data for Name: kas_ayar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kas_ayar (id, veri, guncelleme) FROM stdin;
tekil	{}	2026-11-26 12:43:19.585472+00
\.


--
-- Data for Name: kas_hareket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kas_hareket (id, hesap_id, sira, veri, olusturan, olusturma, guncelleme, goc, iptal, iptal_zamani, iptal_eden, fis_id) FROM stdin;
\.


--
-- Data for Name: kas_hesap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kas_hesap (id, tur, sira, veri, aktif, olusturan, guncelleme, goc) FROM stdin;
K1	kasa	1	{"ad": "Merkez Kasa", "paraBirimi": "TRY"}	t	ali@atolye.local	2026-11-26 18:47:15.233383+00	f
B1	banka	2	{"ad": "Ziraat"}	t	ali@atolye.local	2026-11-26 18:47:15.233383+00	f
\.


--
-- Data for Name: lst_kayit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lst_kayit (tablo, id, sira, veri, olusturan, olusturma, guncelleme, goc, iptal, iptal_zamani, iptal_eden) FROM stdin;
\.


--
-- Data for Name: medya; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medya (alt_ar, alt_en, alt_ru, alt_tr, boyut, dosya_adi, genislik, id, olusturma, yol, yukleyen, yukseklik) FROM stdin;
\.


--
-- Data for Name: onaylar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.onaylar (id, tip, veri, durum, surum, olusturma) FROM stdin;
\.


--
-- Data for Name: profil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profil (ad_soyad, cari_hesap_id, dil, id, olusturma, rol) FROM stdin;
\.


--
-- Data for Name: silinen_arsiv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.silinen_arsiv (id, tablo, islem, satir_id, veri, silen, silen_eposta, zaman) FROM stdin;
47	tanimlar	GORUNTU	tekil	{"id": "tekil", "veri": {"renkler": [{"ad": "Siyah", "id": "r-siyah", "barkodKodu": "11"}, {"ad": "Vizon Yılan", "id": "r-vizon", "barkodKodu": "12"}], "bedenler": [{"ad": "40", "id": "b-40", "tip": "Beden", "barkodKodu": "40"}, {"ad": "41", "id": "b-41", "tip": "Beden", "barkodKodu": "41"}], "birimler": [], "asortiler": [], "prosesler": [], "girisAktifMi": true, "kullanicilar": [{"id": "u-ali", "rol": "Yönetici", "eposta": "ali@atolye.local", "kullaniciAdi": "Ali"}, {"id": "u-ayse", "rol": "Personel", "eposta": "ayse@atolye.local", "yetkiler": {"stok": {"kaydetme": true, "duzenleme": true, "goruntuleme": true}}, "kullaniciAdi": "Ayşe"}], "renkKombinasyonlari": [{"id": "k-1054", "kod": "1054", "renkIdler": ["r-siyah", "r-vizon"]}]}, "surum": 1, "guncelleme": "2026-11-26T18:31:18.713226+00:00"}	\N	\N	2026-11-26 18:47:15.244916+00
\.


--
-- Data for Name: siparisler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.siparisler (id, siparis_no, tip, cari_id, tarih, teslim_tarihi, durum, musteri_kodu, defter_tercihi, kayit_para_birimi, kayit_kurlari, ambalaj, not_metni, surum, olusturma, olusturuldu, ek) FROM stdin;
sp-inc-1	SAT-9001	satis	inc-musteri	2026-11-26	\N	Bekliyor	\N	Genel	\N	\N	\N	\N	1	2026-11-26 18:31:18.724252+00	\N	\N
\.


--
-- Data for Name: urunler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.urunler (id, ad, kategori, ek, fiyat_kurallari, kapak_resmi, mamul_tipi, pasif, renk_resimleri, satis_para_birimi, sezon_yili, birim, malzeme_tipi, olcu_tipi, alis_fiyati, alis_para_birimi, satis_fiyati, tedarikci_id, varsayilan_proses, paketleme_notu, recete, recete_gerceklesme, proses_ucretleri, ozel_kodlar, stok_no, kdv_orani, harici_barkodlar, surum, olusturma, ad_ar, ad_en, ad_ru, barkod_no, kapak_gorsel_yol, vitrin_sira, vitrinde_mi, web_aciklama_ar, web_aciklama_en, web_aciklama_ru, web_aciklama_tr, web_grup) FROM stdin;
inc-bot	İnceleme Bot	Mamul	\N	[]	\N	\N	f	{}	₺	\N	çift	\N	Beden	0	₺	0	\N	\N	\N	[]	{}	{}	{}	\N	\N	[]	1	2026-11-26 18:31:18.721104+00	\N	\N	\N	\N	\N	0	f	\N	\N	\N	\N	\N
ekr-bot	Ekran Bot	Mamul	\N	[]	\N	\N	f	{}	₺	\N	çift	\N	Beden	0	₺	0	\N	\N	\N	[]	{}	{}	{}	\N	\N	[]	1	2026-11-26 18:47:15.238013+00	\N	\N	\N	\N	\N	0	f	\N	\N	\N	\N	\N
\.


--
-- Data for Name: siparis_kalemleri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan, fiyat, para_birimi, birim, planlama, ambalaj, rezervasyonlar, sira, ek) FROM stdin;
kl-inc-40	sp-inc-1	inc-bot	İnceleme Bot	1054 - Siyah/Vizon Yılan	40	2	0	0	TRY	\N	\N	\N	[]	0	\N
kl-inc-41	sp-inc-1	inc-bot	İnceleme Bot	1054 - Siyah/Vizon Yılan	41	3	0	0	TRY	\N	\N	\N	[]	1	\N
\.


--
-- Data for Name: site_giris_kaydi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_giris_kaydi (id, cari_id, zaman, basarili) FROM stdin;
\.


--
-- Data for Name: site_hesaplari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_hesaplari (cari_id, kullanici, sifre_ozeti, olusturma, son_giris, hatali_deneme, kilit_bitis) FROM stdin;
\.


--
-- Data for Name: site_kayit_talepleri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_kayit_talepleri (id, olusturma, durum, bilgiler, kullanici, sifre_ozeti, cari_id, islenme) FROM stdin;
\.


--
-- Data for Name: site_oturumlari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_oturumlari (anahtar, cari_id, bitis) FROM stdin;
\.


--
-- Data for Name: site_talepleri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_talepleri (id, cari_id, cari_unvan, olusturma, durum, not_metni, kalemler, toplam_cift, odeme, red_sebebi) FROM stdin;
\.


--
-- Data for Name: stk_ayar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_ayar (id, aktif, gecis, geri_donus, cari_aktif, cari_gecis, cari_geri_donus, alt_aktif, alt_gecis, alt_geri_donus, kasa_aktif, kasa_gecis, kasa_geri_donus, liste_aktif, liste_gecis, liste_geri_donus, liste_tablolari, fis_aktif, fis_aktif_zamani, min_istemci_surum, siparis_durum_sunucu) FROM stdin;
tekil	t	2026-10-28 21:58:43.946507+00	\N	t	2026-10-29 05:35:51.782796+00	\N	t	2026-10-29 06:24:51.811653+00	\N	t	2026-10-29 08:05:42.380327+00	\N	t	2026-10-29 09:55:59.595845+00	\N	{teklifler,faturalar,koliler,gorevler,modeller,fis_defteri,mesajlar}	f	\N	\N	t
\.


--
-- Data for Name: stk_olcu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_olcu (id, ad, tur, aktif, guncelleme) FROM stdin;
b-40	40	Beden	t	2026-11-26 18:31:18.714802+00
b-41	41	Beden	t	2026-11-26 18:31:18.714802+00
\.


--
-- Data for Name: stk_renk; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_renk (id, ad, tur, kod, barkod_kodu, renk_kodu, aktif, guncelleme) FROM stdin;
r-siyah	Siyah	renk	\N	11	\N	t	2026-11-26 18:31:18.714802+00
r-vizon	Vizon Yılan	renk	\N	12	\N	t	2026-11-26 18:31:18.714802+00
k-1054	1054 - Siyah/Vizon Yılan	model	1054	\N	\N	t	2026-11-26 18:31:18.714802+00
srenk-b0f70f1be079	Taba	serbest	\N	\N	\N	t	2026-11-26 18:47:15.239956+00
\.


--
-- Data for Name: stk_varyant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif, olusturma) FROM stdin;
vry-inc-40	inc-bot	k-1054	b-40	0	t	2026-11-26 18:31:18.722089+00
vry-inc-41	inc-bot	k-1054	b-41	0	t	2026-11-26 18:31:18.722089+00
vry-ekr-Siyah-40	ekr-bot	r-siyah	b-40	0	t	2026-11-26 18:47:15.239956+00
vry-ekr-Siyah-41	ekr-bot	r-siyah	b-41	0	t	2026-11-26 18:47:15.239956+00
vry-ekr-Taba-40	ekr-bot	srenk-b0f70f1be079	b-40	0	t	2026-11-26 18:47:15.239956+00
vry-ekr-Taba-41	ekr-bot	srenk-b0f70f1be079	b-41	0	t	2026-11-26 18:47:15.239956+00
\.


--
-- Data for Name: stk_hareket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id, cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek, iptal, iptal_zamani, iptal_eden, gecmis_siparis_id, gecmis_kalem_id, bag_cozum_zamani) FROM stdin;
\.


--
-- Data for Name: stk_istemci_iz; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stk_istemci_iz (id, zaman, tablo, islem, surum) FROM stdin;
\.


--
-- Data for Name: stok_rezervasyonlari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stok_rezervasyonlari (id, siparis_id, miktar, tuketilen, urun_id, urun_ad, renk, beden, birim, siparis_no, uretim_no, tarih, surum) FROM stdin;
\.


--
-- Data for Name: surum; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surum (id, guncelleme, veri) FROM stdin;
\.


--
-- Data for Name: tanimlar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tanimlar (id, veri, guncelleme, surum) FROM stdin;
tekil	{"renkler": [{"ad": "Siyah", "id": "r-siyah", "barkodKodu": "11"}, {"ad": "Vizon Yılan", "id": "r-vizon", "barkodKodu": "12"}], "bedenler": [{"ad": "40", "id": "b-40", "tip": "Beden", "barkodKodu": "40"}, {"ad": "41", "id": "b-41", "tip": "Beden", "barkodKodu": "41"}], "birimler": [], "asortiler": [], "prosesler": [], "girisAktifMi": true, "kullanicilar": [{"id": "u-ali", "rol": "Yönetici", "eposta": "ali@atolye.local", "kullaniciAdi": "Ali"}, {"id": "u-ayse", "rol": "Personel", "eposta": "ayse@atolye.local", "yetkiler": {"stok": {"kaydetme": true, "duzenleme": true, "goruntuleme": true}}, "kullaniciAdi": "Ayşe"}], "giderKartlari": [{"ad": "Ekran Gelir", "id": "ekr-gelir", "tur": "gelir", "grup": "diger"}, {"ad": "Ekran Gider", "id": "ekr-gider", "tur": "gider", "grup": "yonetim"}], "renkKombinasyonlari": [{"id": "k-1054", "kod": "1054", "renkIdler": ["r-siyah", "r-vizon"]}]}	2026-11-26 18:31:18.713226+00	2
\.


--
-- Data for Name: uretim; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uretim (id, siparis_no, urun_id, asama, ek, surum, rezervasyon_siparis_id, renk, stoga_eklendi_mi, takip_kodu, model, adet, beden_miktarlari, proses_ilerleme, ambalaj, termin, hurda_telafisi_mi, hurda_kaynak_uretim_no, not_metni, olusturuldu, olusturma) FROM stdin;
\.


--
-- Data for Name: uretim_atamalari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamamlanma_tarihi, sonuc, tamir_mi, tamir_kaynak_proses, tamir_sebep, tamir_ucret, tamir_hammaddeler, barkod, ek) FROM stdin;
\.


--
-- Data for Name: uretim_silinen; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uretim_silinen (id, zaman) FROM stdin;
\.


--
-- Name: fis_karsilanan_iz_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fis_karsilanan_iz_id_seq', 1, false);


--
-- Name: silinen_arsiv_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.silinen_arsiv_id_seq', 47, true);


--
-- Name: site_giris_kaydi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.site_giris_kaydi_id_seq', 1, false);


--
-- Name: stk_istemci_iz_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stk_istemci_iz_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--


