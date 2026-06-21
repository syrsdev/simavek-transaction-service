import { InputType, Field } from '@nestjs/graphql';
import { ArrayMinSize, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../entities/transaction-type.enum';
import { TransactionItemInput } from './transaction-item.input';

@InputType()
export class CreateTransactionInput {
  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  type!: TransactionType;

  @Field(() => [TransactionItemInput])
  @ValidateNested({ each: true })
  @Type(() => TransactionItemInput)
  @ArrayMinSize(1)
  items!: TransactionItemInput[];
}
