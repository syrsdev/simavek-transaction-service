import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { TransactionsModule } from 'transactions/transactions.module';
import { TransactionsService } from 'transactions/transactions.service';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // skema GraphQL akan di-generate OTOMATIS dari decorator di kode kita (code-first)
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    PrismaModule,
    TransactionsModule,
  ],
  providers: [PrismaService, TransactionsService],
})
export class AppModule {}
