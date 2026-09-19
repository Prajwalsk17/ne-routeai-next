import { NotificationPayload, NotificationProvider } from '@/lib/providers/types';
import { getEnv } from '@/lib/env';

export class MockNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }> {
    const msgId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    console.log(`\n========================================`);
    console.log(`📢 [ALERT BROADCAST] Channel: ${payload.channel}`);
    console.log(`Priority:  ${payload.priority}`);
    console.log(`Recipient: ${payload.recipient}`);
    console.log(`Title:     ${payload.title}`);
    console.log(`Body:      ${payload.body}`);
    if (payload.metadata) {
      console.log(`Metadata:  ${JSON.stringify(payload.metadata)}`);
    }
    console.log(`========================================\n`);

    return { success: true, messageId: msgId };
  }
}

export class CompositeNotificationProvider implements NotificationProvider {
  private mockProvider: MockNotificationProvider;

  constructor() {
    this.mockProvider = new MockNotificationProvider();
  }

  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const env = getEnv();

    // Critical alerts always trigger in-app & console broadcast
    if (payload.priority === 'CRITICAL') {
      await this.mockProvider.send({
        ...payload,
        title: `🚨 CRITICAL EMERGENCY: ${payload.title}`,
      });
    }

    if (env.NOTIFICATION_PROVIDER === 'mock' || env.NOTIFICATION_PROVIDER === 'log') {
      return this.mockProvider.send(payload);
    }

    // In production, adapters for Twilio, Resend, or Web Push would be triggered here
    return this.mockProvider.send(payload);
  }
}

let _notificationProvider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (!_notificationProvider) {
    _notificationProvider = new CompositeNotificationProvider();
  }
  return _notificationProvider;
}
