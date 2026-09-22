/**
 * AuraNER / NER-Route AI — Production Alerts & Notifications Domain Types
 * 
 * Defines enterprise contracts for alerts, multi-channel notifications (FCM Push, In-App, SMS),
 * delivery lifecycle, deduplication, retries, and auditability.
 */

import { Coordinates } from '@/lib/providers/types';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertCategory =
  | 'ROAD_HAZARD'
  | 'WEATHER_DISRUPTION'
  | 'VEHICLE_BREAKDOWN'
  | 'CARGO_COMPROMISE'
  | 'GEOFENCE_DEVIATION'
  | 'SOS_EMERGENCY'
  | 'OPERATIONAL_DELAY'
  | 'SYSTEM';

export type AlertStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'FAILED';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'SMS' | 'EMAIL' | 'LOG';

export type NotificationStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING';

export type RecipientType = 'DRIVER' | 'DISPATCHER' | 'ADMIN' | 'ORG_BROADCAST';

export interface AlertRecipient {
  id: string;
  recipientId: string;
  recipientType: RecipientType;
  channel: NotificationChannel;
  destination?: string; // FCM push token, phone number, email address, or user ID
  status: NotificationStatus;
  deliveryAttempts: number;
  lastAttemptAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  messageId?: string | null;
}

export interface AlertRecord {
  id: string;
  organizationId: string;
  alertCode: string;
  category: AlertCategory;
  type?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  shipmentId?: string | null;
  tripId?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  coordinates?: Coordinates | null;
  distanceToHazardKm?: number | null;
  deduplicationKey?: string;
  status: AlertStatus;
  recipients: AlertRecipient[];
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  provenanceHash: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  alertId?: string | null;
  recipientId: string;
  recipientType: RecipientType;
  channel: NotificationChannel;
  destination: string;
  title: string;
  body: string;
  priority: AlertSeverity;
  status: NotificationStatus;
  deliveryAttempts: number;
  maxRetries: number;
  lastAttemptAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  providerMessageId?: string | null;
  deduplicationKey: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertParams {
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  type?: string;
  organizationId?: string;
  shipmentId?: string;
  tripId?: string;
  vehicleId?: string;
  driverId?: string;
  incidentId?: string;
  coordinates?: Coordinates;
  distanceToHazardKm?: number;
  deduplicationKey?: string;
  recipients?: {
    recipientId: string;
    recipientType: RecipientType;
    channel: NotificationChannel;
    destination?: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AcknowledgeAlertParams {
  alertId: string;
  action: 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE' | 'DISMISS';
  notes?: string;
}

export interface SendNotificationParams {
  recipientId: string;
  recipientType: RecipientType;
  channel: NotificationChannel;
  destination: string;
  title: string;
  body: string;
  priority?: AlertSeverity;
  alertId?: string;
  deduplicationKey?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertQueryFilter {
  status?: AlertStatus | 'ACTIVE';
  severity?: AlertSeverity;
  category?: AlertCategory;
  shipmentId?: string;
  tripId?: string;
  vehicleId?: string;
  driverId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationQueryFilter {
  recipientId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  alertId?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}
