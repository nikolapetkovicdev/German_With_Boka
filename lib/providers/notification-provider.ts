import {Locale} from '@prisma/client';
import {prisma} from '@/lib/prisma';

export interface NotificationProvider {
  send(userId: string, title: string, body: string, locale: Locale, critical?: boolean): Promise<void>;
}

class MockNotificationProvider implements NotificationProvider {
  async send(userId: string, title: string, body: string, locale: Locale, critical = false) {
    await prisma.notification.create({data: {userId, title, body, locale, critical, sentAt: new Date()}});
  }
}

export const notificationProvider: NotificationProvider = new MockNotificationProvider();
