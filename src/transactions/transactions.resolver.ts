import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';

@Resolver(() => Transaction)
export class TransactionsResolver {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Query(() => [Transaction], { name: 'transactions' })
  findAll() {
    return this.transactionsService.findAll();
  }

  @Query(() => Transaction, { name: 'transaction' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Mutation(() => Transaction, { name: 'createTransaction' })
  createTransaction(@Args('input') input: CreateTransactionInput) {
    return this.transactionsService.create(input);
  }

  @Mutation(() => Transaction, { name: 'updateTransaction' })
  updateTransaction(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTransactionInput,
  ) {
    return this.transactionsService.update(id, input);
  }

  @Mutation(() => Boolean, { name: 'deleteTransaction' })
  deleteTransaction(@Args('id', { type: () => ID }) id: string) {
    return this.transactionsService.remove(id);
  }
}
