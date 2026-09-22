/**
 * AuraNER / NER-Route AI — Offline Synchronization Domain Types
 * 
 * Defines data structures for the driver's local-first outbox queue,
 * batch synchronization payloads, explicit conflict resolution strategies,
 * and per-operation sync outcomes.
 */

export type SyncOperationType =
  | 'GPS_PING'
  | 'CHECKPOINT_CLEARANCE'
  | 'HAZARD_REPORT'
  | 'PROOF_OF_DELIVERY'
  | 'SOS_TRIGGER';

export type SyncItemStatus =
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'CONFLICT'
  | 'FAILED'
  | 'REJECTED';

export type ConflictResolutionStrategy =
  | 'SERVER_WINS'
  | 'CLIENT_WINS'
  | 'MERGE'
  | 'REJECTED_INVALID';

export interface ConflictDetails {
  conflictType: string;
  serverStatus?: string;
  serverVersion?: number | string;
  resolution: ConflictResolutionStrategy;
  resolutionReason: string;
}

export interface SyncOperationItem {
  id: string; // Client-generated UUID
  type: SyncOperationType;
  entityId: string; // e.g. shipmentId, tripStopId, vehicleId
  payload: Record<string, unknown>;
  clientTimestamp: string; // ISO 8601 UTC when driver triggered action
  version?: number | string;
  retryCount: number;
  status: SyncItemStatus;
  error?: string;
  conflict?: ConflictDetails;
}

export interface SyncBatchPayload {
  deviceId: string;
  driverId: string;
  organizationId: string;
  operations: SyncOperationItem[];
}

export interface SyncOperationResult {
  id: string;
  type: SyncOperationType;
  entityId: string;
  status: SyncItemStatus;
  conflict?: ConflictDetails;
  error?: string;
  serverEntity?: unknown;
}

export interface SyncBatchResult {
  batchId: string;
  processedCount: number;
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
  results: SyncOperationResult[];
}
