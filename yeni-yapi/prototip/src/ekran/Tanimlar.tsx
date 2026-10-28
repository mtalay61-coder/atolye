// Tanımlar — şimdilik yalnız Görünüm sekmesi çizildi (tema seçimi). Diğer sekmeler şemadan planlanır.
import { useState } from "react";
import { AracCubugu, BosDurum, Sekmeler } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";

export function Tanimlar() {
  const u = useUygulama();
  const [sekme, setSekme] = useState("gorunum");
  const temalar = window.Atolye.TEMALAR;
  return (
    <>
      <AracCubugu baslik="Tanımlar" eylemler={{ ara: {}, yenile: {} }} />
      <div className="sayfa-govde">
        <div className="erp-card">
          <Sekmeler secili={sekme} sec={setSekme} sekmeler={[
            { id: "renkler", ad: "Renkler" }, { id: "olculer", ad: "Ölçüler" }, { id: "prosesler", ad: "Prosesler" },
            { id: "depolar", ad: "Depolar" }, { id: "gorunum", ad: "Görünüm" },
          ]} />
          <div className="erp-card__body">
            {sekme === "gorunum" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ margin: 0 }}>Renk teması bütün ekranları birlikte değiştirir. Firmanın varsayılanını Yönetici seçer; herkes kendine başka tema seçebilir.</p>
                <div className="erp-tema-liste">
                  {temalar.map((t) => (
                    <button key={t.id} type="button" className="erp-tema" aria-pressed={u.tema === t.id} onClick={() => { u.temaSec(t.id); u.bildir(`${t.ad} teması seçildi`); }}>
                      <span className="erp-tema__ornek" data-theme={t.id} style={{ background: "var(--erp-page)" }}>
                        <span style={{ background: "var(--erp-shell)" }} />
                        <span style={{ display: "grid", gap: 4, padding: 6, alignContent: "start" }}>
                          <span style={{ height: 8, width: "60%", background: "var(--erp-text)", borderRadius: 2 }} />
                          <span style={{ height: 6, width: "80%", background: "var(--erp-line)", borderRadius: 2 }} />
                          <span style={{ height: 10, width: "30%", background: "var(--erp-accent)", borderRadius: 2 }} />
                        </span>
                      </span>
                      <b>{t.ad}</b><span className="erp-field__yardim">{t.aciklama}</span>
                    </button>
                  ))}
                </div>
                <p className="soluk kucuk" style={{ margin: 0 }}>Prototipte seçim yalnız bu tarayıcıda hatırlanır.</p>
              </div>
            ) : <BosDurum baslik="Bu sekme henüz çizilmedi" aciklama="Renkler, ölçü setleri, prosesler ve depolar Faz 1'de çizilecek. Görünüm sekmesine bak." />}
          </div>
        </div>
      </div>
    </>
  );
}
