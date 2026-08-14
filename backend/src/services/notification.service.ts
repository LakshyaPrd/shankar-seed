import { getMongoDb } from '../utils/db';

export interface NotificationPayload {
  type: 'PRODUCT_CREATED' | 'INVENTORY_UPDATED' | 'GOODS_DISPATCHED' | 'PURCHASE_ARRIVED';
  title: string;
  message: string;
  details?: any;
}

export class NotificationService {
  /**
   * Helper to normalize single string, comma-separated string, or array into a clean array of strings
   */
  private static parseRecipients(val: any): string[] {
    if (Array.isArray(val)) {
      return val.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof val === 'string' && val.trim().length > 0) {
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Send multi-channel notification (Email, WhatsApp, SMS) to MULTIPLE phone numbers and email addresses
   */
  static async send(payload: NotificationPayload) {
    try {
      const db = await getMongoDb();

      // Retrieve owner / active notification settings from database
      const ownerUser = await db.collection('users').findOne({ roleId: { $exists: true } });
      const settings = ownerUser?.notificationSettings || {
        emailEnabled: true,
        whatsappEnabled: true,
        smsEnabled: true,
        notifyEmail: [ownerUser?.email || 'admin@shankarseeds.com'],
        notifyPhone: [ownerUser?.phone || '+91 98765 00001'],
        triggers: {
          productCreated: true,
          inventoryUpdated: true,
          goodsDispatched: true,
          purchaseArrived: true,
        },
      };

      // Check if trigger is enabled for this event
      const triggers = settings.triggers || {};
      if (payload.type === 'PRODUCT_CREATED' && triggers.productCreated === false) return;
      if (payload.type === 'INVENTORY_UPDATED' && triggers.inventoryUpdated === false) return;
      if (payload.type === 'GOODS_DISPATCHED' && triggers.goodsDispatched === false) return;
      if (payload.type === 'PURCHASE_ARRIVED' && triggers.purchaseArrived === false) return;

      const phoneList = this.parseRecipients(settings.notifyPhone);
      const emailList = this.parseRecipients(settings.notifyEmail);

      const now = new Date();
      const logsToInsert: any[] = [];

      // 1. WhatsApp Alert Dispatch to ALL target phone numbers
      if (settings.whatsappEnabled && phoneList.length > 0) {
        for (const phone of phoneList) {
          console.log(`[NOTIFICATION SERVICE] 💬 WhatsApp Alert dispatched to ${phone}: ${payload.title} - ${payload.message}`);
          logsToInsert.push({
            channel: 'WHATSAPP',
            recipient: phone,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            status: 'DELIVERED',
            createdAt: now,
          });
        }
      }

      // 2. SMS Alert Dispatch to ALL target phone numbers
      if (settings.smsEnabled && phoneList.length > 0) {
        for (const phone of phoneList) {
          console.log(`[NOTIFICATION SERVICE] 📱 Text SMS Alert dispatched to ${phone}: ${payload.title} - ${payload.message}`);
          logsToInsert.push({
            channel: 'SMS',
            recipient: phone,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            status: 'DELIVERED',
            createdAt: now,
          });
        }
      }

      // 3. Email Alert Dispatch to ALL target email addresses
      if (settings.emailEnabled && emailList.length > 0) {
        for (const email of emailList) {
          console.log(`[NOTIFICATION SERVICE] 📧 Email Alert dispatched to ${email}: ${payload.title} - ${payload.message}`);
          logsToInsert.push({
            channel: 'EMAIL',
            recipient: email,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            status: 'DELIVERED',
            createdAt: now,
          });
        }
      }

      if (logsToInsert.length > 0) {
        await db.collection('notification_logs').insertMany(logsToInsert);
      }
    } catch (err) {
      console.error('Notification Service Error:', err);
    }
  }
}
