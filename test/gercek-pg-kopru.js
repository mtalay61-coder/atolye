// GERÇEK POSTGRESQL KÖPRÜSÜ — tarayıcı senaryoları için (7 Kasım). Yalnız YEREL veritabanı; Supabase'e bağlanmaz.
//
// Neden: tarayıcı senaryoları bulutu taklit ediyordu (sabit yanıtlar). Uygulamayı EKRANDAN, gerçek sunucu işlemlerine (fis_kes,
// fis_iptal, kas_yaz, stk_yaz, tetikleyiciler, RLS, yetkiler) karşı sınamak için Supabase'in REST katmanı (PostgREST) gerekiyor;
// bu ortamda PostgREST çalıştırılamıyor. Bu dosya uygulamanın KULLANDIĞI alt kümeyi Playwright rotası olarak karşılar:
//   GET  /rest/v1/<tablo>?select=…&<sütun>=eq|neq|gt|gte|lt|lte|like|ilike|in|is.<değer>&order=…&limit=&offset=  (+ Range başlığı)
//   POST /rest/v1/<tablo>            (Prefer: resolution=merge-duplicates → birincil anahtarda upsert; return=representation)
//   PATCH / DELETE /rest/v1/<tablo>?<süzgeç>   (return=representation)
//   POST /rest/v1/rpc/<işlev>        (gövde anahtarları = adlı argümanlar, türleri pg_proc'tan)
//   /auth/v1/*                       sahte oturum (jeton = "yerel-test:<eposta>"); /functions/v1/* → 404
// Her istek AYRI işlemde, Supabase gibi: request.jwt.claims + request.headers (x-atolye-surum dahil) ayarlanır, rol anon ya da
// authenticated olur (SET LOCAL ROLE) — yetkiler, RLS, sürüm kapısı ve fiş kuralları gerçek veritabanındaki gibi çalışır.
// Hata gövdesi PostgREST biçiminde { code, message, details, hint } (uygulamanın kuralReddiOku / 42501 okuması bunu bekler).
// Sınır: gömülü seçim (select=a(b)), mantıksal or/and süzgeçleri, sayım başlığı dışında Prefer seçenekleri desteklenmez — uygulama
// kullanmıyor; desteklenmeyen biçim 400 PGRST100 döner (sessizce yanlış sonuç vermez).
const path = require("path");
const { Pool } = require(process.env.KOPRU_PG || "pg");

function kopruKur({ veritabani, port = Number(process.env.PGPORT || 5432), host = process.env.PGHOST || "localhost" }) {
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error("Köprü yalnız yerel PostgreSQL'e bağlanır");
  const havuz = new Pool({ host, port, user: process.env.PGUSER || "postgres", database: veritabani, max: 6 });
  const gunluk = [];   // her istek: { m, yol, durum, kod }
  const pkOnbellek = new Map();
  const isOnbellek = new Map();

  const kimlik = (ad) => {
    if (!/^[a-z_][a-z0-9_]*$/i.test(ad)) { const e = new Error(`geçersiz ad: ${ad}`); e.code = "PGRST100"; throw e; }
    return `"${ad}"`;
  };
  async function birincilAnahtar(c, tablo) {
    if (pkOnbellek.has(tablo)) return pkOnbellek.get(tablo);
    const r = await c.query(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = ('public.' || quote_ident($1))::regclass and i.indisprimary order by array_position(i.indkey, a.attnum)`, [tablo]);
    const pk = r.rows.map((x) => x.attname);
    pkOnbellek.set(tablo, pk);
    return pk;
  }
  async function islevBilgisi(c, ad) {
    if (isOnbellek.has(ad)) return isOnbellek.get(ad);
    const r = await c.query(`select p.proretset, p.proargnames, array(select format_type(t, null) from unnest(p.proargtypes) t) as turler,
      format_type(p.prorettype, null) as donus from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $1 order by p.pronargs desc limit 1`, [ad]);
    const b = r.rows[0] || null;
    isOnbellek.set(ad, b);
    return b;
  }

  // süzgeçler → where; değerler parametre (metin olarak; karşılaştırma sütunun türüne çevrilir)
  function suzgec(params, deg) {
    const kosul = [];
    for (const [anahtar, deger] of params) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(anahtar)) continue;
      if (anahtar === "or" || anahtar === "and") { const e = new Error("or/and süzgeci desteklenmiyor"); e.code = "PGRST100"; throw e; }
      const m = String(deger).match(/^(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.*)$/s);
      if (!m) { const e = new Error(`süzgeç anlaşılmadı: ${anahtar}=${deger}`); e.code = "PGRST100"; throw e; }
      const [, degil, op, ham] = m;
      const s = kimlik(anahtar);
      let ifade;
      if (op === "is") ifade = `${s} is ${ham === "null" ? "null" : ham === "true" ? "true" : ham === "false" ? "false" : (() => { throw Object.assign(new Error("is değeri"), { code: "PGRST100" }); })()}`;
      else if (op === "in") {
        const ic = ham.replace(/^\(/, "").replace(/\)$/, "");
        const ogeler = ic === "" ? [] : ic.match(/("([^"\\]|\\.)*"|[^,]+)/g).map((x) => x.replace(/^"(.*)"$/s, "$1").replace(/\\"/g, '"'));
        deg.push(ogeler); ifade = `${s}::text = any($${deg.length}::text[])`;
      } else {
        const sql = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" }[op];
        deg.push(op === "like" || op === "ilike" ? ham.replace(/\*/g, "%") : ham);
        ifade = op === "eq" || op === "neq" ? `${s}::text ${sql} $${deg.length}::text` : `${s} ${sql} $${deg.length}`;
      }
      kosul.push(degil ? `not (${ifade})` : ifade);
    }
    return kosul.length ? ` where ${kosul.join(" and ")}` : "";
  }
  const secim = (params) => {
    const s = params.get("select");
    if (!s || s === "*") return "*";
    if (/[()]/.test(s)) { const e = new Error("gömülü seçim desteklenmiyor"); e.code = "PGRST100"; throw e; }
    return s.split(",").map((x) => kimlik(x.trim())).join(", ");
  };
  const sira = (params) => {
    const o = params.get("order");
    if (!o) return "";
    return " order by " + o.split(",").map((p) => {
      const [sutun, ...ek] = p.split(".");
      return `${kimlik(sutun)}${ek.includes("desc") ? " desc" : ""}${ek.includes("nullslast") ? " nulls last" : ek.includes("nullsfirst") ? " nulls first" : ""}`;
    }).join(", ");
  };

  async function islem(rol, iddialar, basliklar, isi) {
    const c = await havuz.connect();
    try {
      await c.query("begin");
      await c.query("select set_config('request.jwt.claims', $1, true), set_config('request.headers', $2, true)",
        [iddialar ? JSON.stringify(iddialar) : "", JSON.stringify(basliklar)]);
      await c.query(`set local role ${rol === "authenticated" ? "authenticated" : "anon"}`);
      const sonuc = await isi(c);
      await c.query("commit");
      return sonuc;
    } catch (e) {
      await c.query("rollback").catch(() => {});
      throw e;
    } finally { c.release(); }
  }

  async function yanitla(istek) {
    const u = new URL(istek.url());
    const m = istek.method();
    const h = istek.headers();
    const json = (durum, govde, ek = {}) => ({ status: durum, contentType: "application/json", headers: { "access-control-allow-origin": "*", ...ek }, body: govde === undefined ? "" : JSON.stringify(govde) });
    if (m === "OPTIONS") return { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: "" };
    if (/\/functions\/v1\//.test(u.pathname)) return json(404, { message: "edge function yok (yerel köprü)" });
    if (/\/auth\/v1\//.test(u.pathname)) {
      if (/settings$/.test(u.pathname)) return json(200, { external: {}, disable_signup: true });
      const govde = (() => { try { return JSON.parse(istek.postData() || "{}"); } catch (e) { return {}; } })();
      const eposta = govde.email || "ali@atolye.local";
      return json(200, { access_token: `yerel-test:${eposta}`, refresh_token: `yerel-test:${eposta}`, expires_in: 86400, user: { email: eposta } });
    }
    const yol = decodeURIComponent(u.pathname.replace(/^.*\/rest\/v1\//, ""));
    const jeton = String(h.authorization || "").replace(/^Bearer\s+/i, "");
    const eposta = (jeton.match(/^yerel-test:(.+)$/) || [])[1];
    const rol = eposta ? "authenticated" : "anon";
    const iddialar = eposta ? { email: eposta, role: "authenticated", sub: eposta } : null;
    const basliklar = {}; for (const k of ["x-atolye-surum", "x-istemci"]) if (h[k]) basliklar[k] = h[k];
    const prefer = String(h.prefer || "");
    const temsil = /return=representation/.test(prefer);
    const params = u.searchParams;
    let govde = null; if (m !== "GET" && m !== "HEAD") { try { govde = JSON.parse(istek.postData() || "null"); } catch (e) { govde = null; } }
    try {
      const sonuc = await islem(rol, iddialar, basliklar, async (c) => {
        if (yol.startsWith("rpc/")) {
          const ad = yol.slice(4);
          const b = await islevBilgisi(c, ad);
          if (!b) { const e = new Error(`Could not find the function public.${ad}`); e.code = "PGRST202"; e.http = 404; throw e; }
          const adlar = b.proargnames || [];
          const deg = []; const arg = [];
          Object.entries(govde || {}).forEach(([k, v]) => {
            const i = adlar.indexOf(k); if (i < 0) return;
            deg.push(/json/.test(b.turler[i]) ? JSON.stringify(v) : v);
            arg.push(`${kimlik(k)} := $${deg.length}::${b.turler[i]}`);
          });
          const sql = b.proretset ? `select coalesce(json_agg(x), '[]'::json) as r from public.${kimlik(ad)}(${arg.join(", ")}) x`
            : `select public.${kimlik(ad)}(${arg.join(", ")}) as r`;
          const r = await c.query(sql, deg);
          return { durum: 200, govde: r.rows[0].r };
        }
        const tablo = yol.split("?")[0];
        kimlik(tablo);
        const deg = [];
        if (m === "GET" || m === "HEAD") {
          let limit = params.get("limit"), offset = params.get("offset");
          const aralik = String(h.range || "").match(/^(\d+)-(\d+)$/);
          if (aralik) { offset = aralik[1]; limit = String(Number(aralik[2]) - Number(aralik[1]) + 1); }
          const where = suzgec(params, deg);
          const sql = `select coalesce(json_agg(t), '[]'::json) as r from (select ${secim(params)} from public.${kimlik(tablo)}${where}${sira(params)}${limit ? ` limit ${Number(limit)}` : ""}${offset ? ` offset ${Number(offset)}` : ""}) t`;
          const r = await c.query(sql, deg);
          let toplam = "*";
          if (/count=exact/.test(prefer)) toplam = (await c.query(`select count(*)::int as n from public.${kimlik(tablo)}${where}`, deg)).rows[0].n;
          const satir = r.rows[0].r;
          const bas = Number(offset || 0);
          return { durum: 200, govde: m === "HEAD" ? undefined : satir, ek: { "content-range": `${satir.length ? `${bas}-${bas + satir.length - 1}` : "*"}/${toplam}` } };
        }
        if (m === "POST") {
          const satirlar = Array.isArray(govde) ? govde : [govde];
          if (!satirlar.length) return { durum: 201, govde: temsil ? [] : undefined };
          const sutunlar = (params.get("columns") ? params.get("columns").split(",") : Object.keys(satirlar[0])).map((x) => x.trim());
          sutunlar.forEach(kimlik);
          const liste = sutunlar.map(kimlik).join(", ");
          deg.push(JSON.stringify(satirlar));
          let sql = `insert into public.${kimlik(tablo)} (${liste}) select ${liste} from json_populate_recordset(null::public.${kimlik(tablo)}, $1::json)`;
          if (/resolution=merge-duplicates/.test(prefer)) {
            const pk = params.get("on_conflict") ? params.get("on_conflict").split(",") : await birincilAnahtar(c, tablo);
            const guncel = sutunlar.filter((s) => !pk.includes(s));
            sql += ` on conflict (${pk.map(kimlik).join(", ")}) do ${guncel.length ? `update set ${guncel.map((s) => `${kimlik(s)} = excluded.${kimlik(s)}`).join(", ")}` : "nothing"}`;
          } else if (/resolution=ignore-duplicates/.test(prefer)) sql += " on conflict do nothing";
          const r = await c.query(`with y as (${sql} returning *) select coalesce(json_agg(y), '[]'::json) as r from y`, deg);
          return { durum: 201, govde: temsil ? r.rows[0].r : undefined };
        }
        if (m === "PATCH") {
          const sutunlar = Object.keys(govde || {}); sutunlar.forEach(kimlik);
          deg.push(JSON.stringify(govde || {}));
          const where = suzgec(params, deg);
          const sql = `with y as (update public.${kimlik(tablo)} t set ${sutunlar.map((s) => `${kimlik(s)} = r.${kimlik(s)}`).join(", ")}
            from json_populate_record(null::public.${kimlik(tablo)}, $1::json) r${where.replace(/"(\w+)"/g, (a, b) => `t."${b}"`)} returning t.*)
            select coalesce(json_agg(y), '[]'::json) as r from y`;
          const r = await c.query(sql, deg);
          return { durum: 200, govde: temsil ? r.rows[0].r : undefined };
        }
        if (m === "DELETE") {
          const where = suzgec(params, deg);
          const r = await c.query(`with y as (delete from public.${kimlik(tablo)}${where} returning *) select coalesce(json_agg(y), '[]'::json) as r from y`, deg);
          return { durum: 200, govde: temsil ? r.rows[0].r : undefined };
        }
        const e = new Error(`yöntem desteklenmiyor: ${m}`); e.code = "PGRST100"; throw e;
      });
      gunluk.push({ m, yol: yol.split("?")[0], durum: sonuc.durum });
      return json(sonuc.durum === 200 && sonuc.govde === undefined ? 204 : sonuc.durum, sonuc.govde, sonuc.ek);
    } catch (e) {
      const kod = e.code || "XX000";
      const durum = e.http || (kod === "42501" ? 403 : kod === "42P01" ? 404 : kod === "23505" ? 409 : kod === "PGRST100" ? 400 : 400);
      gunluk.push({ m, yol: yol.split("?")[0], durum, kod, mesaj: String(e.message).slice(0, 200) });
      return json(durum, { code: kod, message: e.message, details: e.detail || null, hint: e.hint || null });
    }
  }

  // sayfa: Playwright sayfası; firma adresi ne olursa olsun /rest|auth|functions/v1/ istekleri köprüye
  async function bagla(sayfa) {
    await sayfa.route(/\/(rest|auth|functions)\/v1\//, async (r) => r.fulfill(await yanitla(r.request())));
  }
  // test kendi doğrulamasını aynı veritabanında yapar (rol: postgres — tetikleyici / RLS'siz okuma)
  const sorgu = async (sql, deg) => (await havuz.query(sql, deg)).rows;
  return { bagla, sorgu, gunluk, __yanitla: yanitla, kapat: () => havuz.end() };
}

module.exports = { kopruKur };
