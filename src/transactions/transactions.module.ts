import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsResolver } from './transactions.resolver';

@Module({
  providers: [TransactionsService, TransactionsResolver],
})
export class TransactionsModule {}
