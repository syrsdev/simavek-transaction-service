import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { TransactionType } from './entities/transaction-type.enum';
import { UpdateTransactionInput } from './dto/update-transaction.input';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.transaction.findMany({
      include: { details: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaksi dengan id ${id} tidak ditemukan`);
    }
    return transaction;
  }

  create(input: CreateTransactionInput) {
    const detailsData = input.items.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));
    const totalAmount = detailsData.reduce((sum, d) => sum + d.subtotal, 0);

    return this.prisma.transaction.create({
      data: {
        trxNumber: this.generateTrxNumber(input.type),
        type: input.type,
        totalAmount,
        details: { create: detailsData },
      },
      include: { details: true },
    });
  }

  async update(id: string, input: UpdateTransactionInput) {
    await this.findOne(id); // pastikan ada, kalau tidak otomatis throw NotFoundException

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (input.type) updateData.type = input.type;

      if (input.items) {
        // ganti semua detail lama dengan yang baru
        await tx.transactionDetail.deleteMany({ where: { transactionId: id } });
        const detailsData = input.items.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        }));
        updateData.totalAmount = detailsData.reduce(
          (sum, d) => sum + d.subtotal,
          0,
        );
        updateData.details = { create: detailsData };
      }

      return tx.transaction.update({
        where: { id },
        data: updateData,
        include: { details: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.transaction.delete({ where: { id } }); // detail ikut terhapus otomatis (onDelete: Cascade)
    return true;
  }

  private generateTrxNumber(type: TransactionType): string {
    const prefix = type === TransactionType.sale ? 'SAL' : 'PUR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
}
