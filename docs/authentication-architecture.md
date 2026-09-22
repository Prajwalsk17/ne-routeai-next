# Authentication Architecture & Implementation Specification
## Production-Grade Firebase & Cryptographic Session Architecture

### 1. Executive Summary

This specification establishes the production **Authentication Foundation** for the **AuraNER / NER-Route AI** platform. Built in compliance with Phase 1–4 blueprints, the authentication architecture establishes zero-trust identity verification across the Web Command Portal, Driver Mobile applications, and backend REST endpoints.

Core security guarantees:
1. **Zero Fake Users / Zero Convenience Bypasses**: All protected pages and non-public API endpoints strictly require a cryptographically verified token.
2. **Dual-Engine Token Verification**:
   - **Firebase Authentication Engine**: Validates Google-signed Firebase ID tokens (RS256) against Google's live public x509 certificates and project claims (`FIREBASE_PROJECT_ID`).
   - **Cryptographic Session Engine**: Supports cryptographically signed HS256 tokens using `JWT_SECRET` with strict expiration and claim enforcement, ensuring unbroken developer workflows in offline mountain simulations and local development.
3. **Defense-in-Depth Session Protection**:
   - Primary Session: **HTTP-Only, Secure, SameSite=Lax** session cookie (`ner_session`) inaccessible to client-side JavaScript, mitigating Cross-Site Scripting (XSS) credential theft.
   - Mobile/M2M: Standard `Authorization: Bearer <token>` header support.
4. **Automated Edge Middleware Guard**: Edge middleware interceptor at `src/middleware.ts` guarding all 14 operational web portal routes and sensitive `/api/*` endpoints.

---

### 2. End-to-End Authentication Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as Logistics Controller / Driver
    participant Browser as Client Browser / Mobile
    participant AuthAPI as Auth API (/api/auth/session)
    participant Verifier as Token Verifier (token-verifier.ts)
    participant MW as Edge Middleware (middleware.ts)
    participant CoreAPI as Protected API (/api/v1/dispatch)

    Note over User,Browser: 1. Sign-In Flow
    User->>Browser: Enters credentials / Firebase ID Token
    Browser->>AuthAPI: POST /api/auth/session { idToken }
    AuthAPI->>Verifier: verifyAuthToken(idToken)
    alt Valid Signature & Unexpired
        Verifier-->>AuthAPI: VerifiedTokenPayload (userId, email, role, org)
        AuthAPI-->>Browser: Set-Cookie: ner_session (HTTP-Only, Secure, Lax) + 200 OK
    else Invalid Signature or Expired
        Verifier-->>AuthAPI: TokenExpiredError / InvalidTokenError
        AuthAPI-->>Browser: 401 Unauthorized { error: "TOKEN_EXPIRED" }
    end

    Note over Browser,CoreAPI: 2. Protected Request Flow
    Browser->>MW: GET /dispatch (Includes ner_session cookie)
    MW->>MW: Check cookie presence & validity
    alt Authenticated Session Present
        MW->>CoreAPI: Forward Request (200 OK)
    else Missing or Expired Session
        MW-->>Browser: 302 Redirect to /login?from=/dispatch
    end

    Note over User,Browser: 3. Sign-Out Flow
    User->>Browser: Click Sign Out
    Browser->>AuthAPI: POST /api/auth/signout
    AuthAPI-->>Browser: Set-Cookie: ner_session=; Max-Age=0; Expires=Epoch
    Browser->>Browser: Clear client storage & redirect to /login
```

---

### 3. Dual-Engine Verification (`src/lib/auth/token-verifier.ts`)

The token verifier dynamically routes incoming tokens based on structural inspection:

#### 3.1 Firebase Authentication Verification (RS256)
- **Token Format**: Standard Google-issued JWT with header `{"alg": "RS256", "kid": "..."}`.
- **Certificate Caching**: Fetches Google's public signing certificates from:
  `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`
  Caches keys in memory respecting HTTP `Cache-Control: max-age` response headers (typically 3600 seconds).
- **Claim Verification**:
  - `iss`: Must match `https://securetoken.google.com/<project_id>`
  - `aud`: Must match configured `FIREBASE_PROJECT_ID` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `exp`: Must be in the future; throws `TokenExpiredError` if expired.
  - `sub`: Non-empty subject identifier mapping to the user's `firebase_uid`.

#### 3.2 Cryptographic Session Verification Fallback (HS256)
- **Token Format**: HMAC-SHA256 token signed with server-side `JWT_SECRET`.
- **Claim Verification**:
  - Validates cryptographic signature using `JWT_SECRET`.
  - Enforces `exp` expiration window (default 24 hours).
  - Validates user claims (`userId`, `email`, `role`, `organizationId`).

---

### 4. Session Cookie & Token Security

| Property | Value | Security Rationale |
|---|---|---|
| **Cookie Name** | `ner_session` | Isolated primary session container. |
| **HttpOnly** | `true` | Prevents unauthorized JavaScript read access via `document.cookie` (XSS mitigation). |
| **Secure** | `true` (in production) | Enforces transmission exclusively over encrypted TLS/HTTPS connections. |
| **SameSite** | `Lax` | Protects against Cross-Site Request Forgery (CSRF) on cross-origin requests while enabling top-level navigation. |
| **Path** | `/` | Accessible across all sub-paths of the application. |
| **Max-Age** | `86400` (24 Hours) | Bounded session lifetime requiring periodic re-authentication. |

---

### 5. Protected Routes & Middleware Access Control

Next.js Edge Middleware (`src/middleware.ts`) enforces strict perimeter controls:

#### 5.1 Public Routes (No Authentication Required)
- **Pages**:
  - `/` (Public landing and mission overview)
  - `/login` (User authentication portal)
  - `/signup` (Operator registration portal)
- **APIs**:
  - `/api/auth/session` (Session establishment)
  - `/api/auth/login` (Credential verification)
  - `/api/auth/signup` (Registration)
  - `/api/auth/verify-otp` (OTP verification)
  - `/api/auth/resend-otp` (OTP resend)
  - `/api/auth/signout` (Session termination)
  - `/api/health` (Liveness and readiness probes)
- **Static Assets**:
  - `/_next/*`, `/static/*`, `favicon.ico`, `.png`, `.svg`, `.woff2`

#### 5.2 Protected Operational Routes (Authentication Required)
All other paths require an active, valid session:
- `/dashboard`: Command Center overview
- `/dispatch` & `/dispatch/new`: Live dispatch radar and shipment generator
- `/fleet`: Vehicle inventory and maintenance
- `/routes`: AI route optimizer and elevation profile
- `/risk`: Landslide and weather risk radar
- `/accessibility`: Remote settlement isolation tracker
- `/emergency`: Disaster response and safe haven mission optimizer
- `/warehouses`: Supply depot inventory management
- `/demand`: Freight forecasting
- `/simulator`: Monsoon disaster simulation
- `/copilot`: AI natural language operational copilot
- `/analytics`: Regional transit KPIs and delivery metrics
- `/driver`: In-cab driver navigation and telemetry view
- `/settings`: Organization and account configuration
- `/api/v1/*`: All core business API endpoints

**Action on Unauthenticated Request**:
- **Protected Pages**: Returns HTTP 302 redirect to `/login?from=<target_path>`.
- **Protected APIs**: Returns HTTP 401 JSON with standard error envelope:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required. Please sign in."
    },
    "meta": {
      "timestamp": "2026-09-19T14:55:00.000Z"
    }
  }
  ```

---

### 6. Authentication API Endpoints

#### `POST /api/auth/session`
- **Purpose**: Establishes a verified server-side session from a Firebase ID token or client token.
- **Request Body**:
  ```json
  {
    "idToken": "<firebase_id_token_or_jwt>"
  }
  ```
- **Response**: Sets `ner_session` HTTP-only cookie and returns user profile.

#### `GET /api/auth/me`
- **Purpose**: Retrieves the active session user identity from the incoming cookie or Bearer header.
- **Responses**:
  - `200 OK`: `{ "success": true, "data": { "user": { "id": "...", "email": "...", "role": "..." } } }`
  - `401 Unauthorized`: When session is expired, missing, or malformed.

#### `POST /api/auth/signout`
- **Purpose**: Invalidates the current session.
- **Response**: Clears `ner_session` and `ner_token` cookies (`Max-Age=0`).

---

### 7. Environment Configuration Guide (Zero Secrets)

Configure the following environment variables across deployment stages:

```env
# -----------------------------------------------------------------------------
# Firebase Authentication Configuration
# -----------------------------------------------------------------------------
# Server-side Firebase Project Verification
FIREBASE_PROJECT_ID=auraner-prod-auth
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@auraner-prod-auth.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY must be injected via Key Vault / Secrets Manager at runtime

# Client-side Firebase SDK Credentials
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auraner-prod-auth.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=auraner-prod-auth
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=auraner-prod-auth.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef

# -----------------------------------------------------------------------------
# Session Security
# -----------------------------------------------------------------------------
# Cryptographic secret for signing session tokens (min 32 characters in production)
JWT_SECRET=your-cryptographically-random-32-byte-hex-string
```

> [!CAUTION]
> Never commit actual `FIREBASE_PRIVATE_KEY` values or production `JWT_SECRET` strings to git. Use Azure Key Vault or AWS Secrets Manager to inject secrets into container runtime environments.
