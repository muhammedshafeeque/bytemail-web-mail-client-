import webpush from 'web-push';
import { env } from '../config/env';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${env.VAPID_EMAIL}`,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(
  userEmail: string,
  payload: { title: string; body: string; icon?: string; data?: Record<string, unknown> }
): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

  const user = await User.findOne({ email: userEmail }).select('push_subscriptions').lean();
  if (!user?.push_subscriptions?.length) return;

  const notifications = user.push_subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        sub as webpush.PushSubscription,
        JSON.stringify(payload)
      );
    } catch (err) {
      logger.warn('Push notification failed', { error: (err as Error).message });
      if ((err as { statusCode?: number }).statusCode === 410) {
        await User.updateOne(
          { email: userEmail },
          { $pull: { push_subscriptions: sub } }
        );
      }
    }
  });

  await Promise.allSettled(notifications);
}
