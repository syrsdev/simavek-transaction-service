import { InputType, Field } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../entities/transaction-type.enum';
import { TransactionItemInput } from './transaction-item.input';

@InputType()
export class UpdateTransactionInput {
  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @Field(() => [TransactionItemInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemInput)
  @ArrayMinSize(1)
  items?: TransactionItemInput[];
}
