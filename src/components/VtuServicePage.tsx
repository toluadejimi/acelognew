import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  bundleAmount,
  bundleLabel,
  bundleVariationCode,
  catalogVariationQueryParam,
  networkForVtuPost,
  pickCatalogRows,
  strField,
  type CatalogRow,
} from "@/lib/vtuCatalog";
import { toast } from "sonner";
import "@/styles/vtu-panels.css";

export type VtuKind = "airtime" | "data" | "electricity" | "cable-tv";

type VendResponse = {
  success?: boolean;
  message?: string;
  new_balance?: number;
  provider?: unknown;
  data?: unknown;
};

const META: Record<
  VtuKind,
  { title: string; icon: string; sub: string; trust: string; trustIcon: string }
> = {
  airtime: {
    title: "Airtime",
    icon: "fa-solid fa-mobile-screen",
    sub: "Top up any Nigerian GSM line. Charged from your wallet; SprintPay fulfils via VTpass.",
    trust: "Enable SPRINTPAY_VTU_MOCK for tests or SPRINTPAY_VTU_ENABLED for production (see backend docs/VTU_SPRINTPAY.md).",
    trustIcon: "fa-solid fa-shield-halved",
  },
  data: {
    title: "Data bundles",
    icon: "fa-solid fa-wifi",
    sub: "Plans load from SprintPay GET /get-data and /get-data-variations (proxied). Pick a bundle or adjust amount.",
    trust: "Wallet is debited only after SprintPay returns success (or in mock mode).",
    trustIcon: "fa-solid fa-route",
  },
  "cable-tv": {
    title: "Cable TV",
    icon: "fa-solid fa-tv",
    sub: "Validate IUC, then pay with product code and amount from your bouquet list.",
    trust: "Validate is free; payment debits your wallet when you confirm.",
    trustIcon: "fa-solid fa-circle-info",
  },
  electricity: {
    title: "Electricity",
    icon: "fa-solid fa-bolt",
    sub: "Verify meter, then pay. Token or receipt fields depend on SprintPay’s response.",
    trust: "Use disco codes from SprintPay / VTpass (e.g. IKEDC).",
    trustIcon: "fa-solid fa-plug-circle-bolt",
  },
};

type CatalogJson = { catalog?: unknown; success?: boolean };

function networkRowKey(row: CatalogRow, index: number): string {
  return strField(row, "service_id", "serviceID", "serviceId", "network", "Network") || `row-${index}`;
}

function VtuDataPanel({ onBalanceUpdate }: { onBalanceUpdate?: (balance: number) => void }) {
  const m = META.data;
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkRows, setNetworkRows] = useState<CatalogRow[]>([]);
  const [bundleRows, setBundleRows] = useState<CatalogRow[]>([]);
  const [netKey, setNetKey] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(500);
  const [variationCode, setVariationCode] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const selectedNetRow = useMemo(() => {
    if (!networkRows.length) return null;
    const row = networkRows.find((r, i) => networkRowKey(r, i) === netKey);
    return row ?? networkRows[0];
  }, [networkRows, netKey]);

  const postNetwork = networkForVtuPost(selectedNetRow, netKey || "mtn");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await api<CatalogJson>("/vtu/catalog/data-networks", { method: "GET" });
        if (cancelled) return;
        const rows = pickCatalogRows(json.catalog ?? json);
        setNetworkRows(rows);
        if (rows.length) {
          setNetKey(networkRowKey(rows[0], 0));
        } else {
          setNetKey("mtn");
        }
      } catch {
        if (!cancelled) {
          setNetworkRows([]);
          setNetKey("mtn");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!netKey) return;
    let cancelled = false;
    const row = selectedNetRow;
    const q = row ? catalogVariationQueryParam(row, postNetwork) : netKey;

    (async () => {
      setCatalogLoading(true);
      try {
        const json = await api<CatalogJson>(
          `/vtu/catalog/data-variations?network=${encodeURIComponent(q)}`,
          { method: "GET" }
        );
        if (cancelled) return;
        const rows = pickCatalogRows(json.catalog ?? json);
        setBundleRows(rows);
        if (rows.length) {
          const first = rows[0];
          const code = bundleVariationCode(first);
          setVariationCode(code);
          const a = bundleAmount(first);
          if (a >= 50) setAmount(a);
        } else {
          setVariationCode("");
        }
      } catch {
        if (!cancelled) {
          setBundleRows([]);
          setVariationCode("");
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [netKey, selectedNetRow, postNetwork]);

  const show = (text: string, ok: boolean) => setResult({ text, ok });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const body: Record<string, unknown> = {
      network: postNetwork,
      phone: phone.trim(),
      amount: Number(amount),
    };
    if (variationCode.trim()) body.variation_code = variationCode.trim();
    const sid = selectedNetRow ? strField(selectedNetRow, "service_id", "serviceID", "serviceId") : "";
    if (sid) body.service_id = sid;

    try {
      const json = await api<{
        success?: boolean;
        message?: string;
        new_balance?: number;
        provider?: unknown;
      }>("/vtu/data", { method: "POST", body: JSON.stringify(body) });
      if (typeof json.new_balance === "number") onBalanceUpdate?.(json.new_balance);
      const extra = json.provider != null ? `\n\n${JSON.stringify(json.provider, null, 2)}` : "";
      show((json.message || "Success") + extra, !!json.success);
      if (json.success) toast.success(json.message || "Purchase successful");
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || "Request failed";
      show(msg, false);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vtu-shell">
      <div className="vtu-hero">
        <div className="vtu-hero-icon" aria-hidden>
          <i className={m.icon} />
        </div>
        <div>
          <h2>{m.title}</h2>
          <p>{m.sub}</p>
          <div className="vtu-trust">
            <i className={m.trustIcon} aria-hidden />
            <span>{m.trust}</span>
          </div>
        </div>
      </div>
      <form className="vtu-form" onSubmit={submit}>
        <div className="vtu-grid2">
          <div className="vtu-field">
            <label htmlFor="vtu-d-net">Network / service</label>
            {networkRows.length ? (
              <select
                id="vtu-d-net"
                value={netKey}
                onChange={(ev) => setNetKey(ev.target.value)}
                required
              >
                {networkRows.map((row, i) => (
                  <option key={networkRowKey(row, i)} value={networkRowKey(row, i)}>
                    {bundleLabel(row)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="vtu-d-net"
                value={netKey || "mtn"}
                onChange={(ev) => setNetKey(ev.target.value)}
                required
              >
                <option value="mtn">MTN</option>
                <option value="airtel">Airtel</option>
                <option value="glo">Glo</option>
                <option value="9mobile">9mobile</option>
              </select>
            )}
          </div>
          <div className="vtu-field">
            <label htmlFor="vtu-d-phone">Phone</label>
            <input
              id="vtu-d-phone"
              type="tel"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              required
              maxLength={15}
              placeholder="0801 234 5678"
            />
          </div>
        </div>
        <div className="vtu-field">
          <label htmlFor="vtu-d-bundle">Data bundle {catalogLoading ? "(loading…)" : ""}</label>
          <select
            id="vtu-d-bundle"
            value={variationCode}
            onChange={(ev) => {
              const v = ev.target.value;
              setVariationCode(v);
              const row = bundleRows.find((r) => bundleVariationCode(r) === v);
              if (row) {
                const a = bundleAmount(row);
                if (a >= 50) setAmount(a);
              }
            }}
          >
            <option value="">— Custom (enter amount &amp; optional code below) —</option>
            {bundleRows.map((row, i) => {
              const code = bundleVariationCode(row);
              const a = bundleAmount(row);
              return (
                <option key={code || `b-${i}`} value={code}>
                  {bundleLabel(row)}
                  {a ? ` — ₦${a.toLocaleString("en-NG")}` : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div className="vtu-grid2">
          <div className="vtu-field">
            <label htmlFor="vtu-d-amt">Amount (₦)</label>
            <input
              id="vtu-d-amt"
              type="number"
              min={50}
              step={1}
              value={amount}
              onChange={(ev) => setAmount(Number(ev.target.value))}
              required
            />
          </div>
          <div className="vtu-field">
            <label htmlFor="vtu-d-plan">Variation / plan code (optional)</label>
            <input
              id="vtu-d-plan"
              type="text"
              maxLength={120}
              value={variationCode}
              onChange={(ev) => setVariationCode(ev.target.value)}
              placeholder="Filled when you pick a bundle"
            />
          </div>
        </div>
        <div className="vtu-actions">
          <button type="submit" className="vtu-btn vtu-btn--primary" disabled={loading || catalogLoading}>
            <i className="fa-solid fa-cart-shopping" aria-hidden /> Buy data
          </button>
        </div>
        {result && (
          <div className={`vtu-result ${result.ok ? "is-ok" : "is-err"}`} role="status">
            {result.text}
          </div>
        )}
      </form>
    </div>
  );
}

export function VtuServicePage({
  kind,
  onBalanceUpdate,
}: {
  kind: VtuKind;
  onBalanceUpdate?: (balance: number) => void;
}) {
  const m = META[kind];
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const show = (text: string, ok: boolean) => setResult({ text, ok });

  const handleVend = async (path: string, body: Record<string, unknown>) => {
    setLoading(true);
    setResult(null);
    try {
      const json = await api<VendResponse>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (typeof json.new_balance === "number") onBalanceUpdate?.(json.new_balance);
      const extra = json.provider != null ? `\n\n${JSON.stringify(json.provider, null, 2)}` : "";
      show((json.message || "Success") + extra, !!json.success);
      if (json.success) toast.success(json.message || "Purchase successful");
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Request failed";
      show(msg, false);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGet = async (path: string) => {
    setLoading(true);
    setResult(null);
    try {
      const json = await api<VendResponse>(path, { method: "GET" });
      show(JSON.stringify(json.data ?? json, null, 2), true);
      toast.success("Lookup OK");
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Request failed";
      show(msg, false);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (kind === "airtime") {
    return (
      <div className="vtu-shell">
        <VtuHero {...m} />
        <form
          className="vtu-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleVend("/vtu/airtime", {
              network: fd.get("network"),
              phone: String(fd.get("phone") || "").trim(),
              amount: Number(fd.get("amount")),
            });
          }}
        >
          <div className="vtu-grid2">
            <div className="vtu-field">
              <label htmlFor="vtu-air-network">Network</label>
              <select id="vtu-air-network" name="network" required>
                <option value="mtn">MTN</option>
                <option value="airtel">Airtel</option>
                <option value="glo">Glo</option>
                <option value="9mobile">9mobile</option>
              </select>
            </div>
            <div className="vtu-field">
              <label htmlFor="vtu-air-phone">Phone</label>
              <input id="vtu-air-phone" name="phone" type="tel" required placeholder="0801 234 5678" maxLength={15} />
            </div>
          </div>
          <div className="vtu-field">
            <label htmlFor="vtu-air-amt">Amount (₦)</label>
            <input id="vtu-air-amt" name="amount" type="number" min={50} step={1} required placeholder="500" />
          </div>
          <div className="vtu-actions">
            <button type="submit" className="vtu-btn vtu-btn--primary" disabled={loading}>
              <i className="fa-solid fa-bolt" aria-hidden /> Buy airtime
            </button>
          </div>
          {result && (
            <div className={`vtu-result ${result.ok ? "is-ok" : "is-err"}`} role="status">
              {result.text}
            </div>
          )}
        </form>
      </div>
    );
  }

  if (kind === "data") {
    return <VtuDataPanel onBalanceUpdate={onBalanceUpdate} />;
  }

  if (kind === "cable-tv") {
    return (
      <div className="vtu-shell">
        <VtuHero {...m} />
        <div className="vtu-form">
          <div className="vtu-grid2">
            <div className="vtu-field">
              <label htmlFor="vtu-c-prov">Provider</label>
              <select id="vtu-c-prov" defaultValue="dstv">
                <option value="dstv">DStv</option>
                <option value="gotv">GOtv</option>
                <option value="startimes">StarTimes</option>
              </select>
            </div>
            <div className="vtu-field">
              <label htmlFor="vtu-c-num">Smartcard / IUC</label>
              <input id="vtu-c-num" type="text" minLength={8} maxLength={20} required />
            </div>
          </div>
          <div className="vtu-actions">
            <button
              type="button"
              className="vtu-btn vtu-btn--secondary"
              disabled={loading}
              onClick={() => {
                const prov = (document.getElementById("vtu-c-prov") as HTMLSelectElement).value;
                const num = (document.getElementById("vtu-c-num") as HTMLInputElement).value.trim();
                const q = `provider=${encodeURIComponent(prov)}&smartcard_number=${encodeURIComponent(num)}`;
                void handleGet(`/vtu/cable/validate?${q}`);
              }}
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden /> Validate
            </button>
          </div>
          <div className="vtu-divider" />
          <div className="vtu-field">
            <label htmlFor="vtu-c-prod">Product code</label>
            <input id="vtu-c-prod" type="text" required maxLength={120} />
          </div>
          <div className="vtu-field">
            <label htmlFor="vtu-c-amt">Amount (₦)</label>
            <input id="vtu-c-amt" type="number" min={100} step={1} required />
          </div>
          <div className="vtu-actions">
            <button
              type="button"
              className="vtu-btn vtu-btn--primary"
              disabled={loading}
              onClick={() => {
                void handleVend("/vtu/cable/buy", {
                  provider: (document.getElementById("vtu-c-prov") as HTMLSelectElement).value,
                  smartcard_number: (document.getElementById("vtu-c-num") as HTMLInputElement).value.trim(),
                  product_code: (document.getElementById("vtu-c-prod") as HTMLInputElement).value.trim(),
                  amount: Number((document.getElementById("vtu-c-amt") as HTMLInputElement).value),
                });
              }}
            >
              <i className="fa-solid fa-lock" aria-hidden /> Pay subscription
            </button>
          </div>
          {result && (
            <div className={`vtu-result ${result.ok ? "is-ok" : "is-err"}`} role="status">
              {result.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* electricity */
  return (
    <div className="vtu-shell">
      <VtuHero {...m} />
      <div className="vtu-form">
        <div className="vtu-field">
          <label htmlFor="vtu-e-disco">Disco code</label>
          <input id="vtu-e-disco" type="text" required placeholder="e.g. IKEDC" maxLength={40} />
        </div>
        <div className="vtu-grid2">
          <div className="vtu-field">
            <label htmlFor="vtu-e-type">Meter type</label>
            <select id="vtu-e-type" defaultValue="prepaid">
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </select>
          </div>
          <div className="vtu-field">
            <label htmlFor="vtu-e-meter">Meter number</label>
            <input id="vtu-e-meter" type="text" required minLength={6} maxLength={20} />
          </div>
        </div>
        <div className="vtu-actions">
          <button
            type="button"
            className="vtu-btn vtu-btn--secondary"
            disabled={loading}
            onClick={() => {
              const disco = (document.getElementById("vtu-e-disco") as HTMLInputElement).value.trim();
              const meterType = (document.getElementById("vtu-e-type") as HTMLSelectElement).value;
              const meter = (document.getElementById("vtu-e-meter") as HTMLInputElement).value.trim();
              const q = `disco=${encodeURIComponent(disco)}&meter_type=${encodeURIComponent(meterType)}&meter_number=${encodeURIComponent(meter)}`;
              void handleGet(`/vtu/electricity/validate?${q}`);
            }}
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden /> Verify meter
          </button>
        </div>
        <div className="vtu-divider" />
        <div className="vtu-field">
          <label htmlFor="vtu-e-amt">Amount (₦)</label>
          <input id="vtu-e-amt" type="number" min={100} step={1} required />
        </div>
        <div className="vtu-actions">
          <button
            type="button"
            className="vtu-btn vtu-btn--primary"
            disabled={loading}
            onClick={() => {
              void handleVend("/vtu/electricity/buy", {
                disco: (document.getElementById("vtu-e-disco") as HTMLInputElement).value.trim(),
                meter_type: (document.getElementById("vtu-e-type") as HTMLSelectElement).value,
                meter_number: (document.getElementById("vtu-e-meter") as HTMLInputElement).value.trim(),
                amount: Number((document.getElementById("vtu-e-amt") as HTMLInputElement).value),
              });
            }}
          >
            <i className="fa-solid fa-bolt" aria-hidden /> Pay bill
          </button>
        </div>
        {result && (
          <div className={`vtu-result ${result.ok ? "is-ok" : "is-err"}`} role="status">
            {result.text}
          </div>
        )}
      </div>
    </div>
  );
}

function VtuHero(m: (typeof META)[VtuKind]) {
  return (
    <div className="vtu-hero">
      <div className="vtu-hero-icon" aria-hidden>
        <i className={m.icon} />
      </div>
      <div>
        <h2>{m.title}</h2>
        <p>{m.sub}</p>
        <div className="vtu-trust">
          <i className={m.trustIcon} aria-hidden />
          <span>{m.trust}</span>
        </div>
      </div>
    </div>
  );
}
