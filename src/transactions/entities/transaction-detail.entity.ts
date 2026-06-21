import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class TransactionDetail {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  medicineId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  subtotal!: number;
}
