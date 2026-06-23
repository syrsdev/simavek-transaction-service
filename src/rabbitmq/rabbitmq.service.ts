import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface TransactionCompletedEvent {
  trxNumber: string;
  transactionType: 'sale' | 'purchase';
  totalAmount: number;
  message: string;
  timestamp: string;
}

export interface LowStockEvent {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  minStock: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
    @Inject('RABBITMQ_LOW_STOCK_CLIENT')
    private readonly lowStockClient: ClientProxy,
  ) {}

  publishTransactionCompleted(
    payload: Omit<TransactionCompletedEvent, 'message' | 'timestamp'>,
  ) {
    const event: TransactionCompletedEvent = {
      ...payload,
      message: `Transaksi ${payload.trxNumber} (${payload.transactionType}) senilai Rp${payload.totalAmount} berhasil`,
      timestamp: new Date().toISOString(),
    };
    this.client.emit('transaction_completed', event);
    this.logger.log(`Event transaksi terkirim: ${event.trxNumber}`);
  }

  publishLowStock(payload: Omit<LowStockEvent, 'message' | 'timestamp'>) {
    const event: LowStockEvent = {
      ...payload,
      message: `Stok ${payload.medicineName} menipis! Sisa ${payload.currentStock} unit (minimum: ${payload.minStock})`,
      timestamp: new Date().toISOString(),
    };
    this.lowStockClient.emit('notification.low_stock', event);
    this.logger.log(`Event low stock terkirim: ${payload.medicineName}`);
  }
}
