import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { TransactionType } from './transaction-type.enum';
import { TransactionDetail } from './transaction-detail.entity';

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id!: string;

  @Field()
  trxNumber!: string;

  @Field(() => TransactionType)
  type!: TransactionType;

  @Field(() => Float)
  totalAmount!: number;

  @Field()
  createdAt!: Date;

  @Field(() => [TransactionDetail])
  details!: TransactionDetail[];
}
