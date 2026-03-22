/** Helpers for SprintPay public catalog responses (get-data, get-data-variations). */

export type CatalogRow = Record<string, unknown>;

export function pickCatalogRows(catalog: unknown): CatalogRow[] {
  if (catalog == null) return [];
  if (Array.isArray(catalog)) return catalog as CatalogRow[];
  if (typeof catalog !== "object") return [];
  const root = catalog as Record<string, unknown>;

  const tryArr = (v: unknown): CatalogRow[] | null => (Array.isArray(v) ? (v as CatalogRow[]) : null);

  const inner = root.catalog ?? root;
  if (typeof inner === "object" && inner !== null && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>;
    const a =
      tryArr(o.data) ||
      tryArr(o.variations) ||
      (o.content && typeof o.content === "object"
        ? tryArr((o.content as Record<string, unknown>).variations)
        : null);
    if (a) return a;
  }

  return (
    tryArr(root.data) ||
    tryArr(root.variations) ||
    (root.content && typeof root.content === "object"
      ? tryArr((root.content as Record<string, unknown>).variations)
      : null) ||
    []
  );
}

export function strField(row: CatalogRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

/** Query param for GET …/data-variations (often service_id or short network code). */
export function catalogVariationQueryParam(row: CatalogRow, postNetwork: string): string {
  const sid = strField(row, "service_id", "serviceID", "serviceId");
  if (sid) return sid;
  const n = strField(row, "network", "Network").toLowerCase();
  if (n) return n;
  return postNetwork;
}

/** Body.network for POST /vtu/data (mtn | airtel | glo | 9mobile). */
export function networkForVtuPost(row: CatalogRow | null, fallback: string): string {
  const f = fallback.toLowerCase();
  if (!row) return f;
  const n = strField(row, "network", "Network").toLowerCase();
  if (["mtn", "airtel", "glo", "9mobile"].includes(n)) return n;
  const sid = strField(row, "service_id", "serviceID", "serviceId").toLowerCase();
  if (sid.includes("mtn")) return "mtn";
  if (sid.includes("airtel")) return "airtel";
  if (sid.includes("glo")) return "glo";
  if (sid.includes("9mobile") || sid.includes("etisalat")) return "9mobile";
  return f;
}

export function bundleLabel(row: CatalogRow): string {
  return strField(row, "name", "Name", "variation_name", "title", "product_name") || "Bundle";
}

export function bundleVariationCode(row: CatalogRow): string {
  return strField(row, "variation_code", "variationCode", "plan_code", "planCode", "code", "id");
}

export function bundleAmount(row: CatalogRow): number {
  const raw = strField(row, "variation_amount", "variationAmount", "amount", "price", "fixedPrice");
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
