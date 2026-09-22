# AuraNER / NER-Route AI — Security, Governance & Compliance Strategy

## 1. Security Architecture Principles

Operating smart logistics in India's North Eastern Region involves civil supplies, state disaster responses, and critical border supply lines. The security posture adheres to five core principles:
1. **Zero Trust Architecture (ZTA)**: Never trust, always verify. Every internal RPC, API call, and telemetry ping is authenticated and authorized.
2. **Defense-in-Depth**: Multi-layered controls spanning edge protection, transport security, application authorization, database row-level security, and physical data center residency.
3. **Data Sovereignty & Residency**: 100% of telemetry, driver records, and manifest data resides within sovereign Indian territory in compliance with Indian law.
4. **Cryptographic Tamper-Evidence**: Security and operational audit trails are mathematically protected against retro-active alteration.
5. **Least Privilege Enforcement**: Granular RBAC ensuring personnel access only the data strictly necessary for their active duties.

---

## 2. Authentication & Identity Management

### 2.1 Unified Identity Architecture (Firebase Authentication)
- **Identity Provider**: Centralized user identity managed via Firebase Authentication with the Firebase Admin SDK on the FastAPI backend.
- **Driver Mobile Auth**:
  - Phone Number OTP verification with rate limiting (max 3 requests per 5 minutes per IP/number).
  - Firebase Phone Auth with SMS verification.
  - Biometric device unlock (TouchID / FaceID) storing device-bound cryptographic tokens.
- **Web Portal Auth**:
  - Corporate Email / Password and Enterprise SSO (SAML 2.0 / OpenID Connect) for government and institutional logistics managers.
  - Mandatory Multi-Factor Authentication (MFA) for `SUPER_ADMIN` and `ORG_ADMIN` roles.
- **Token Lifecycle**:
  - Short-lived JSON Web Tokens (JWT) with 1-hour expiration.
  - Automatic token refresh via Firebase client SDKs.
  - Server-side token revocation checking using Redis token revocation blocklists for compromised accounts.

---

## 3. Multi-Tenancy & Data Isolation

### 3.1 Logical Multi-Tenancy via PostgreSQL Row-Level Security (RLS)
The platform isolates data across multiple organizations (e.g. State Food & Civil Supplies, NDRF Battalions, Private Freight Carriers):
- Every tenant-scoped table enforces `org_id UUID NOT NULL REFERENCES organizations(id)`.
- FastAPI sets the active tenant context on the PostgreSQL connection session for every request:
  ```sql
  SET LOCAL app.current_tenant_id = 'c0000000-0000-0000-0000-000000000001';
  ```
- PostgreSQL RLS policies enforce isolation transparently:
  ```sql
  ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY tenant_isolation_policy ON shipments
    FOR ALL
    TO authenticated_role
    USING (org_id = current_setting('app.current_tenant_id')::uuid);
  ```

### 3.2 Global Data vs Tenant Data
- **Tenant-Isolated Entities**: Users, Vehicles, Drivers, Shipments, Shipment Items, Trips, Route Versions, Alerts.
- **Globally Shared Public Safety Data**: Geographic Locations, Safe Havens (Police Posts, Hospitals), Road Events (Landslides, Blockages), Meteorological Weather Observations.

---

## 4. Role-Based Access Control (RBAC)

FastAPI endpoints enforce role requirements using dependency injection:

```python
# FastAPI RBAC Dependency Example
@router.post("/shipments/{id}/dispatch", dependencies=[Depends(RequirePermissions(["shipments:dispatch"]))])
async def dispatch_shipment(id: UUID, current_user: User = Depends(get_current_active_user)):
    ...
```

### 4.1 Role Hierarchy & Scopes
- **`SUPER_ADMIN`**: Global scope. Bypasses tenant RLS; provisions organizations; manages system-wide integrations and audit logs.
- **`ORG_ADMIN`**: Organization scope. Manages organization users, fleet assets, and facility registries.
- **`DISPATCHER`**: Facility/corridor scope. Creates shipments, assigns drivers, triggers route recalculations, acknowledges alerts.
- **`LOGISTICS_MANAGER`**: Fleet/analytics scope. Analyzes transit KPIs, audits driver compliance, manages fleet maintenance.
- **`DRIVER`**: Personal scope. Accesses only currently assigned trip, submits telemetry, reports roadside hazards.
- **`VIEWER`**: Read-only dashboard scope. Observes active shipments and general safety radar.

---

## 5. Cryptography & Data Protection

### 5.1 Transport Security (Data in Transit)
- TLS 1.3 enforced on all external and internal endpoints; TLS 1.0 and 1.1 strictly disabled.
- HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) injected into HTTP response headers.
- Mutual TLS (mTLS) for machine-to-machine telemetry ingestion from enterprise IoT gateways.

### 5.2 Storage Security (Data at Rest)
- Database storage volumes encrypted via AES-256.
- Sensitive PII (Driver National IDs, Aadhaar numbers, license numbers) encrypted at the application layer before database insertion using envelope encryption.
- Backups and object storage buckets encrypted with customer-managed keys (CMK) rotated annually.

### 5.3 Secrets Management
- Zero secrets committed to source repositories (`.gitignore` enforces exclusions).
- Production secrets injected via Azure Key Vault or AWS Secrets Manager into container environments at runtime.

---

## 6. Immutable Audit Trail & Tamper-Evidence

Every security-sensitive or operational action records an entry in the `audit_logs` table:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  previous_state JSONB,
  new_state JSONB,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.1 Cryptographic Hash Chaining
Each audit log row computes its `current_hash` using:
$$\text{current\_hash} = \text{SHA-256}(\text{previous\_hash} \parallel \text{id} \parallel \text{action} \parallel \text{entity\_id} \parallel \text{new\_state} \parallel \text{created\_at})$$
Any manual alteration of a historical log entry invalidates the entire subsequent cryptographic chain, making tampering immediately detectable.

---

## 7. Regulatory Compliance & Data Sovereignty

### 7.1 DPDP Act 2023 (India)
- **Data Minimization**: Telemetry collection is restricted to active trip windows; GPS tracking halts upon trip completion.
- **Consent & Notice**: Driver applications display clear notices regarding real-time safety tracking and crash detection.
- **Right to Erasure**: Workflows to purge driver PII upon employment termination while preserving anonymized trip telemetry for route training.

### 7.2 Sovereign Data Hosting
- Cloud infrastructure deployed exclusively in Indian cloud regions:
  - Azure: Central India (Pune) / South India (Chennai).
  - AWS: ap-south-1 (Mumbai) / ap-south-2 (Hyderabad).
