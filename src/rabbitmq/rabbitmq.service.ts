import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface TransactionCompletedEvent {
  trxNumber: string;
  transactionType: 'sale' | 'purchase';
  totalAmount: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  publishTransactionCompleted(
    payload: Omit<TransactionCompletedEvent, 'message' | 'timestamp'>,
  ) {
    const event: TransactionCompletedEvent = {
      ...payload,
      message: `Transaksi ${payload.trxNumber} (${payload.transactionType}) senilai Rp${payload.totalAmount} berhasil`,
      timestamp: new Date().toISOString(),
    };

    // emit = fire and forget, tidak butuh response balik dari consumer
    this.client.emit('transaction_completed', event);
    this.logger.log(`Event terkirim ke RabbitMQ: ${JSON.stringify(event)}`);
  }
}
