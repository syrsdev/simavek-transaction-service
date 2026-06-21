import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() artinya PrismaService bisa dipakai di module manapun
// tanpa perlu import PrismaModule berulang-ulang di tiap module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
