import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAYMENT_METHODS = [
  { id: 1, name: "Cash", type: "cash", upiId: null, isEnabled: true },
  { id: 2, name: "Card/Digital", type: "card", upiId: null, isEnabled: true },
  { id: 3, name: "UPI QR", type: "upi", upiId: "cafe@ybl", isEnabled: true }
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting ? setting.value : null;
  }

  async setSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getPaymentMethods() {
    const value = await this.getSetting('payment_methods');
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return DEFAULT_PAYMENT_METHODS;
      }
    }
    // Initialize in DB
    await this.setSetting('payment_methods', JSON.stringify(DEFAULT_PAYMENT_METHODS));
    return DEFAULT_PAYMENT_METHODS;
  }

  async updatePaymentMethods(methods: any[]) {
    await this.setSetting('payment_methods', JSON.stringify(methods));
    return methods;
  }
}
