export interface TenantLoginHostOptions {
  /**
   * Trusted TaxPulse domain under which tenant login subdomains are served.
   * This is deployment configuration, not a value supplied by a browser.
   */
  baseDomain?: string;
}

const defaultTenantLoginBaseDomain = "taxpulse.example";
const tenantSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Returns the tenant slug for a canonical tenant login hostname.
 *
 * The caller must provide a hostname (for example, Express's `req.hostname`),
 * rather than an untrusted URL or Host header containing a port.
 */
export function parseTenantLoginHostname(
  hostname: string,
  options: TenantLoginHostOptions = {},
): string | null {
  const normalizedHostname = normalizeHostname(hostname);
  const baseDomain = normalizeHostname(options.baseDomain ?? defaultTenantLoginBaseDomain);
  const suffix = `.${baseDomain}`;

  if (!normalizedHostname.endsWith(suffix)) {
    return null;
  }

  const tenantSlug = normalizedHostname.slice(0, -suffix.length);

  if (!tenantSlugPattern.test(tenantSlug)) {
    return null;
  }

  return tenantSlug;
}
