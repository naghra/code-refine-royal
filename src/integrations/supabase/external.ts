/**
 * External Supabase router.
 *
 * When `app_config_cloaking.sync_orders` is enabled, all reads/writes for
 * orders / order_items / audit_logs are sent to the external Supabase project
 * instead of the local one.
 *
 * Uses the external **anon** key — never the service_role key — so it is safe
 * to ship in the browser. The external project must have RLS policies that
 * allow the signed-in admin to perform the required operations.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as localClient } from "./client";

type CloakConfig = {
  sync_orders?: boolean;
  supabase_url?: string;
  supabase_anon_key?: string;
};

const EXTERNAL_TABLES = new Set(["orders", "order_items", "audit_logs"]);
const STORAGE_KEY = "external_supabase_config_v1";

let externalClient: SupabaseClient | null = null;
let externalSignature: string = "";
let initialized = false;
let initPromise: Promise<void> | null = null;

function buildClient(cfg: CloakConfig): SupabaseClient | null {
  if (!cfg?.sync_orders || !cfg?.supabase_url || !cfg?.supabase_anon_key) return null;
  const url = cfg.supabase_url.replace(/\/$/, "");
  const sig = `${url}|${cfg.supabase_anon_key}`;
  if (externalClient && sig === externalSignature) return externalClient;
  externalSignature = sig;
  externalClient = createClient(url, cfg.supabase_anon_key, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "sb-external-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return externalClient;
}

function loadFromCache(): CloakConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToCache(cfg: CloakConfig | null) {
  try {
    if (cfg) localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Initializes the external client by reading `app_config_cloaking` from
 * store_settings (local). Caches the config in localStorage so subsequent
 * page loads can route immediately without waiting for the network.
 */
export async function initExternalRouter(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Try cache first for instant routing.
    const cached = loadFromCache();
    if (cached) buildClient(cached);

    try {
      const { data } = await localClient
        .from("store_settings")
        .select("value")
        .eq("key", "app_config_cloaking")
        .maybeSingle();
      const cfg = (data?.value || null) as CloakConfig | null;
      if (cfg?.sync_orders && cfg?.supabase_url && cfg?.supabase_anon_key) {
        buildClient(cfg);
        saveToCache(cfg);
      } else {
        externalClient = null;
        externalSignature = "";
        saveToCache(null);
      }
    } catch {
      /* ignore — fall back to whatever cache provided */
    } finally {
      initialized = true;
    }
  })();
  return initPromise;
}

/** Returns the external client, or null if external mode is not active. */
export function getExternalClient(): SupabaseClient | null {
  return externalClient;
}

/**
 * Returns the appropriate client for the given table:
 *  - external client when external mode is on AND the table is in
 *    EXTERNAL_TABLES,
 *  - local client otherwise.
 */
export function clientFor(table: string): SupabaseClient {
  if (externalClient && EXTERNAL_TABLES.has(table)) return externalClient;
  return localClient;
}

/** Convenience: `db("orders").select(...)` */
export function db(table: string) {
  return clientFor(table).from(table);
}

/**
 * For audit_logs we need the admin user's id. In external mode the
 * authenticated session lives in the external client.
 */
export async function getAuthenticatedUserId(table: string): Promise<string | null> {
  const c = clientFor(table);
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}

/** Force a refresh of the cached config (e.g. after admin updates settings). */
export async function refreshExternalRouter(): Promise<void> {
  initialized = false;
  initPromise = null;
  await initExternalRouter();
}