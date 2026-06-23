import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, Min } from 'class-validator';

@InputType()
export class TransactionItemInput {
  @Field(() => ID)
  @IsUUID()
  medicineId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity!: number;
}
