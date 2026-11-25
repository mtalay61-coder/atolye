-- =====================================================================================================================
--  25d-tamir-ilk-iscilik-uygula.sql — G-25 EK: B KURALI (YAZAR; G-25 + 25b + 25c uygulanmış veritabanı için)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
--  NEDEN (deneme 10005 / 10006, kullanıcı 25 Kasım): "8 çift sağlam 2 çift tamir var, 8 çift ücret ödeyeceğine 10 çift ücret ödüyor …
--  B seçeneğini uygulayalım. İlk işçilik her çift için yalnız bir kez ödensin; tamire ayrılan çiftlerin ilk işçiliği sağlam dönüşe kadar
--  beklesin. Tamiri başka usta yaparsa ilk işçilik ve tamir ücretinin alıcıları doğru ayrılsın. Tamir ücreti ayrıca ve açıkça onaylansın."
--  NE YAPAR: g25_alt_saglam + g25_ilk_atama (yeni); g25_uretim_bagi ve g25_uretim_butunluk: teslimde işçilik ≤ SAĞLAM adet (tamire ayrılan /
--  hurda ödenmez); ek.ilkIscilik satırı (tamirden sağlam dönen) tamirin İLK işini yapana, ilk işin onaylı ücretiyle, her tamir parçası bir kez
--  (isc_odeme 'ilk:<tamir>'), ilk işin zincir ve proses tavanları (defter dışı geçmiş dahil). Tamir ücreti tamir işinin kendi onayıyla.
--  İSTEMCİ: 1.745.2 ile birlikte (1.745.1 tamirli teslimde 10'u öder → bu sunucu REDDEDER). Veri silmez; geçmiş kayıtlara dokunmaz.
--  ÖNKOŞUL: postgres; G-25 + 25b + 25c uygulanmış (g25_gecmis_iscilik var); g25_alt_saglam henüz yok. Tam paket bunu ZATEN içerir.
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri).
-- =====================================================================================================================
begin;

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regprocedure('public.g25_gecmis_iscilik(text, text)') is null or to_regprocedure('public.g25_uretim_butunluk(jsonb, jsonb, jsonb)') is null then
    raise exception 'G-25 + 25b + 25c uygulanmamış — önce onlar (tam paket bunu zaten içerir). Hiçbir şey değişmedi.';
  end if;
  if to_regprocedure('public.g25_alt_saglam(jsonb, text)') is not null then
    raise exception '25d zaten uygulanmış — sessizce değiştirilmez. Hiçbir şey değişmedi.';
  end if;
  create or replace function public.g25_alt_saglam(p_alt jsonb, p_atama text) returns numeric
  language sql immutable set search_path = public as '
    select case when jsonb_typeof(x -> ''sonuc'') = ''object'' and jsonb_typeof(x -> ''sonuc'' -> ''saglam'') = ''object''
                then (select coalesce(sum(public.stk_sayi(v)), 0) from jsonb_each_text(x -> ''sonuc'' -> ''saglam'') as t(k, v))
                else coalesce(public.stk_sayi(x ->> ''miktar''), 0) end
      from jsonb_array_elements(public.stk_dizi(p_alt -> ''uretim_atamalari'' -> ''satirlar'')) x
     where x ->> ''id'' = p_atama
     limit 1
  ';
  create or replace function public.g25_ilk_atama(p_atama text) returns text
  language plpgsql stable security definer set search_path = public as '
  declare
    a jsonb; v_id text := p_atama; n int := 0;
  begin
    loop
      n := n + 1;
      if v_id is null or n > 50 then return null; end if;
      select to_jsonb(x) into a from public.uretim_atamalari x where x.id::text = v_id;
      if a is null then return null; end if;
      if not coalesce((a ->> ''tamir_mi'')::boolean, false) then return a ->> ''id''; end if;
      v_id := coalesce(nullif(a -> ''ek'' ->> ''tamirKaynakAtamaId'', ''''), nullif(a -> ''ek'' ->> ''kismiKalanKaynak'', ''''));
    end loop;
  end ';
  create or replace function public.g25_uretim_bagi(f jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns text
  language plpgsql volatile security definer set search_path = public as '
  declare
    satirlar jsonb := public.stk_dizi(p_cari -> ''satirlar'');
    uid_ text := nullif(f ->> ''uretimId'', '''');
    v_istek text := nullif(f ->> ''__istek'', '''');
    u jsonb; adet numeric; c jsonb; e jsonb; m numeric; b numeric; t numeric;
    a jsonb; ap jsonb; v_ozet jsonb; v_anahtar text; v_hata text; v_id text; v_proses text; v_kok text;
    kullanilan text[] := ''{}''; v_toplam numeric; v_tamir boolean; k jsonb; v_ilk text; kullanilan_ilk text[] := ''{}'';
  begin
    if jsonb_array_length(public.stk_dizi(p_kasa -> ''hareketler'')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> ''cekler'')) > 0 then
      return ''üretim fişinde kasa / çek satırı var'';
    end if;
    if uid_ is null then return ''fişin üretim kaydı yok''; end if;
    select to_jsonb(x) into u from public.uretim x where x.id::text = uid_;
    if u is null then return format(''üretim kaydı %s sunucuda yok'', uid_); end if;
    adet := coalesce(public.stk_sayi(u ->> ''adet''), public.stk_sayi(u -> ''ek'' ->> ''adet''));
    for c in select x from jsonb_array_elements(satirlar) x loop
      e := case when jsonb_typeof(c -> ''ek'') = ''object'' then c -> ''ek'' else ''{}''::jsonb end;
      if coalesce(c ->> ''uretim_id'', '''') <> uid_ then return format(''işçilik satırı %s başka üretim kaydına bağlı'', c ->> ''id''); end if;
      if coalesce(e ->> ''islemTipi'', '''') <> ''İşçilik'' then return format(''cari satırı %s işçilik değil'', c ->> ''id''); end if;
      if coalesce(c ->> ''yon'', '''') <> ''Alacak'' then return format(''işçilik satırı %s yönü Alacak değil'', c ->> ''id''); end if;
      if coalesce(c ->> ''para_birimi'', ''TRY'') <> ''TRY'' then return format(''işçilik satırı %s TL değil'', c ->> ''id''); end if;
      m := public.stk_sayi(e ->> ''miktar''); b := public.stk_sayi(e ->> ''birimFiyat''); t := public.stk_sayi(c ->> ''tutar'');
      if m is null or b is null or t is null or m <= 0 or b <= 0 then return format(''işçilik satırı %s miktar / ücret eksik'', c ->> ''id''); end if;
      if abs(m * b - t) > 0.011 then return format(''işçilik satırı %s tutarı miktar × ücretten farklı'', c ->> ''id''); end if;
      if adet is not null and m > adet + 0.000001 then return format(''işçilik satırı %s miktarı üretim adedinden (%s) büyük'', c ->> ''id'', adet); end if;
      v_hata := null; v_id := null;
      -- (e) İLK İŞÇİLİK (B kuralı, 25 Kasım): tamirden SAĞLAM dönen çiftin ilk işçiliği. Satır ek.ilkIscilik ile işaretli; bu istekte
      -- tamamlanan, sunucuda kayıtlı, tamamlanmamış bir TAMİR atamasına bağlanır; alıcı o tamirin İLK İŞİNİ yapan kişi (sunucudaki
      -- kayıttan), ücret ilk işin ONAYLI ücreti, miktar ≤ bu teslimdeki sağlam; ilk işin zincir ve proses tavanları; her tamir parçası bir kez.
      if coalesce((e ->> ''ilkIscilik'')::boolean, false) then
        for a in select to_jsonb(s) from public.uretim_atamalari s
                  where s.uretim_id::text = uid_ and coalesce(s.tamir_mi, false) and not coalesce(s.tamamlandi_mi, false)
                    and s.id::text in (select x ->> ''id'' from jsonb_array_elements(public.stk_dizi(p_alt -> ''uretim_atamalari'' -> ''satirlar'')) x
                                        where coalesce((x ->> ''tamamlandi_mi'')::boolean, false))
                    and not (s.id::text = any (kullanilan_ilk))
                  order by s.id loop
          v_ilk := public.g25_ilk_atama(a ->> ''id'');
          if v_ilk is null then v_hata := format(''tamir %s için ilk iş bulunamadı'', a ->> ''id''); continue; end if;
          select to_jsonb(y) into k from public.uretim_atamalari y where y.id::text = v_ilk;
          if k ->> ''personel_id'' is distinct from c ->> ''cari_id'' then
            v_hata := format(''ilk işçilik alıcısı (%s) tamirin ilk işini yapan kişi (%s) değil'', c ->> ''cari_id'', k ->> ''personel_id''); continue;
          end if;
          v_kok := public.g25_atama_koku(v_ilk);
          perform pg_advisory_xact_lock(hashtextextended(''g25_isc:zincir:'' || v_kok, 0));
          if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = ''ilk:'' || (a ->> ''id'') and not fs.iptal) then
            v_hata := format(''tamir %s için ilk işçilik zaten ödenmiş'', a ->> ''id''); continue;
          end if;
          if coalesce((select tamamlandi_mi from public.uretim_atamalari where id::text = a ->> ''id''), false) then
            v_hata := format(''tamir %s başka bir teslimle tamamlanmış'', a ->> ''id''); continue;
          end if;
          if m > coalesce(public.g25_alt_saglam(p_alt, a ->> ''id''), 0) + 0.000001 then
            v_hata := format(''ilk işçilik miktarı (%s) tamirden sağlam dönen adetten (%s) büyük'', m, public.g25_alt_saglam(p_alt, a ->> ''id'')); continue;
          end if;
          v_proses := k ->> ''proses'';
          v_anahtar := ''atama|'' || v_kok;
          v_ozet := public.g25_ucret_guncel(v_anahtar);
          if not public.g25_onayli(v_anahtar) then
            v_hata := format(''ilk iş (%s, %s adet × %s ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra değişti'', v_proses, v_ozet ->> ''miktar'', coalesce(v_ozet ->> ''ucret'', ''tanımsız'')); continue;
          end if;
          if abs((v_ozet ->> ''ucret'')::numeric - b) > 0.000001 then
            v_hata := format(''ilk işçilik ücreti %s ilk işin onaylı ücretinden (%s) farklı'', b, v_ozet ->> ''ucret''); continue;
          end if;
          select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.kok = v_kok and not fs.iptal;
          if v_toplam + m > (v_ozet ->> ''miktar'')::numeric + 0.000001 then
            v_hata := format(''ilk iş için ödenen (%s + %s) onaylanan miktarı (%s) aşıyor'', v_toplam, m, v_ozet ->> ''miktar''); continue;
          end if;
          select coalesce(sum(o.miktar), 0) + public.g25_gecmis_iscilik(uid_, v_proses) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
           where o.uretim_id = uid_ and o.proses = v_proses and not o.tamir and not fs.iptal;
          if adet is not null and v_toplam + m > adet + 0.000001 then
            v_hata := format(''%s için ödenen işçilik (%s + %s; defter dışı geçmiş teslimler dahil) üretim adedini (%s) aşıyor'', v_proses, v_toplam, m, adet); continue;
          end if;
          v_hata := public.g25_iscilik_carisi(c ->> ''cari_id'', v_proses, true);
          if v_hata is not null then continue; end if;
          v_id := ''ilk:'' || (a ->> ''id'');
          kullanilan_ilk := kullanilan_ilk || (a ->> ''id'');
          delete from public.isc_odeme where id = v_id;
          insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
          values (v_id, v_kok, uid_, v_proses, false, c ->> ''cari_id'', m, b, v_istek);
          exit;
        end loop;
        if v_id is null then
          return coalesce(v_hata, format(''ilk işçilik satırı %s tamirden sağlam dönen kayıtlı bir işe bağlı değil'', c ->> ''id''));
        end if;
        continue;
      end if;
      -- (a) Teslim edilen atama (kayıtlı, bu üretimin, tamamlanmamış, istek onu tamamlıyor, kişisi satırın carisi). Değerler KAYITLI satırdan.
      for a in select to_jsonb(s) from public.uretim_atamalari s
                where s.uretim_id::text = uid_ and s.personel_id::text = c ->> ''cari_id'' and not coalesce(s.tamamlandi_mi, false)
                  and s.id::text in (select x ->> ''id'' from jsonb_array_elements(public.stk_dizi(p_alt -> ''uretim_atamalari'' -> ''satirlar'')) x
                                      where coalesce((x ->> ''tamamlandi_mi'')::boolean, false))
                  and not (s.id::text = any (kullanilan))
                order by s.id loop
        v_kok := public.g25_atama_koku(a ->> ''id'');
        -- ZİNCİR KİLİDİ: aynı işin (kök + kalan parçalar) teslimleri sırayla — ikinci teslim birincinin ödemesini görür.
        perform pg_advisory_xact_lock(hashtextextended(''g25_isc:zincir:'' || v_kok, 0));
        if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
                    where o.id = ''atama:'' || (a ->> ''id'') and not fs.iptal) then
          v_hata := format(''atama %s için işçilik zaten ödenmiş'', a ->> ''id''); continue;
        end if;
        -- kilitten SONRA yeniden oku (bekleyen öteki teslim atamayı tamamlamış olabilir)
        if coalesce((select tamamlandi_mi from public.uretim_atamalari where id::text = a ->> ''id''), false) then
          v_hata := format(''atama %s başka bir teslimle tamamlanmış'', a ->> ''id''); continue;
        end if;
        if m > coalesce(public.stk_sayi(a ->> ''miktar''), 0) + 0.000001 then
          v_hata := format(''işçilik miktarı (%s) atamanın kayıtlı miktarından (%s) büyük'', m, a ->> ''miktar''); continue;
        end if;
        -- B kuralı: tamire ayrılan çiftin ilk işçiliği bu teslimde ödenmez (sağlam dönünce, ilk ustaya); hurda hiç ödenmez.
        if m > coalesce(public.g25_alt_saglam(p_alt, a ->> ''id''), 0) + 0.000001 then
          v_hata := format(''işçilik miktarı (%s) bu teslimdeki sağlam adetten (%s) büyük — tamire ayrılan çiftin işçiliği sağlam dönünce, hurda hiç ödenmez'',
            m, public.g25_alt_saglam(p_alt, a ->> ''id'')); continue;
        end if;
        v_proses := a ->> ''proses'';
        v_tamir := coalesce((a ->> ''tamir_mi'')::boolean, false);
        v_anahtar := ''atama|'' || v_kok;
        v_ozet := public.g25_ucret_guncel(v_anahtar);
        if not public.g25_onayli(v_anahtar) then
          v_hata := format(''%s%s işi (%s adet × %s ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra miktar / kişi / ücret değişti'',
            v_proses, case when v_tamir then '' tamir'' else '''' end, v_ozet ->> ''miktar'', coalesce(v_ozet ->> ''ucret'', ''tanımsız'')); continue;
        end if;
        if abs((v_ozet ->> ''ucret'')::numeric - b) > 0.000001 then
          v_hata := format(''ücret %s onaylı ücretten (%s) farklı'', b, v_ozet ->> ''ucret''); continue;
        end if;
        select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
         where o.kok = v_kok and not fs.iptal;
        if v_toplam + m > (v_ozet ->> ''miktar'')::numeric + 0.000001 then
          v_hata := format(''bu iş için ödenen (%s + %s) onaylanan miktarı (%s) aşıyor'', v_toplam, m, v_ozet ->> ''miktar''); continue;
        end if;
        if not v_tamir then
          select coalesce(sum(o.miktar), 0) + public.g25_gecmis_iscilik(uid_, v_proses) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
           where o.uretim_id = uid_ and o.proses = v_proses and not o.tamir and not fs.iptal;
          if adet is not null and v_toplam + m > adet + 0.000001 then
            v_hata := format(''%s için ödenen işçilik (%s + %s; defter dışı geçmiş teslimler dahil) üretim adedini (%s) aşıyor'', v_proses, v_toplam, m, adet); continue;
          end if;
        end if;
        v_hata := public.g25_iscilik_carisi(c ->> ''cari_id'', v_proses, true);
        if v_hata is not null then continue; end if;
        v_id := ''atama:'' || (a ->> ''id'');
        kullanilan := kullanilan || (a ->> ''id'');
        delete from public.isc_odeme where id = v_id;
        insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
        values (v_id, v_kok, uid_, v_proses, v_tamir, c ->> ''cari_id'', m, b, v_istek);
        exit;
      end loop;
      if v_id is not null then continue; end if;
      -- (b) Ara proses: onaylı (ürün, ara proses) çözümünde cari ve ücret satırınkiyle aynı.
      for ap in select x from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> ''araProsesler'') = ''array'' then t.veri -> ''araProsesler'' else ''[]''::jsonb end) x
                 where t.id = ''tekil'' loop
        v_anahtar := ''ara|'' || (u ->> ''urun_id'') || ''|'' || (ap ->> ''id'');
        v_ozet := public.g25_ucret_guncel(v_anahtar);
        if v_ozet is null or v_ozet ->> ''cari'' is distinct from c ->> ''cari_id'' or abs((v_ozet ->> ''ucret'')::numeric - b) > 0.000001 then continue; end if;
        if not public.g25_onayli(v_anahtar) then
          v_hata := format(''%s ara proses ücreti / carisi cari / muhasebe onayı bekliyor ya da onaydan sonra değişti'', ap ->> ''ad''); continue;
        end if;
        v_hata := public.g25_iscilik_carisi(c ->> ''cari_id'', ap ->> ''ad'', true);
        if v_hata is not null then continue; end if;
        v_id := ''ara:'' || uid_ || '':'' || (ap ->> ''id'');
        perform pg_advisory_xact_lock(hashtextextended(''g25_isc:'' || v_id, 0));
        if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = v_id and not fs.iptal) then
          v_hata := format(''%s ara prosesinin işçiliği bu üretim için zaten ödenmiş'', ap ->> ''ad''); v_id := null; continue;
        end if;
        delete from public.isc_odeme where id = v_id;
        insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
        values (v_id, null, uid_, ap ->> ''ad'', false, c ->> ''cari_id'', m, b, v_istek);
        exit;
      end loop;
      if v_id is null then
        return coalesce(v_hata, format(''işçilik satırı %s için cari %s teslim edilen kayıtlı bir atamaya ya da onaylı bir ara prosese bağlı değil'', c ->> ''id'', c ->> ''cari_id''));
      end if;
    end loop;
    return null;
  end ';
  create or replace function public.g25_uretim_butunluk(f jsonb, p_cari jsonb, p_alt jsonb) returns text
  language plpgsql volatile security definer set search_path = public as '
  declare
    uid_ text := nullif(f ->> ''uretimId'', '''');
    v_istek text := nullif(f ->> ''__istek'', '''');
    u jsonb; adet numeric; x jsonb; a jsonb; c jsonb; e jsonb; m numeric; b numeric; ap jsonb; v_ozet jsonb;
    v_kok text; v_id text; v_toplam numeric; v_tamir boolean; v_zincir numeric; kullanilan text[] := ''{}''; v_ilk text; k jsonb;
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
         and coalesce(z -> ''ek'' ->> ''islemTipi'', '''') = ''İşçilik'' and not coalesce((z -> ''ek'' ->> ''ilkIscilik'')::boolean, false)
         and not (z ->> ''id'' = any (kullanilan))
       order by z ->> ''id'' limit 1;
      if c is null then continue; end if;   -- işçiliksiz teslim (ör. bölüm personeli): yalnız tamamlanma
      e := case when jsonb_typeof(c -> ''ek'') = ''object'' then c -> ''ek'' else ''{}''::jsonb end;
      m := public.stk_sayi(e ->> ''miktar''); b := public.stk_sayi(e ->> ''birimFiyat'');
      if m is null or m <= 0 then return format(''işçilik satırı %s miktarı eksik'', c ->> ''id''); end if;
      if m > coalesce(public.stk_sayi(a ->> ''miktar''), 0) + 0.000001 then
        return format(''işçilik miktarı (%s) atamanın kayıtlı miktarından (%s) büyük'', m, a ->> ''miktar'');
      end if;
      if m > coalesce(public.g25_alt_saglam(p_alt, a ->> ''id''), 0) + 0.000001 then   -- B kuralı (PARA yetkilisi de)
        return format(''işçilik miktarı (%s) bu teslimdeki sağlam adetten (%s) büyük — tamire ayrılan çiftin işçiliği sağlam dönünce, hurda hiç ödenmez'',
          m, public.g25_alt_saglam(p_alt, a ->> ''id''));
      end if;
      v_tamir := coalesce((a ->> ''tamir_mi'')::boolean, false);
      v_zincir := coalesce(public.stk_sayi(public.g25_ucret_guncel(''atama|'' || v_kok) ->> ''miktar''), public.stk_sayi(a ->> ''miktar''));
      select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.kok = v_kok and not fs.iptal;
      if v_toplam + m > v_zincir + 0.000001 then
        return format(''bu iş için ödenen (%s + %s) işin toplam miktarını (%s) aşıyor'', v_toplam, m, v_zincir);
      end if;
      if not v_tamir then
        select coalesce(sum(o.miktar), 0) + public.g25_gecmis_iscilik(uid_, a ->> ''proses'') into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
         where o.uretim_id = uid_ and o.proses = a ->> ''proses'' and not o.tamir and not fs.iptal;
        if adet is not null and v_toplam + m > adet + 0.000001 then
          return format(''%s için ödenen işçilik (%s + %s; defter dışı geçmiş teslimler dahil) üretim adedini (%s) aşıyor'', a ->> ''proses'', v_toplam, m, adet);
        end if;
      end if;
      kullanilan := kullanilan || (c ->> ''id'');
      v_id := ''atama:'' || (a ->> ''id'');
      delete from public.isc_odeme where id = v_id;
      insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
      values (v_id, v_kok, uid_, a ->> ''proses'', v_tamir, c ->> ''cari_id'', m, coalesce(b, 0), v_istek);
    end loop;
    -- İLK İŞÇİLİK (B kuralı): ek.ilkIscilik satırı bu istekte tamamlanan tamir işinin İLK işini yapana gider; her tamir parçası bir kez,
    -- miktar ≤ sağlam, ilk işin zincir (kayıtlı toplam) ve proses tavanları. Ücret serbest (PARA), alıcı ve tekillik değil.
    for c in select z from jsonb_array_elements(public.stk_dizi(p_cari -> ''satirlar'')) z
              where coalesce((z -> ''ek'' ->> ''ilkIscilik'')::boolean, false) and coalesce(z ->> ''uretim_id'', '''') = uid_ loop
      e := case when jsonb_typeof(c -> ''ek'') = ''object'' then c -> ''ek'' else ''{}''::jsonb end;
      m := public.stk_sayi(e ->> ''miktar''); b := public.stk_sayi(e ->> ''birimFiyat'');
      v_id := null;
      for x in select z from jsonb_array_elements(public.stk_dizi(p_alt -> ''uretim_atamalari'' -> ''satirlar'')) z
                where coalesce((z ->> ''tamamlandi_mi'')::boolean, false) order by z ->> ''id'' loop
        select to_jsonb(y) into a from public.uretim_atamalari y where y.id::text = x ->> ''id'';
        if a is null or not coalesce((a ->> ''tamir_mi'')::boolean, false) or ''ilk:'' || (a ->> ''id'') = any (kullanilan) then continue; end if;
        v_ilk := public.g25_ilk_atama(a ->> ''id'');
        select to_jsonb(y) into k from public.uretim_atamalari y where y.id::text = v_ilk;
        if k is null or k ->> ''personel_id'' is distinct from c ->> ''cari_id'' then continue; end if;
        v_kok := public.g25_atama_koku(v_ilk);
        perform pg_advisory_xact_lock(hashtextextended(''g25_isc:zincir:'' || v_kok, 0));
        if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = ''ilk:'' || (a ->> ''id'') and not fs.iptal) then
          return format(''tamir %s için ilk işçilik zaten ödenmiş'', a ->> ''id'');
        end if;
        if m is null or m <= 0 or m > coalesce(public.g25_alt_saglam(p_alt, a ->> ''id''), 0) + 0.000001 then
          return format(''ilk işçilik miktarı (%s) tamirden sağlam dönen adetten (%s) büyük'', m, public.g25_alt_saglam(p_alt, a ->> ''id''));
        end if;
        v_zincir := coalesce(public.stk_sayi(public.g25_ucret_guncel(''atama|'' || v_kok) ->> ''miktar''), 0);
        select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.kok = v_kok and not fs.iptal;
        if v_toplam + m > v_zincir + 0.000001 then
          return format(''ilk iş için ödenen (%s + %s) işin toplam miktarını (%s) aşıyor'', v_toplam, m, v_zincir);
        end if;
        select coalesce(sum(o.miktar), 0) + public.g25_gecmis_iscilik(uid_, k ->> ''proses'') into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
         where o.uretim_id = uid_ and o.proses = k ->> ''proses'' and not o.tamir and not fs.iptal;
        if adet is not null and v_toplam + m > adet + 0.000001 then
          return format(''%s için ödenen işçilik (%s + %s; defter dışı geçmiş teslimler dahil) üretim adedini (%s) aşıyor'', k ->> ''proses'', v_toplam, m, adet);
        end if;
        v_id := ''ilk:'' || (a ->> ''id'');
        kullanilan := kullanilan || v_id || (c ->> ''id'');
        delete from public.isc_odeme where id = v_id;
        insert into public.isc_odeme (id, kok, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
        values (v_id, v_kok, uid_, k ->> ''proses'', false, c ->> ''cari_id'', m, coalesce(b, 0), v_istek);
        exit;
      end loop;
      if v_id is null then
        return format(''ilk işçilik satırı %s tamirden sağlam dönen ve ilk işi bu kişiye ait kayıtlı bir işe bağlı değil'', c ->> ''id'');
      end if;
    end loop;
    -- ara proses: çözümdeki cariye yazılan satır o adımın TEK ödemesi (ücret serbest)
    for c in select z from jsonb_array_elements(public.stk_dizi(p_cari -> ''satirlar'')) z
              where not (z ->> ''id'' = any (kullanilan)) and coalesce(z ->> ''uretim_id'', '''') = uid_ and coalesce(z -> ''ek'' ->> ''islemTipi'', '''') = ''İşçilik''
                and not coalesce((z -> ''ek'' ->> ''ilkIscilik'')::boolean, false) loop
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
  revoke all on function public.g25_alt_saglam(jsonb, text), public.g25_ilk_atama(text), public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb),
    public.g25_uretim_butunluk(jsonb, jsonb, jsonb) from public, anon, authenticated;
  if has_function_privilege('authenticated', 'public.g25_ilk_atama(text)', 'execute') or has_function_privilege('authenticated', 'public.g25_alt_saglam(jsonb, text)', 'execute')
     or has_function_privilege('authenticated', 'public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb)', 'execute') then
    raise exception 'iç fonksiyon dışarıya açık kaldı';
  end if;
  create table if not exists guvenlik.g25d_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25d_sonuc from public, anon, authenticated;
  delete from guvenlik.g25d_sonuc;
  insert into guvenlik.g25d_sonuc values
    (1, 'g25_alt_saglam + g25_ilk_atama', 'kuruldu (dışarıya kapalı)'),
    (2, 'g25_uretim_bagi + g25_uretim_butunluk', 'işçilik ≤ sağlam; ilk işçilik ilk ustaya, bir kez'),
    (99, 'GENEL', 'UYGULANDI — 25-sonra-dogrula-salt-okur.sql ve 25-onkosul-salt-okur.sql ile doğrulayın');
end $$;

select sira, kontrol, deger from guvenlik.g25d_sonuc order by sira;

commit;
