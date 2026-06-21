import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsUUID, IsInt, Min, IsNumber } from 'class-validator';

@InputType()
export class TransactionItemInput {
  @Field(() => ID)
  @IsUUID()
  medicineId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price!: number;
}
