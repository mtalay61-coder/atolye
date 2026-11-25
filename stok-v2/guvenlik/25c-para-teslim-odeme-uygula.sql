-- =====================================================================================================================
--  25c-para-teslim-odeme-uygula.sql — G-25 EK: PARA YETKİLİSİNİN TESLİMİ ÇİFT ÖDEME KORUMASINA GİRER (YAZAR; G-25 + 25b uygulanmış vt.)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
--  NEDEN (deneme projesi, 25 Kasım): cari / muhasebe kaydetme yetkilisinin (Yönetici dahil) ÜRT teslimi onaydan muaf olduğu için ödeme
--  defterini (isc_odeme) de tamamen atlıyordu: Yönetici teslimleri deftere girmiyor, aynı işe ikinci (ör. eşzamanlı çift basış) Yönetici
--  teslimi sunucuda durdurulmuyordu. Kullanıcı: "Yetki nedeniyle onaydan muaf olmak, çift ödemeyi önleyen kaydı atlamak anlamına gelmemeli".
--  NE YAPAR: g25_uretim_butunluk (yeni) + g25_fis_cari_yetki_tek (PARA dalı bütünlüğü çağırır). Onay / ücret denetimi PARA için yine YOK;
--  teslim edilen atama sunucuda tamamlanmamış ve ödenmemiş olmalı, işçilik satırı ödeme defterine girer. Veri silmez; geçmiş Yönetici
--  teslimlerine (deftere girmemiş) dokunmaz.
--  ÖNKOŞUL: postgres; G-25 + 25b uygulanmış (ucr_onay.gecersiz var); g25_uretim_butunluk henüz yok. Tam paket bunu ZATEN içerir.
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri).
-- =====================================================================================================================
begin;

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is null or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ucr_onay' and column_name = 'gecersiz') then
    raise exception 'G-25 + 25b uygulanmamış — önce onlar (tam paket bunu zaten içerir). Hiçbir şey değişmedi.';
  end if;
  if to_regprocedure('public.g25_uretim_butunluk(jsonb, jsonb, jsonb)') is not null then
    raise exception '25c zaten uygulanmış — sessizce değiştirilmez. Hiçbir şey değişmedi.';
  end if;
  create or replace function public.g25_uretim_butunluk(f jsonb, p_cari jsonb, p_alt jsonb) returns text
  language plpgsql volatile security definer set search_path = public as '
  declare
    uid_ text := nullif(f ->> ''uretimId'', '''');
    v_istek text := nullif(f ->> ''__istek'', '''');
    u jsonb; adet numeric; x jsonb; a jsonb; c jsonb; e jsonb; m numeric; b numeric; ap jsonb; v_ozet jsonb;
    v_kok text; v_id text; v_toplam numeric; v_tamir boolean; v_zincir numeric; kullanilan text[] := ''{}'';
  begin
    if uid_ is null then return null; end if;
    select to_jsonb(y) into u from public.uretim y where y.id::text = uid_;
    if u is null then return null; end if;
    adet := coalesce(public.stk_sayi(u ->> ''adet''), public.stk_sayi(u -> ''ek'' ->> ''adet''));
    for x in select z from jsonb_array_elements(public.stk_dizi(p_alt -> ''uretim_atamalari'' -> ''satirlar'')) z
              where coalesce((z ->> ''tamamlandi_mi'')::boolean, false) order by z ->> ''id'' loop
      v_kok := public.g25_atama_koku(x ->> ''id'');
      if v_kok is null then continue; end if;   -- sunucuda olmayan satır (yeni kalan parça değil, tamamlanan): bağ yok
      perform pg_advisory_xact_lock(hashtextextended(''g25_isc:zincir:'' || v_kok, 0));
      select to_jsonb(y) into a from public.uretim_atamalari y where y.id::text = x ->> ''id'';
      if a is null or a ->> ''uretim_id'' is distinct from uid_ then continue; end if;
      if coalesce((a ->> ''tamamlandi_mi'')::boolean, false) then
        return format(''atama %s başka bir teslimle zaten tamamlanmış — ikinci teslim / ödeme yazılmaz'', a ->> ''id'');
      end if;
      if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = ''atama:'' || (a ->> ''id'') and not fs.iptal) then
        return format(''atama %s için işçilik zaten ödenmiş'', a ->> ''id'');
      end if;
      -- bu atamanın kişisine yazılan (henüz eşlenmemiş) işçilik satırı
      c := null;
      select z into c from jsonb_array_elements(public.stk_dizi(p_cari -> ''satirlar'')) z
       where z ->> ''cari_id'' = a ->> ''personel_id'' and coalesce(z ->> ''uretim_id'', '''') = uid_ and coalesce(z ->> ''yon'', '''') = ''Alacak''
         and coalesce(z -> ''ek'' ->> ''islemTipi'', '''') = ''İşçilik'' and not (z ->> ''id'' = any (kullanilan))
       order by z ->> ''id'' limit 1;
      if c is null then continue; end if;   -- işçiliksiz teslim (ör. bölüm personeli): yalnız tamamlanma
      e := case when jsonb_typeof(c -> ''ek'') = ''object'' then c -> ''ek'' else ''{}''::jsonb end;
      m := public.stk_sayi(e ->> ''miktar''); b := public.stk_sayi(e ->> ''birimFiyat'');
      if m is null or m <= 0 then return format(''işçilik satırı %s miktarı eksik'', c ->> ''id''); end if;
      if m > coalesce(public.stk_sayi(a ->> ''miktar''), 0) + 0.000001 then
        return format(''işçilik miktarı (%s) atamanın kayıtlı miktarından (%s) büyük'', m, a ->> ''miktar'');
      end if;
      v_tamir := coalesce((a ->> ''tamir_mi'')::boolean, false);
      v_zincir := coalesce(public.stk_sayi(public.g25_ucret_guncel(''atama|'' || v_kok) ->> ''miktar''), public.stk_sayi(a ->> ''miktar''));
      select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.kok = v_kok and not fs.iptal;
      if v_toplam + m > v_zincir + 0.000001 then
        return format(''bu iş için ödenen (%s + %s) işin toplam miktarını (%s) aşıyor'', v_toplam, m, v_zincir);
      end if;
      if not v_tamir then
        select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
         where o.uretim_id = uid_ and o.proses = a ->> ''proses'' and not o.tamir and not fs.iptal;
        if adet is not null and v_toplam + m > adet + 0.000001 then
          return format(''%s için ödenen işçilik (%s + %s) üretim adedini (%s) aşıyor'', a ->> ''proses'', v_toplam, m, adet);
        end if;
      end if;
      kullanilan := kullanilan || (c ->> ''id'');
      v_id := ''atama:'' || (a ->> ''id'');
      delete from public.isc_odeme where id = v_id;
      insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
      values (v_id, v_kok, uid_, a ->> ''proses'', v_tamir, c ->> ''cari_id'', m, coalesce(b, 0), v_istek);
    end loop;
    -- ara proses: çözümdeki cariye yazılan satır o adımın TEK ödemesi (ücret serbest)
    for c in select z from jsonb_array_elements(public.stk_dizi(p_cari -> ''satirlar'')) z
              where not (z ->> ''id'' = any (kullanilan)) and coalesce(z ->> ''uretim_id'', '''') = uid_ and coalesce(z -> ''ek'' ->> ''islemTipi'', '''') = ''İşçilik'' loop
      for ap in select y from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> ''araProsesler'') = ''array'' then t.veri -> ''araProsesler'' else ''[]''::jsonb end) y
                 where t.id = ''tekil'' loop
        v_ozet := public.g25_ucret_guncel(''ara|'' || (u ->> ''urun_id'') || ''|'' || (ap ->> ''id''));
        if v_ozet is null or v_ozet ->> ''cari'' is distinct from c ->> ''cari_id'' then continue; end if;
        v_id := ''ara:'' || uid_ || '':'' || (ap ->> ''id'');
        perform pg_advisory_xact_lock(hashtextextended(''g25_isc:'' || v_id, 0));
        if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = v_id and not fs.iptal) then
          return format(''%s ara prosesinin işçiliği bu üretim için zaten ödenmiş'', ap ->> ''ad'');
        end if;
        e := case when jsonb_typeof(c -> ''ek'') = ''object'' then c -> ''ek'' else ''{}''::jsonb end;
        delete from public.isc_odeme where id = v_id;
        insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
        values (v_id, null, uid_, ap ->> ''ad'', false, c ->> ''cari_id'', coalesce(public.stk_sayi(e ->> ''miktar''), 0), coalesce(public.stk_sayi(e ->> ''birimFiyat''), 0), v_istek);
        exit;
      end loop;
    end loop;
    return null;
  end ';
  create or replace function public.g25_fis_cari_yetki_tek(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns void
  language plpgsql security definer set search_path = public as '
  declare
    onek text := coalesce(f ->> ''onek'', '''');
    ne text := coalesce(nullif(f ->> ''tur'', ''''), onek, ''fiş'');
    grup text;
    hata text;
    c jsonb; v_anahtar text; v_var text;
  begin
    if jsonb_array_length(public.stk_dizi(p_cari -> ''satirlar'')) = 0 then return; end if;
    -- MESAİ ÇİFT TAHAKKUK (K2, bütünlük — yetkiden bağımsız): aynı personel + ay anahtarıyla geçerli tahakkuk varsa ikinci MS yazılmaz.
    -- Anahtar başına kilit: iki eşzamanlı istek (eski yoldan cari kartı + mesai_onayla, ya da iki onay) sırayla denetlenir.
    if onek = ''MS'' then
      for c in select x from jsonb_array_elements(public.stk_dizi(p_cari -> ''satirlar'')) x loop
        v_anahtar := nullif(c -> ''ek'' ->> ''mesaiAnahtari'', '''');
        if v_anahtar is not null then
          perform pg_advisory_xact_lock(hashtextextended(''g25_mesai:'' || (c ->> ''cari_id'') || '':'' || v_anahtar, 0));
          v_var := public.g25_mesai_tahakkuku(c ->> ''cari_id'', v_anahtar);
          if v_var is not null then
            raise exception ''Bu personelin bu ayki mesaisi zaten tahakkuk etmiş (%) — ikinci kez yazılmaz'', v_var using errcode = ''KR014'';
          end if;
        end if;
      end loop;
    end if;
    if auth.jwt() is null then return; end if;
    if coalesce(public.yetki_var_mi(array[''cari'', ''muhasebe''], ''kaydetme''), false) then
      -- PARA yetkilisi onaydan / ücret denetiminden muaf, ÇİFT ÖDEME korumasından değil (25 Kasım): teslim edilen atama / ara proses
      -- adımı ödeme defterine girer; aynı iş ikinci kez ödenemez.
      if onek = ''ÜRT'' then
        hata := public.g25_uretim_butunluk(f, p_cari, p_alt);
        if hata is not null then
          raise exception ''Üretim teslimi kaydedilmedi: %'', hata using errcode = ''KR016'';
        end if;
      end if;
      return;
    end if;
    grup := case when onek in (''AF'', ''SF'') and coalesce(f ->> ''aile'', '''') = ''stok'' and jsonb_array_length(public.stk_dizi(p_stok -> ''satirlar'')) > 0 then ''stok''
                 when onek = ''ÜRT'' then ''uretim'' else ''para'' end;
    if grup = ''para'' then
      perform public.g25_yetki_iste(array[''cari'', ''muhasebe''], ''kaydetme'', ne || '' (cari hareketi)'');
    elsif grup = ''stok'' then
      perform public.g25_yetki_iste(array[''stok'', ''fisler'', ''siparis'', ''uretim''], ''kaydetme'', ne);
      hata := public.g25_stok_bagi(f, p_stok, p_cari, p_kasa);
    else
      perform public.g25_yetki_iste(array[''uretim'', ''stok'', ''fisler'', ''siparis''], ''kaydetme'', ne);
      if nullif(f ->> ''__istek'', '''') is null then raise exception ''Üretim fişinde istek kimliği yok'' using errcode = ''22023''; end if;
      hata := public.g25_uretim_bagi(f, p_cari, p_kasa, p_alt);
    end if;
    if hata is not null then
      raise exception ''Cari hareketi gerçek bir % işlemine bağlı değil (%) — bu kayıt için cari veya muhasebe kaydetme yetkisi gerekir'',
        case grup when ''stok'' then ''stok'' else ''üretim'' end, hata using errcode = ''42501'';
    end if;
  end ';
  revoke all on function public.g25_uretim_butunluk(jsonb, jsonb, jsonb) from public, anon, authenticated;
  revoke all on function public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
  if has_function_privilege('authenticated', 'public.g25_uretim_butunluk(jsonb, jsonb, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb)', 'execute') then
    raise exception 'iç fonksiyon dışarıya açık kaldı';
  end if;
  create table if not exists guvenlik.g25c_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25c_sonuc from public, anon, authenticated;
  delete from guvenlik.g25c_sonuc;
  insert into guvenlik.g25c_sonuc values
    (1, 'g25_uretim_butunluk', 'kuruldu (dışarıya kapalı)'),
    (2, 'g25_fis_cari_yetki_tek', 'PARA dalı ödeme defterine yazıyor'),
    (99, 'GENEL', 'UYGULANDI — 25-sonra-dogrula-salt-okur.sql ve 25-onkosul-salt-okur.sql ile doğrulayın');
end $$;

select sira, kontrol, deger from guvenlik.g25c_sonuc order by sira;

commit;
