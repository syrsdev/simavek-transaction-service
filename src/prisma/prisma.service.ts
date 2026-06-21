import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Service ini membungkus PrismaClient supaya bisa di-inject (Dependency Injection)
// ke service lain, dan otomatis connect/disconnect mengikuti siklus hidup aplikasi NestJS.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
