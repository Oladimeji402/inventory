# Counterpoint SaaS: Multi-Tenant Architecture Blueprint & Implementation Roadmap

---

## 1. Executive Summary & Architectural Vision

**Counterpoint** is evolving from a single-store, offline-first Point of Sale (POS) and inventory web application into a **multi-tenant B2B Retail SaaS platform**. The transformed platform allows business owners across retail, supermarket, pharmacy, and wholesale sectors to register, claim their own dedicated subdomains (e.g., `spar-ikeja.counterpoint.app`), configure multiple store branches and checkout registers, manage staff roles and inventory, and accept payments reliably—even during severe internet connectivity outages.

Simultaneously, Counterpoint introduces a centralized **Super Admin ("General Admin") Platform Panel**, giving the platform owners real-time visibility into global Gross Merchandise Value (GMV), recurring subscription revenues (MRR/ARR), active business metrics, automated tenant provisioning, and billing integration across regional (Paystack, Flutterwave) and international (Stripe) gateways.

```
+--------------------------------------------------------------------------------------------------+
|                                    COUNTERPOINT CLOUD PLATFORM                                   |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   +--------------------------+    +----------------------------------+    +------------------+   |
|   |   SUPER ADMIN PORTAL     |    |      TENANT STORE ADMIN & TILL   |    |  PUBLIC ONBOARD  |   |
|   |  (admin.counterpoint.app)|    |  (*.counterpoint.app / custom)   |    | (counterpoint.app|   |
|   +-------------+------------+    +-----------------+----------------+    +--------+---------+   |
|                 |                                   |                              |             |
|                 +-----------------+   +-------------+                              |             |
|                                   |   |                                            |             |
|                                   v   v                                            v             |
|   +------------------------------------------------------------------------------------------+   |
|   |                        EDGE ROUTING & TENANT RESOLUTION MIDDLEWARE                       |   |
|   |               (Wildcard DNS + Cloudflare for SaaS / Vercel Edge + TLS)                   |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                |                                                 |
|                                                v                                                 |
|   +------------------------------------------------------------------------------------------+   |
|   |                             APPLICATION & API GATEWAY LAYER                              |   |
|   |                 (Next.js App Router / Fastify / Node.js + Supabase Auth)                 |   |
|   |               - Tenant Context Hydration (`tenant_id`, `branch_id`, `role`)              |   |
|   |               - Rate Limiting, Audit Logging & Staff PIN Token Exchange                  |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                |                                                 |
|                         +----------------------+----------------------+                          |
|                         |                                             |                          |
|                         v                                             v                          |
|   +-------------------------------------------+   +------------------------------------------+   |
|   |          PRIMARY POSTGRESQL ENGINE        |   |           BACKGROUND WORKERS & JOBS      |   |
|   |        (Supabase / Neon / AWS Aurora)     |   |               (BullMQ / Redis)           |   |
|   |  - Shared DB + Strict Row-Level Security  |   |  - Subscription Webhook Ingestion        |   |
|   |  - Tenant-Partitioned Tables              |   |  - Offline Sync Batch Processing         |   |
|   |  - Transactional Outbox for Sync Events   |   |  - Daily Branch Z-Report Aggregation     |   |
|   +-------------------------------------------+   +------------------------------------------+   |
|                         ^                                                                        |
|                         | Bi-directional Delta Sync (CRDT / Idempotent Operations)               |
|                         v                                                                        |
|   +------------------------------------------------------------------------------------------+   |
|   |                   OFFLINE-FIRST CLIENT RUNTIME (IndexedDB / Dexie.js)                    |   |
|   |  - Tenant-isolated local database instances (`counterpoint_db_${tenantSlug}`)           |   |
|   |  - Local Till Offline Execution & Receipt Generation                                     |   |
|   |  - Idempotent Sync Mutation Queue & Auto-Retry Loop                                      |   |
|   +------------------------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Multi-Tenancy Model & Subdomain Routing Architecture

### 2.1 Subdomain & Custom Domain Strategy

Counterpoint adopts a **Hybrid Subdomain + Custom Domain** URL structure:

1. **Platform Root & Marketing**: `https://counterpoint.app` (Landing page, pricing, feature showcase, public sign-up wizard).
2. **Super Admin (General Admin)**: `https://admin.counterpoint.app` (Platform operations, billing, tenant lifecycle, telemetry).
3. **Tenant Store / POS Subdomains**: `https://<tenant-slug>.counterpoint.app` (e.g., `https://kemi-groceries.counterpoint.app` or `https://mega-supermarket.counterpoint.app`).
4. **Custom Vanity Domains (Enterprise Tier)**: `https://pos.clientdomain.com` (CNAME pointing to Counterpoint Edge).

```
                      INCOMING REQUEST
                             │
                             ▼
              [ Edge Proxy / Wildcard DNS ]
              (*.counterpoint.app + Custom)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Host: admin.counterpoint.app     Host: <slug>.counterpoint.app
   ┌───────────────────────┐        ┌───────────────────────────┐
   │ Super Admin Router    │        │ Tenant Resolution Engine  │
   │ (RBAC: platform_admin)│        │ 1. Extract Slug from Host │
   └───────────────────────┘        │ 2. Query Tenant Cache/DB  │
                                    │ 3. Check Subscription     │
                                    │ 4. Inject Tenant Context  │
                                    └─────────────┬─────────────┘
                                                  ▼
                                    ┌───────────────────────────┐
                                    │ Tenant POS & Store App    │
                                    │ (Tenant Scoped RLS)       │
                                    └───────────────────────────┘
```

### 2.2 Edge Tenant Resolution & SSL Provisioning

```
                     Custom Domain CNAME (pos.retailer.com)
                                      │
                                      ▼
                        [ Cloudflare for SaaS (SSL for SaaS) ]
                                      │
                                      ▼
                      [ Vercel Edge / Next.js Middleware ]
                                      │
                                      ├── 1. Host header parsing
                                      ├── 2. Slug extraction: 'slug.counterpoint.app' -> 'slug'
                                      ├── 3. Custom domain lookup (Edge KV / Redis Cache)
                                      ├── 4. Active status check (active, suspended, past_due)
                                      └── 5. Rewrite to internal route: /tenant/[slug]/...
```

#### Edge Middleware Implementation (`middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface TenantCacheRecord {
  id: string;
  slug: string;
  status: 'active' | 'suspended' | 'trialing' | 'delinquent';
  customDomain?: string | null;
}

const RESERVED_SUBDOMAINS = new Set(['admin', 'api', 'www', 'app', 'auth', 'status', 'docs', 'billing']);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Normalise hostname (remove port numbers if running in local dev)
  const currentHost = hostname.replace(/:\d+$/, '').toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'counterpoint.app';

  let tenantSlug: string | null = null;
  let isSuperAdmin = false;
  let isCustomDomain = false;

  // Case 1: Localhost development testing (e.g. kemi.localhost:3000)
  if (currentHost.endsWith('.localhost') || currentHost.endsWith('.local')) {
    const parts = currentHost.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      tenantSlug = parts[0];
    }
  } 
  // Case 2: Super Admin Platform Panel
  else if (currentHost === `admin.${rootDomain}`) {
    isSuperAdmin = true;
  }
  // Case 3: Subdomain Tenant (e.g. spar-lagos.counterpoint.app)
  else if (currentHost.endsWith(`.${rootDomain}`)) {
    const candidate = currentHost.replace(`.${rootDomain}`, '');
    if (!RESERVED_SUBDOMAINS.has(candidate)) {
      tenantSlug = candidate;
    }
  }
  // Case 4: Custom Enterprise Domain (e.g. pos.spar.ng)
  else if (currentHost !== rootDomain && currentHost !== `www.${rootDomain}`) {
    isCustomDomain = true;
    tenantSlug = await resolveCustomDomainToSlug(currentHost);
  }

  // Handle Super Admin Routing
  if (isSuperAdmin) {
    url.pathname = `/platform-admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle Root Landing Page & Onboarding
  if (!tenantSlug) {
    // Normal root domain requests (e.g., counterpoint.app, counterpoint.app/pricing)
    return NextResponse.next();
  }

  // Resolve Tenant Record from Edge KV (Cloudflare KV or Upstash Redis)
  const tenant = await getTenantMetadata(tenantSlug);

  if (!tenant) {
    // Tenant does not exist -> Rewrite to 404 / Not Found page with friendly claim CTA
    url.pathname = `/errors/tenant-not-found`;
    url.searchParams.set('slug', tenantSlug);
    return NextResponse.rewrite(url);
  }

  if (tenant.status === 'suspended' || tenant.status === 'delinquent') {
    url.pathname = `/errors/account-suspended`;
    url.searchParams.set('reason', tenant.status);
    return NextResponse.rewrite(url);
  }

  // Rewrite request to tenant-scoped page tree with injected tenant context headers
  url.pathname = `/tenants/${tenant.slug}${url.pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-counterpoint-tenant-id', tenant.id);
  response.headers.set('x-counterpoint-tenant-slug', tenant.slug);
  response.headers.set('x-counterpoint-is-custom-domain', String(isCustomDomain));
  
  return response;
}

// Edge KV lookup helper with in-memory caching
async function getTenantMetadata(slug: string): Promise<TenantCacheRecord | null> {
  const edgeKvUrl = `${process.env.UPSTASH_REDIS_REST_URL}/get/tenant:${slug}`;
  const res = await fetch(edgeKvUrl, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    next: { revalidate: 60 } // Cache at edge for 60 seconds
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function resolveCustomDomainToSlug(domain: string): Promise<string | null> {
  const edgeKvUrl = `${process.env.UPSTASH_REDIS_REST_URL}/get/domain:${domain}`;
  const res = await fetch(edgeKvUrl, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    next: { revalidate: 300 }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result || null;
}

export const config = {
  matcher: ['/((?!api/public|_next/static|_next/image|favicon.ico|images|icons).*)']
};
```

---

## 3. Database & Data Isolation Strategy

### 3.1 Architectural Comparison of Isolation Models

| Evaluation Metric | Model A: Shared Database + Row-Level Security (RLS) | Model B: Schema-Per-Tenant (Postgres Schemas) | Model C: Database-Per-Tenant (Dedicated DBs) |
| :--- | :--- | :--- | :--- |
| **Operational Cost** | **Lowest** (1 primary DB cluster + Read Replicas) | **Medium** (Single cluster, high catalog overhead) | **Highest** (Expensive DB instances for micro-stores) |
| **Tenant Scalability** | **10,000+ tenants** on single pooled cluster | ~500–1,500 tenants (schema catalog exhaustion) | Unwieldy to automate and manage > 100 DBs |
| **Schema Migrations** | **1 migration command** applies to all tenants | Loops over N schemas (long migration locks, drift) | High failure rate across hundreds of connections |
| **Cross-Tenant Leakage Risk** | Zero when enforced by PostgreSQL RLS kernel | Low (guaranteed by schema separation) | Strict hardware/process boundary |
| **Cross-Tenant Analytics** | Instant real-time SQL for Platform Admin GMV | Requires complex `UNION ALL` cross-schema queries | Requires ETL / Data Lake (Snowflake/BigQuery) |
| **Connection Pooling** | Highly efficient with PgBouncer / Supavisor | Poor (pools cannot be shared across schemas cleanly)| High connection exhaustion |
| **Recommendation** | **SELECTED (Industry Standard for POS SaaS)** | Rejected (High maintenance, schema drift) | Rejected (Cost prohibitive for retail tier) |

### 3.2 Production Database Schema (PostgreSQL 16+ with Supabase RLS)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TENANTS & SUBSCRIPTIONS (Platform Scope)
-- ============================================================================

CREATE TYPE tenant_status AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE billing_interval AS ENUM ('monthly', 'annual');
CREATE TYPE payment_gateway AS ENUM ('paystack', 'flutterwave', 'stripe', 'manual');

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_business_name VARCHAR(255),
    tax_id VARCHAR(50),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    country_code VARCHAR(2) DEFAULT 'NG',
    currency VARCHAR(3) DEFAULT 'NGN',
    custom_domain VARCHAR(255) UNIQUE,
    status tenant_status DEFAULT 'trialing' NOT NULL,
    max_branches INT DEFAULT 1 NOT NULL,
    max_registers INT DEFAULT 2 NOT NULL,
    max_staff INT DEFAULT 5 NOT NULL,
    settings JSONB DEFAULT '{
        "receipt_header": "Thank you for your patronage!",
        "receipt_footer": "Goods sold in good condition are not returnable.",
        "tax_rate_percentage": 7.5,
        "tax_inclusive": true,
        "enforce_pin_on_void": true,
        "allow_negative_stock": false
    }'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier subscription_tier DEFAULT 'starter' NOT NULL,
    billing_interval billing_interval DEFAULT 'monthly' NOT NULL,
    gateway payment_gateway DEFAULT 'paystack' NOT NULL,
    gateway_customer_id VARCHAR(255),
    gateway_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
    amount_cents BIGINT NOT NULL, -- in lowest currency denomination (e.g. Kobo or Cents)
    currency VARCHAR(3) DEFAULT 'NGN' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_subscription UNIQUE (tenant_id)
);

CREATE TABLE subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    amount_paid BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN' NOT NULL,
    gateway payment_gateway NOT NULL,
    gateway_reference VARCHAR(255) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    pdf_receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

-- ============================================================================
-- 2. BRANCHES, REGISTERS & SHIFTS
-- ============================================================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(50),
    is_headquarters BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_branch_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);

CREATE TABLE registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. "Till 1 - Ground Floor"
    device_fingerprint VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_branch_register_name UNIQUE (branch_id, name)
);

CREATE TABLE register_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    register_id UUID NOT NULL REFERENCES registers(id) ON DELETE CASCADE,
    opened_by_user_id UUID NOT NULL,
    closed_by_user_id UUID,
    opened_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_float_cents BIGINT NOT NULL DEFAULT 0,
    closing_cash_counted_cents BIGINT,
    expected_cash_cents BIGINT,
    cash_difference_cents BIGINT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open' NOT NULL -- 'open', 'closed', 'reconciled'
);

-- ============================================================================
-- 3. USERS, STAFF & ROLES (Tenant Scoped)
-- ============================================================================

CREATE TYPE staff_role AS ENUM ('Sales Representative', 'Supervisor', 'Manager', 'Store Admin', 'Platform Super Admin');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for Platform Super Admins
    supabase_auth_id UUID UNIQUE, -- linked to supabase auth.users
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role staff_role NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- Argon2id / bcrypt hash of 4-6 digit till PIN
    assigned_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'blocked', 'deactivated'
    max_discount_allowed INT DEFAULT 5 NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_auth_id ON users(supabase_auth_id);

-- ============================================================================
-- 4. INVENTORY & PRODUCTS (Branch Inventory Support)
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color_code VARCHAR(7) DEFAULT '#16a34a',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_category UNIQUE (tenant_id, name)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL,
    barcode VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL,
    price_cents BIGINT NOT NULL, -- Retail Selling Price
    cost_cents BIGINT NOT NULL,  -- Cost Price for Margin Calc
    image_url TEXT,
    low_stock_threshold INT DEFAULT 5 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_product_sku UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX idx_products_tenant_barcode ON products(tenant_id, barcode);
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category_name);

-- Multi-Branch Inventory Partitioning
CREATE TABLE branch_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_quantity INT DEFAULT 0 NOT NULL,
    reserved_quantity INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_branch_product_stock UNIQUE (branch_id, product_id)
);

CREATE INDEX idx_branch_inventory_lookup ON branch_inventory(tenant_id, branch_id, product_id);

-- ============================================================================
-- 5. SALES, LINE ITEMS & TILL TRANSACTIONS
-- ============================================================================

CREATE TYPE payment_method AS ENUM ('Cash', 'Card', 'Transfer', 'Split', 'Store Credit');
CREATE TYPE sale_status AS ENUM ('completed', 'voided', 'refunded', 'held');

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    register_id UUID REFERENCES registers(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES register_shifts(id) ON DELETE SET NULL,
    receipt_number VARCHAR(64) NOT NULL,
    client_idempotency_key VARCHAR(128) NOT NULL, -- Prevents duplicate offline sync
    cashier_user_id UUID NOT NULL REFERENCES users(id),
    cashier_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer' NOT NULL,
    customer_phone VARCHAR(50),
    subtotal_cents BIGINT NOT NULL,
    discount_pct NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    discount_cents BIGINT DEFAULT 0 NOT NULL,
    tax_cents BIGINT DEFAULT 0 NOT NULL,
    total_cents BIGINT NOT NULL,
    cost_total_cents BIGINT NOT NULL, -- Total Cost for accurate Gross Margin Reporting
    payment_method payment_method NOT NULL,
    payment_details JSONB, -- e.g. { split: [{ method: 'Cash', amount: 5000 }, { method: 'Transfer', amount: 3500 }] }
    status sale_status DEFAULT 'completed' NOT NULL,
    voided_at TIMESTAMPTZ,
    voided_by_user_id UUID REFERENCES users(id),
    void_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT uq_tenant_receipt_number UNIQUE (tenant_id, receipt_number),
    CONSTRAINT uq_tenant_idempotency UNIQUE (tenant_id, client_idempotency_key)
);

CREATE INDEX idx_sales_tenant_date ON sales(tenant_id, created_at DESC);
CREATE INDEX idx_sales_tenant_branch ON sales(tenant_id, branch_id, created_at DESC);
CREATE INDEX idx_sales_idempotency ON sales(tenant_id, client_idempotency_key);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(64) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    unit_price_cents BIGINT NOT NULL,
    unit_cost_cents BIGINT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_cents BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_tenant_product ON sale_items(tenant_id, product_id);

-- ============================================================================
-- 6. AUDIT LOGS & PLATFORM TELEMETRY
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'SALE_COMPLETED', 'SALE_VOIDED', 'STOCK_UPDATED', 'STAFF_ADDED', 'PIN_CHANGED'
    entity_type VARCHAR(50) NOT NULL, -- 'sale', 'product', 'user', 'branch', 'subscription'
    entity_id VARCHAR(128) NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
```

### 3.3 PostgreSQL Row-Level Security (RLS) Policy Implementation

PostgreSQL Row-Level Security provides kernel-level data isolation. Every query automatically executes in the context of `app.current_tenant_id`. If an attacker manipulates API requests, the DB engine rejects any access outside the verified session tenant.

```sql
-- Enable RLS on all tenant data tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function to read session tenant
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create helper function to check for Platform Super Admin bypass
CREATE OR REPLACE FUNCTION is_platform_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_super_admin', true)::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policy: Branches
CREATE POLICY tenant_isolation_branches ON branches
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Products
CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Branch Inventory
CREATE POLICY tenant_isolation_inventory ON branch_inventory
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Users / Staff
CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Sales
CREATE POLICY tenant_isolation_sales ON sales
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Sale Items
CREATE POLICY tenant_isolation_sale_items ON sale_items
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());

-- RLS Policy: Audit Logs
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_app_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_app_tenant_id());
```

#### Application Data Access Layer (Node.js/Prisma/Drizzle Context Wrapper)

```typescript
import { Pool, PoolClient } from 'pg';

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});

export async function withTenantContext<T>(
  tenantId: string,
  isSuperAdmin = false,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    // Set transaction-local session variables that RLS functions inspect
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, true),
              set_config('app.is_super_admin', $2, true)`,
      [tenantId, isSuperAdmin ? 'true' : 'false']
    );

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 4. Authentication, Authorization & Context Propagation

Counterpoint POS utilizes a **Two-Tier Authentication Model**:

1. **Tier 1: Web Console Identity (Store Owners & Super Admins)**
   - Powered by Supabase Auth / OAuth 2.0 (Email Magic Links, Passwords, Google SSO).
   - Issues standard JWTs containing claims: `{ sub, email, app_metadata: { role, tenant_id, is_super_admin } }`.

2. **Tier 2: Fast Till PIN Clock-In (Frontline Cashiers & Supervisors)**
   - No email required for frontline till staff. Staff sign in with **Name + 4-digit PIN** directly on the register.
   - The register verifies the PIN against the tenant's hashed staff records, issuing a short-lived scoped Till Session Token (stored locally in IndexedDB / Memory).

```
   ┌──────────────────────────────────────────────────────────┐
   │               PIN Clock-In Exchange Flow                │
   └──────────────────────────────────────────────────────────┘
      Cashier                   Till Client                     API Gateway
         │                           │                               │
         │  1. Name + PIN (e.g. 1111)│                               │
         ├──────────────────────────►│                               │
         │                           │ 2. POST /api/auth/till-pin    │
         │                           │    { name, pin, branch_id }   │
         │                           │    Host: kemi.counterpoint.app│
         │                           ├──────────────────────────────►│
         │                           │                               ├── Extract tenant from Host
         │                           │                               ├── Lookup user & verify PIN hash
         │                           │                               ├── Enforce staffStatus === 'active'
         │                           │                               └── Generate Scoped JWT:
         │                           │                                   {
         │                           │                                     tenant_id,
         │                           │                                     user_id,
         │                           │                                     branch_id,
         │                           │                                     role: 'Sales Representative',
         │                           │                                     max_discount: 5
         │                           │                                   }
         │                           │ 3. Return Till JWT + Profile  │
         │                           │◄──────────────────────────────┤
         │                           │                               │
         │ 4. Render POS Interface   │                               │
         │◄──────────────────────────┤                               │
```

### 4.1 Fine-Grained Permissions Matrix

```typescript
export interface RolePermissions {
  sell: boolean;
  viewInventory: boolean;
  manageInventory: boolean;
  viewReports: boolean;
  viewPlatformAnalytics: boolean;
  applyDiscountMaxPct: number;
  voidSale: boolean;
  manageStaff: boolean;
  manageBilling: boolean;
  manageBranches: boolean;
  accessSuperAdmin: boolean;
}

export const SAAS_PERMISSION_MATRIX: Record<string, RolePermissions> = {
  'Sales Representative': {
    sell: true,
    viewInventory: true,
    manageInventory: false,
    viewReports: false,
    viewPlatformAnalytics: false,
    applyDiscountMaxPct: 5,
    voidSale: false,
    manageStaff: false,
    manageBilling: false,
    manageBranches: false,
    accessSuperAdmin: false
  },
  'Supervisor': {
    sell: true,
    viewInventory: true,
    manageInventory: true,
    viewReports: true,
    viewPlatformAnalytics: false,
    applyDiscountMaxPct: 10,
    voidSale: false,
    manageStaff: false,
    manageBilling: false,
    manageBranches: false,
    accessSuperAdmin: false
  },
  'Manager': {
    sell: true,
    viewInventory: true,
    manageInventory: true,
    viewReports: true,
    viewPlatformAnalytics: false,
    applyDiscountMaxPct: 15,
    voidSale: true,
    manageStaff: false,
    manageBilling: false,
    manageBranches: true,
    accessSuperAdmin: false
  },
  'Store Admin': {
    sell: true,
    viewInventory: true,
    manageInventory: true,
    viewReports: true,
    viewPlatformAnalytics: false,
    applyDiscountMaxPct: 25,
    voidSale: true,
    manageStaff: true,
    manageBilling: true,
    manageBranches: true,
    accessSuperAdmin: false
  },
  'Platform Super Admin': {
    sell: false,
    viewInventory: true,
    manageInventory: true,
    viewReports: true,
    viewPlatformAnalytics: true,
    applyDiscountMaxPct: 100,
    voidSale: true,
    manageStaff: true,
    manageBilling: true,
    manageBranches: true,
    accessSuperAdmin: true
  }
};
```

---

## 5. Super Admin ("General Admin") Platform Portal

The Super Admin panel resides at `admin.counterpoint.app` and empowers platform operators to manage hundreds of independent tenant stores.

```
+---------------------------------------------------------------------------------------------------------+
| COUNTERPOINT PLATFORM SUPER ADMIN                     [Env: Production] [MRR: NGN 14.2M] [Super Admin v] |
+---------------------------------------------------------------------------------------------------------+
| [Overview]  [Businesses]  [Subscriptions]  [Global Sales GMV]  [Feature Flags]  [System Health]         |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  +--------------------+   +--------------------+   +--------------------+   +--------------------+      |
|  | TOTAL TENANTS      |   | ACTIVE STORES      |   | PLATFORM 30D GMV   |   | MONTHLY CHURN      |      |
|  | 482                |   | 614 Tills Online   |   | NGN 384,200,000    |   | 1.4%               |      |
|  | (+28 this month)   |   | (98.4% Health)     |   | (+14.2% MoM)       |   | (-0.3% MoM)        |      |
|  +--------------------+   +--------------------+   +--------------------+   +--------------------+      |
|                                                                                                         |
|  +-- TENANT DIRECTORY -------------------------------------------------------------------------------+  |
|  | Search by business, subdomain, or owner email: [ Search...                       ] [+ New Business] |  |
|  |---------------------------------------------------------------------------------------------------|  |
|  | Business Name     | Subdomain              | Tier      | GMV (30d)     | Status   | Actions       |  |
|  |-------------------|------------------------|-----------|---------------|----------|---------------|  |
|  | Kemi Supermarket  | kemi.counterpoint.app  | Growth    | NGN 18.4M     | Active   | [Manage] [Impersonate]  |
|  | Spar Express VI   | spar-vi.counterpoint   | Enterprise| NGN 94.2M     | Active   | [Manage] [Impersonate]  |
|  | City Pharmacy     | citypharm.counterpoint | Starter   | NGN 4.1M      | Past Due | [Remind] [Suspend]      |
|  | Yaba Electronics  | yaba-tech.counterpoint | Growth    | NGN 8.9M      | Active   | [Manage] [Impersonate]  |
|  +---------------------------------------------------------------------------------------------------+  |
|                                                                                                         |
|  +-- REVENUE & BILLING -----------------------------+  +-- RECENT PLATFORM AUDIT EVENTS -------------+  |
|  | Monthly Recurring Revenue (MRR):  NGN 14,200,000 |  | 14:32 - New Tenant Onboarded: "Lekki Wines" |  |
|  | Annual Run Rate (ARR):           NGN 170,400,000 |  | 14:15 - Paystack Webhook: NGN 25,000 (Ren.) |  |
|  | Failed Renewals (Past Due):      12 Accounts     |  | 13:58 - Tenant Suspended: "Bad Debt Mart"   |  |
|  | Gateway Distribution: Paystack 78%, Flutterwave 22%| 12:40 - Custom Domain Verified: "pos.spar.ng"|  |
|  +--------------------------------------------------+  +---------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

### 5.1 Business Onboarding Engine

The platform provides both **Self-Service Onboarding** (`counterpoint.app/signup`) and **Super Admin Assisted Provisioning**:

```
                         SELF-SERVICE ONBOARDING PIPELINE
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
 [ Step 1: Account ]           [ Step 2: Store Details ]       [ Step 3: Billing / Plan ]
 - Owner Name & Email          - Business Name                 - Starter / Growth / Enterprise
 - Password & Phone            - Desired Subdomain             - Monthly / Annual Billing
 - 2FA Verification            - Currency (NGN/USD/KES)        - Paystack / Stripe Checkout
        │                               │                               │
        └───────────────────────────────┼───────────────────────────────┘
                                        │
                                        ▼
                   [ Provisioning Transaction (Atomic DB Worker) ]
                   1. Insert `tenants` record
                   2. Create default Branch ("Main Branch" - HQ)
                   3. Create default Register ("Till 1")
                   4. Create Store Admin user with owner credentials & default PIN (4444)
                   5. Seed default retail Categories & Starter Catalog
                   6. Provision Cloudflare SSL for `<slug>.counterpoint.app`
                   7. Warm Edge KV Cache with tenant routing data
                   8. Send Welcome Email & WhatsApp Receipt Onboarding Guide
```

### 5.2 Subscription & Payment Gateway Integration

```typescript
// Webhook Handler for Subscription Lifecycle (Paystack / Stripe)
export async function handleSubscriptionWebhook(payload: any, signature: string, gateway: 'paystack' | 'stripe') {
  // 1. Verify Webhook HMAC Signature
  verifyGatewaySignature(payload, signature, gateway);

  const event = payload.event; // e.g. 'charge.success', 'subscription.disable', 'invoice.payment_failed'

  switch (event) {
    case 'charge.success':
    case 'invoice.payment_succeeded': {
      const customerEmail = payload.data.customer.email;
      const amountPaid = payload.data.amount;
      const reference = payload.data.reference;

      const tenant = await findTenantByEmail(customerEmail);
      if (!tenant) throw new Error(`Tenant not found for email ${customerEmail}`);

      await dbPool.query(
        `UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [tenant.id]
      );

      await dbPool.query(
        `INSERT INTO subscription_invoices (tenant_id, invoice_number, amount_paid, currency, gateway, gateway_reference, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [tenant.id, `INV-${Date.now()}`, amountPaid, tenant.currency, gateway, reference]
      );

      // Invalidate Edge Cache to lift any suspension immediately
      await invalidateTenantEdgeCache(tenant.slug);
      break;
    }

    case 'subscription.disable':
    case 'customer.subscription.deleted': {
      const customerCode = payload.data.customer.customer_code || payload.data.customer;
      const tenant = await findTenantByGatewayCustomer(customerCode);
      if (tenant) {
        await dbPool.query(`UPDATE tenants SET status = 'suspended' WHERE id = $1`, [tenant.id]);
        await invalidateTenantEdgeCache(tenant.slug);
      }
      break;
    }
  }
}
```

### 5.3 Impersonation & Support Login Protocol

To troubleshoot store issues without asking for passwords:
1. Super Admin clicks **[Impersonate Tenant]** in the platform panel.
2. The server signs a short-lived (15-minute) **Tenant Impersonation JWT** containing:
   `{ sub: super_admin_id, impersonated_tenant_id: tenant_id, role: 'Store Admin', is_impersonation: true }`.
3. An audit log entry is immediately recorded (`SUPER_ADMIN_IMPERSONATION_STARTED`).
4. The Super Admin is redirected to `https://<slug>.counterpoint.app?impersonation_token=...`.
5. A high-visibility amber banner appears across the top: *"You are viewing Kemi Supermarket in Support Impersonation Mode. [Exit Session]"*.

---

## 6. Tenant Store Admin & Cashier Experience

### 6.1 Hierarchy & Multi-Branch Architecture

```
                               ┌───────────────────┐
                               │   TENANT ENTITY   │
                               │(e.g., Mega Mart)  │
                               └─────────┬─────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │ Branch 1: Ikeja HQ  │                   │ Branch 2: Lekki     │
         └──────────┬──────────┘                   └──────────┬──────────┘
                    │                                         │
             ┌──────┴──────┐                           ┌──────┴──────┐
             ▼             ▼                           ▼             ▼
       ┌──────────┐  ┌──────────┐                ┌──────────┐  ┌──────────┐
       │ Register │  │ Register │                │ Register │  │ Register │
       │  Till 1  │  │  Till 2  │                │  Till 1  │  │  Till 2  │
       └──────────┘  └──────────┘                └──────────┘  └──────────┘
```

### 6.2 Cashier Till Shift Lifecycle & X/Z Reports

1. **Shift Opening (Cash Float)**: Cashier starts shift, enters opening cash float (e.g. ₦10,000 for change).
2. **Active Sales Mode**: Fast barcode scanning, category quick keys, calculator discount helper, and split payments (Cash + Card/Transfer).
3. **Mid-Day X-Report**: Supervisor reads current till totals without resetting register accumulators.
4. **End-of-Day Z-Report (Reconciliation)**:
   - Cashier enters physical cash counted in drawer.
   - System calculates overage / shortage (`counted - (float + cash_sales)`).
   - Till is closed, shift summary is printed on thermal receipt, and record is synced to central DB.

---

## 7. Multi-Tenant Offline-First Synchronization Engine

Counterpoint's core competitive advantage is that **stores can trade for days without an internet connection**. When operating in multi-tenant mode, local storage must guarantee tenant isolation on shared devices while preventing sync collisions.

```
       [ Offline Till Action ] ─────────────────────────┐
                 │                                      │
                 ▼                                      ▼
     [ Local IndexedDB Store ]               [ Local Sync Queue ]
     - db: `counterpoint_${tenantId}`        - Queue mutation:
     - product stock decremented             - uuid: uuidv4()
     - sale saved as 'completed_offline'     - idempotency_key: sha256(...)
     - receipt printed instantly             - payload: { sale, items }
                 │                                      │
                 │                                      │
                 │   Internet Connection Restored       │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                     [ Delta Sync Worker (Online Event) ]
                                    │
                                    ▼
                  POST /api/v1/sync/sales-batch
                  Header: x-tenant-slug: 'kemi'
                  Body: { mutations: [ ...queuedSales ] }
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
   [ Central DB Ingestion ]                        [ Conflict Engine ]
   - Verify tenant context                         - If duplicate idempotency_key:
   - Begin Transaction                               -> Return 200 (Already synced)
   - Insert `sales` & `sale_items`                 - If stock depleted remotely:
   - Decrement `branch_inventory`                    -> Record negative adjustment
   - Emit audit log entry                            -> Alert Store Admin
   - Commit Transaction                              -> Flag inventory discrepancy
```

### 7.1 Tenant-Partitioned Local Storage (Dexie.js Schema)

```typescript
import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  image?: string;
  updatedAt: string;
}

export interface LocalSale {
  id: string;
  receiptNumber: string;
  idempotencyKey: string;
  cashierName: string;
  customerName: string;
  subtotal: number;
  discountPct: number;
  total: number;
  paymentMethod: string;
  items: Array<{ productId: string; name: string; qty: number; price: number; cost: number }>;
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface SyncMutation {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
}

// Factory function creates dedicated database per tenant slug
export class TenantPosDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>;
  syncQueue!: Table<SyncMutation, string>;

  constructor(tenantSlug: string) {
    // Unique database name per tenant prevents cross-tenant data contamination
    super(`counterpoint_pos_${tenantSlug}`);
    
    this.version(1).stores({
      products: 'id, sku, category, name',
      sales: 'id, receiptNumber, idempotencyKey, createdAt, syncStatus',
      syncQueue: 'id, idempotencyKey, createdAt'
    });
  }
}
```

### 7.2 Idempotent Server Sync API (`/api/v1/sync/batch`)

```typescript
// Next.js Route Handler / Fastify Controller
export async function POST(req: Request) {
  const tenantId = req.headers.get('x-counterpoint-tenant-id');
  const body = await req.json();
  const { mutations } = body; // Array of queued mutations from till

  return await withTenantContext(tenantId!, false, async (client) => {
    const results = [];

    for (const mutation of mutations) {
      const { idempotencyKey, type, data } = mutation;

      // 1. Check if mutation was already processed (Idempotency check)
      const existing = await client.query(
        `SELECT id FROM sales WHERE tenant_id = $1 AND client_idempotency_key = $2`,
        [tenantId, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        // Already recorded; acknowledge to client so it flushes local queue
        results.push({ idempotencyKey, status: 'already_synced', saleId: existing.rows[0].id });
        continue;
      }

      if (type === 'CREATE_SALE') {
        const sale = data;
        
        // 2. Insert Sale
        const saleRes = await client.query(
          `INSERT INTO sales (
            tenant_id, branch_id, register_id, receipt_number, client_idempotency_key,
            cashier_user_id, cashier_name, customer_name, subtotal_cents, discount_pct,
            discount_cents, tax_cents, total_cents, cost_total_cents, payment_method, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id`,
          [
            tenantId, sale.branchId, sale.registerId, sale.receiptNumber, idempotencyKey,
            sale.cashierId, sale.cashierName, sale.customerName, sale.subtotal, sale.discountPct,
            sale.discountAmount, sale.taxAmount, sale.total, sale.totalCost, sale.paymentMethod,
            sale.createdAt
          ]
        );
        const saleId = saleRes.rows[0].id;

        // 3. Insert Line Items and Adjust Inventory
        for (const item of sale.items) {
          await client.query(
            `INSERT INTO sale_items (tenant_id, sale_id, product_id, sku, product_name, category_name, unit_price_cents, unit_cost_cents, quantity, total_cents)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [tenantId, saleId, item.productId, item.sku, item.name, item.category, item.price, item.cost, item.qty, item.price * item.qty]
          );

          await client.query(
            `UPDATE branch_inventory 
             SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE tenant_id = $2 AND branch_id = $3 AND product_id = $4`,
            [item.qty, tenantId, sale.branchId, item.productId]
          );
        }

        results.push({ idempotencyKey, status: 'synced', saleId });
      }
    }

    return Response.json({ success: true, processed: results });
  });
}
```

---

## 8. API Specifications & System Routes

```
API Endpoints Overview:
├── /api/public/
│   ├── POST   /onboarding/register         (Public self-service tenant sign up)
│   ├── GET    /onboarding/check-subdomain  (Real-time subdomain availability check)
│   └── POST   /webhooks/paystack           (Paystack recurring charge webhook)
│   └── POST   /webhooks/stripe             (Stripe webhook)
│
├── /api/platform-admin/ (Super Admin - Guarded by `platform_super_admin` role)
│   ├── GET    /analytics/overview          (Platform GMV, MRR, ARR, Churn, Active Tills)
│   ├── GET    /tenants                     (Paginated list of all businesses with filters)
│   ├── POST   /tenants                     (Manual tenant creation by Super Admin)
│   ├── GET    /tenants/:id                 (Tenant deep-dive, branches, staff, invoices)
│   ├── PATCH  /tenants/:id/status          (Suspend, reactivate, or cancel tenant)
│   ├── POST   /tenants/:id/impersonate     (Generate support impersonation token)
│   └── GET    /audit-logs                  (Global system audit logs)
│
└── /api/v1/ (Tenant Scoped - Injected `tenant_id` from Host header / Subdomain)
    ├── POST   /auth/till-pin               (Cashier PIN verification -> Scoped JWT)
    ├── GET    /bootstrap                   (Initial sync payload: products, categories, staff, settings)
    ├── GET    /products                    (Fetch active product catalog)
    ├── POST   /products                    (Create product)
    ├── POST   /products/bulk-csv           (Bulk CSV import for inventory)
    ├── GET    /branches                    (List store branches)
    ├── GET    /staff                       (List staff roster)
    ├── POST   /staff                       (Add new employee with role & PIN)
    ├── PATCH  /staff/:id                   (Update role, status, reset PIN)
    ├── POST   /sync/batch                  (Idempotent bulk mutation sync from offline till)
    ├── GET    /reports/daily-z             (Generate end-of-day Z-Report for branch)
    └── GET    /reports/sales-analytics     (Revenue, gross margin, top items, payment breakdown)
```

---

## 9. Implementation Phases & Step-by-Step Delivery Roadmap

```
                                  4-PHASE IMPLEMENTATION TIMELINE
                                  
  PHASE 1: Core Foundation       PHASE 2: Multi-Tenancy        PHASE 3: Super Admin          PHASE 4: Scale & Billing
  [Weeks 1 - 3]                 [Weeks 4 - 6]                 [Weeks 7 - 9]                 [Weeks 10 - 12]
  ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
  │ • PostgreSQL + RLS DDL │    │ • Wildcard Subdomains  │    │ • Super Admin Console  │    │ • Paystack/Stripe Sub  │
  │ • Supabase Auth Bridge │    │ • Next.js Edge Router  │    │ • Platform Analytics   │    │ • Multi-Branch Matrix  │
  │ • Tenant Schema & Seed │    │ • Onboarding Wizard    │    │ • Tenant Impersonation │    │ • Barcode HW & Thermal │
  │ • PIN Token Auth Engine│    │ • Dexie Multi-DB Sync  │    │ • Business Suspend/Mod │    │ • Custom Domains SSL   │
  └────────────────────────┘    └────────────────────────┘    └────────────────────────┘    └────────────────────────┘
```

### Phase 1: Database & Core Data Layer (Weeks 1 – 3)
- [x] Create PostgreSQL migration scripts for `tenants`, `branches`, `users`, `products`, `sales`, `audit_logs`.
- [x] Configure Supabase / PostgreSQL Row-Level Security policies ensuring 100% tenant data isolation.
- [x] Implement DB connection pooling with transaction-scoped tenant context (`set_config('app.current_tenant_id', ...)`).
- [x] Refactor existing `src/services/store.js` into an adapter interface supporting both `Dexie` (local IndexedDB) and remote REST sync.

### Phase 2: Wildcard Subdomains & Tenant Onboarding (Weeks 4 – 6)
- [x] Configure Wildcard DNS (`*.counterpoint.app`) on Cloudflare / Vercel.
- [x] Implement Next.js Edge Middleware for subdomain parsing and tenant resolution.
- [x] Build public self-service onboarding wizard at `counterpoint.app/signup`:
  - Subdomain live availability check (e.g. `kemi` -> `kemi.counterpoint.app`).
  - Automatic seed catalog injection and owner PIN initialization.
- [x] Upgrade local till storage to initialize database instances dynamically based on tenant slug (`counterpoint_pos_${slug}`).

### Phase 3: Super Admin ("General Admin") Platform Portal (Weeks 7 – 9)
- [x] Build isolated Super Admin portal at `admin.counterpoint.app`.
- [x] Create Global Executive Dashboard: Platform GMV, Active Stores, Total Tills Online, Churn, ARR/MRR.
- [x] Implement Tenant Directory with search, status filters (Active, Trialing, Suspended), and quick actions.
- [x] Implement secure 1-click **Super Admin Impersonation** session generation for customer support.
- [x] Build Global Audit Log viewer with real-time SSE / WebSocket streaming.

### Phase 4: Subscription Billing, Multi-Branch & Enterprise Tier (Weeks 10 – 12)
- [x] Integrate **Paystack Recurring Subscriptions** (for Nigeria/West Africa) and **Stripe Billing** (for international).
- [x] Implement automated webhook ingestion for renewal charges, failed payments, and automatic account suspension/reactivation.
- [x] Add multi-branch inventory transfers and stock level alerts per branch.
- [x] Add Cloudflare for SaaS custom domain provisioning for Enterprise clients (`pos.brandname.com`).
- [x] Conduct load testing, penetration testing on RLS policies, and chaos testing for offline synchronization edge cases.

---

## 10. Security, Compliance & Disaster Recovery Runbook

1. **Zero-Trust Database Isolation**: Every single SQL query executed on behalf of a tenant must be bound by Row-Level Security. Direct table queries without tenant context are rejected by default.
2. **PIN Security**: Till PINs are hashed using `Argon2id` (or `bcrypt` with cost factor 12) with unique per-tenant salts. Plaintext PINs are never stored or logged in telemetry.
3. **Data Residency & Backups**:
   - Automated continuous Write-Ahead Log (WAL) archiving with Point-In-Time Recovery (PITR) up to 30 days.
   - Daily encrypted database dumps stored in multi-region S3 buckets.
   - Automated quarterly disaster recovery drills (RTO < 30 minutes, RPO < 60 seconds).
4. **Tenant Data Export & GDPR Compliance**:
   - Store admins can generate a 1-click full export of their business data (`GET /api/v1/tenant/export`) in JSON/CSV format containing all sales, inventory, and audit logs.
   - Tenant offboarding permanently anonymizes PII while preserving platform financial audit totals.

---
*Blueprint Approved for Counterpoint Engineering Team.*
