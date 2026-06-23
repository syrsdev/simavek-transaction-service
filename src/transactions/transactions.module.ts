import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsResolver } from './transactions.resolver';
import { InventoryModule } from '../inventory/inventory.module';
import { RabbitmqModule } from 'rabbitmq/rabbitmq.module';

@Module({
  imports: [InventoryModule, RabbitmqModule],
  providers: [TransactionsService, TransactionsResolver],
})
export class TransactionsModule {}
