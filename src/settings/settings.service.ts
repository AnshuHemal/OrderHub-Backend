import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as net from 'net';

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

  async getPrinterSettings() {
    const value = await this.getSetting('printer_settings');
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        // use default fallback below
      }
    }
    const defaultSettings = {
      receiptPrinter: {
        type: 'browser',
        paperWidth: '80mm',
        ipAddress: '',
        port: 9100,
        autoPrint: false,
      },
      kitchenPrinter: {
        type: 'browser',
        paperWidth: '80mm',
        ipAddress: '',
        port: 9100,
        autoPrint: false,
      },
    };
    await this.setSetting('printer_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  }

  async updatePrinterSettings(settings: any) {
    await this.setSetting('printer_settings', JSON.stringify(settings));
    return settings;
  }

  async printToNetwork(ip: string, port: number, base64Data: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!ip) {
        return resolve({ success: false, error: 'Printer IP address is required' });
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const socket = new net.Socket();
      
      socket.setTimeout(5000); // 5 seconds timeout
      
      socket.connect(port || 9100, ip, () => {
        socket.write(buffer, () => {
          socket.end();
          resolve({ success: true });
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timed out' });
      });
    });
  }
}
