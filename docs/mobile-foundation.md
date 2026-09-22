# AuraNER / NER-Route AI — Driver Mobile Foundation (Phase 8 Specification)

## 1. Executive Summary & Architectural Overview

Phase 8 establishes the **React Native + Expo** driver mobile application foundation for the **AuraNER / NER-Route AI** platform in strict accordance with the Phase 2 Mobile Information Architecture (`docs/mobile-information-architecture.md`), Phase 5 Authentication, and Phase 6 RBAC models.

The mobile application is designed specifically for field drivers and military/disaster convoy operators navigating severe Himalayan mountain terrain (NH-29, NH-2, NH-10, Trans-Arunachal Highway). It features in-cab operational ergonomics, large touch targets, offline outbox queuing, and emergency safety protocols.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 REACT NATIVE + EXPO DRIVER MOBILE ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ App.tsx: [AuthProvider] -> [OfflineSyncProvider] -> [SafeAreaView]      │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│   ┌────────────────────────────────────▼────────────────────────────────────┐   │
│   │ RootNavigator (Session & Driver Role Verification)                      │   │
│   ├────────────────────────────────────┬────────────────────────────────────┤   │
│   │ Unauthenticated:                   │ Authenticated Driver:              │   │
│   │ • AuthScreen (Phone OTP / Touch ID)│ • Persistent Bottom Tabs           │   │
│   │                                    │ • Driving Action Stack Modals      │   │
│   └────────────────────────────────────┴────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ 10 Modular Driver Screens (Phase 2 Specifications)                      │   │
│   │ 1. AuthScreen        2. HomeScreen          3. MyTripScreen             │   │
│   │ 4. NavigationScreen  5. TripStatusScreen    6. ReportProblemScreen      │   │
│   │ 7. Notifications     8. SosScreen           9. ProfileScreen            │   │
│   │ 10. OfflineSyncScreen                                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ In-Cab Mobile Ergonomics & Reusable UI Components                       │   │
│   │ • MobileButton (48pt / 64pt)       • MobileCard (forest-200)            │   │
│   │ • MobileBadge (Status chips)       • EmptyStateView (Actionable)        │   │
│   │ • ErrorStateView (Diagnostic)      • LoadingSkeletonView (Shimmers)     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Monorepo Coexistence

The mobile application is isolated under `mobile/` to maintain clean separation between the Next.js web application and the React Native runtime:

```
ne-routeai-next/
├── mobile/
│   ├── app.json                     # Expo manifest (in.gov.auraner.driver)
│   ├── package.json                 # Mobile dependencies
│   ├── tsconfig.json                # React Native isolated TypeScript config
│   ├── App.tsx                      # Application root entry point
│   └── src/
│       ├── components/              # In-cab ergonomic UI components
│       │   ├── MobileButton.tsx     # 48pt / 64pt driving touch buttons
│       │   ├── MobileCard.tsx       # Elevated forest-200 dark cards
│       │   ├── MobileBadge.tsx      # Semantic status badges
│       │   ├── EmptyStateView.tsx   # Universal empty state
│       │   ├── ErrorStateView.tsx   # Diagnostic error container
│       │   └── LoadingSkeletonView.tsx # Geometry shimmer boxes
│       ├── context/                 # Context providers
│       │   ├── AuthContext.tsx      # Driver session & duty status
│       │   └── OfflineSyncContext.tsx # Outbox queue foundation
│       ├── navigation/              # Navigation hierarchy
│       │   ├── types.ts             # Navigation parameter lists
│       │   └── RootNavigator.tsx    # Conditional auth / tab navigation
│       ├── screens/                 # 10 Mobile Module Screens
│       │   ├── AuthScreen.tsx       # Module 1: /auth/phone
│       │   ├── HomeScreen.tsx       # Module 2: /home
│       │   ├── MyTripScreen.tsx     # Module 3: /trip/details
│       │   ├── NavigationScreen.tsx # Module 4: /navigation
│       │   ├── TripStatusScreen.tsx # Module 5: /trip/status
│       │   ├── ReportProblemScreen.tsx # Module 6: /report-problem
│       │   ├── NotificationsScreen.tsx # Module 7: /notifications
│       │   ├── SosScreen.tsx        # Module 8: /sos
│       │   ├── ProfileScreen.tsx    # Module 9: /profile
│       │   └── OfflineSyncScreen.tsx# Module 10: /sync
│       ├── services/
│       │   └── config.ts            # Mobile environment configuration
│       ├── theme/
│       │   └── tokens.ts            # Phase 2 design tokens
│       └── types/
│           └── mobile.ts            # Mobile domain interfaces
├── src/                             # Next.js web portal (Phases 1–7)
└── tsconfig.json                    # Root tsconfig (excludes mobile)
```

---

## 3. The 10 Driver Mobile Modules

All 10 screen modules required by Phase 2 UX/UI specifications are fully implemented:

### 3.1 Module 1: Driver Authentication (`/auth/phone`)
- **Key Elements**: Country code selector (`+91`), 10-digit phone number input, 6-digit auto-advancing OTP input, biometric quick-shift unlock button.
- **Security & Role Gating**: Enforces role eligibility (`DRIVER`, `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`).

### 3.2 Module 2: Home Dashboard (`/home`)
- **Key Elements**: Driver profile header, duty status toggle (`ON_DUTY` / `OFF_DUTY`), connectivity indicator, offline outbox badge (`X queued`).
- **Zero Fabrication**: When no trip is active, renders an accurate **Universal Empty State** guiding the driver to await dispatch planning.
- **In-Cab Actions**: Large driving buttons for Navigation, Trip Status & e-POD, Hazard Reporting, and Emergency SOS.

### 3.3 Module 3: My Trip Itinerary (`/trip/details`)
- **Key Elements**: Multi-stop milestone sequence (Depot $\to$ Checkpoints $\to$ Delivery), cold-chain manifest handling instructions, safe havens notice.
- **Zero Fabrication**: Renders clean Empty State when no shipment is assigned.

### 3.4 Module 4: Turn-by-Turn Navigation Shell (`/navigation`)
- **Key Elements**: Top maneuver guidance banner, mountain warning pill (hairpin bends, gradient $> 12\%$), vector map viewport shell.
- **Operational Invariant**: In accordance with user instructions, displays **GPS Telemetry Standby** mode rather than fabricating fake GPS positions or simulation loops.

### 3.5 Module 5: Trip Status & Electronic POD (`/trip/status`)
- **Key Elements**: Milestone transition actions (`Depart Depot`, `Clear Checkpoint`, `Arrived at Destination`), recipient verification input, digital touch signature pad placeholder, cold-chain integrity checklist.
- **Offline Readiness**: Submissions are queued to the local outbox.

### 3.6 Module 6: Report Road Hazard (`/report-problem`)
- **Key Elements**: Rapid in-cab hazard category grid (`Landslide`, `Mudslip`, `Flash Flood`, `Bridge Collapse`, `Road Block`, `Accident`, `Fallen Tree`), severity selector (`Passable with Caution`, `Single Lane Only`, `Completely Blocked`).
- **Immediate Broadcast**: Enqueues incident report directly into the outbox.

### 3.7 Module 7: Notifications & Advisories (`/notifications`)
- **Key Elements**: Categorized dispatch advisories, route recalculation prompts, and severe meteorological bulletins.
- **Zero Fabrication**: Displays accurate empty state when all corridors are clear.

### 3.8 Module 8: Emergency SOS Beacon (`/sos`)
- **Key Elements**: High-visibility crisis beacon button, 5-second countdown cancel window (to prevent accidental pocket triggers), active beacon transmission state, direct one-touch call triggers (`Police 112`, `Ambulance 108`, `Dispatch Control`).

### 3.9 Module 9: Driver Profile & Documents (`/profile`)
- **Key Elements**: Driver credentials, commercial driving license status, Himalayan mountain transit permit compliance, encrypted checkpoint digital QR pass, shift end / sign out button.

### 3.10 Module 10: Offline Synchronization Outbox (`/sync`)
- **Key Elements**: Real-time connection status banner (`Connected 4G` vs `Offline`), outbox queue counter, pending items list, manual `Force Sync Now` trigger.
- **Zero Fabrication**: Displays "Outbox Clear — Fully Synchronized" when pending count is 0.

---

## 4. In-Cab Ergonomics & Reusable UI Components

The mobile UI adheres strictly to rugged in-cab operational requirements:
- **Touch Target Ergonomics**:
  - Minimum touch target: $48\times48\text{ pt}$ (`TOUCH_TARGETS.standard`).
  - Driving action buttons: $64\text{ pt}$ (`TOUCH_TARGETS.driving`).
- **Design Tokens**:
  - `forest500` (`#080C0A`), `forest400` (`#0E1612`), `forest300` (`#14201A`), `forest200` (`#1A2E23`), `forest100` (`#213830`).
  - `mist` (`#E2E8F0`), `mistDim` (`#94A3B8`), `mistMuted` (`#64748B`).
  - `orchid` (`#A855F7`), `teal` (`#0D9488`), `amber` (`#F59E0B`), `danger` (`#EF4444`), `safe` (`#22C55E`).
- **Universal States**:
  - `EmptyStateView`: Icon, title, description, and primary/secondary actions.
  - `ErrorStateView`: Correlation ID badge, message, and non-blocking retry button.
  - `LoadingSkeletonView`: Content-shaped shimmer/pulse geometry placeholders.

---

## 5. Offline Synchronization Foundation

The outbox queue foundation manages local-first operational reliability:
- **Item Types**: `GPS_PING`, `CHECKPOINT_CLEARANCE`, `HAZARD_REPORT`, `PROOF_OF_DELIVERY`, `SOS_TRIGGER`.
- **Status Progression**: `QUEUED` $\to$ `SYNCING` $\to$ `SYNCED` or `FAILED`.
- **Safety Rules**: Configured with mountain thresholds (max 500 queued items, 5 max retries, 3s retry delay).

---

## 6. Verification Matrix

```
=============================================================================
                       PHASE 8 VERIFICATION MATRIX
=============================================================================
 Vitest Automated Tests      :  94 / 94 Passed (8 test suites, 100%)
 Mobile TypeScript Check     :  0 Errors (tsc -p mobile/tsconfig.json --noEmit)
 Web TypeScript Strict Check :  0 Errors (tsc --noEmit)
 Next.js Production Build    :  37 / 37 Routes Compiled Successfully
=============================================================================
```

- **Dedicated Mobile Test Suite**: [`src/lib/test/driver-mobile.test.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/test/driver-mobile.test.ts) (10 tests passing):
  - Validates Phase 2 color tokens and $48\text{pt}$ / $64\text{pt}$ touch targets.
  - Validates mobile configuration and mountain gradient rules.
  - Validates driver authentication, phone/OTP validation, and role gating.
  - Validates offline outbox queuing, status transitions, and zero-fabrication clean state.
  - Validates emergency SOS countdown and hotline contacts (112, 108, Dispatch).
  - Validates coverage of all 10 screen modules.
