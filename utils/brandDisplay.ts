// Mirrors HTML's _brandDisplay (index.html:16721-16728) — legacy walk-in
// product rows stored a brand UUID (foreign key into `brands`) instead of a
// name; resolve it back to a display name, or pass through a plain name.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveBrandName = (brand: string | null | undefined, brandsById: Map<string, string>): string => {
    if (!brand) return '';
    if (UUID_RE.test(brand)) return brandsById.get(brand) || '';
    return brand;
};