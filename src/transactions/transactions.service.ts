import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
import { TransactionType } from './entities/transaction-type.enum';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private rabbitmqService: RabbitmqService,
  ) {}

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

  async create(input: CreateTransactionInput) {
    // 1. Ambil data obat dari Inventory Service
    const medicines = await Promise.all(
      input.items.map((item) =>
        this.inventoryService.getMedicineById(item.medicineId),
      ),
    );

    // 2. Validasi stok untuk transaksi sale
    if (input.type === TransactionType.sale) {
      for (let i = 0; i < input.items.length; i++) {
        const medicine = medicines[i];
        const item = input.items[i];
        if (medicine.stock < item.quantity) {
          throw new BadRequestException(
            `Stok ${medicine.name} tidak mencukupi. Tersedia: ${medicine.stock}, diminta: ${item.quantity}`,
          );
        }
      }
    }

    // 3. Hitung subtotal & total
    const detailsData = input.items.map((item, idx) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      price: medicines[idx].price,
      subtotal: Number(medicines[idx].price) * item.quantity,
    }));
    const totalAmount = detailsData.reduce((sum, d) => sum + d.subtotal, 0);

    // 4. Simpan transaksi ke database
    const transaction = await this.prisma.transaction.create({
      data: {
        trxNumber: this.generateTrxNumber(input.type),
        type: input.type,
        totalAmount,
        details: { create: detailsData },
      },
      include: { details: true },
    });

    // 5. Update stok di Inventory Service
    await Promise.all(
      input.items.map((item) => {
        const delta =
          input.type === TransactionType.sale ? -item.quantity : item.quantity;
        return this.inventoryService.adjustStock(item.medicineId, delta);
      }),
    );

    // 6. Kirim event ke RabbitMQ
    this.rabbitmqService.publishTransactionCompleted({
      trxNumber: transaction.trxNumber,
      transactionType: transaction.type as 'sale' | 'purchase',
      totalAmount: Number(transaction.totalAmount),
    });

    this.logger.log(`Transaksi ${transaction.trxNumber} berhasil dibuat`);
    return transaction;
  }

  // method update & remove tidak berubah, tetap sama seperti sebelumnya
  async update(id: string, input: UpdateTransactionInput) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (input.type) updateData.type = input.type;

      if (input.items) {
        const medicines = await Promise.all(
          input.items.map((item) =>
            this.inventoryService.getMedicineById(item.medicineId),
          ),
        );

        await Promise.all(
          existing.details.map((detail: any) => {
            const reverseDelta =
              existing.type === TransactionType.sale
                ? detail.quantity
                : -detail.quantity;
            return this.inventoryService.adjustStock(
              detail.medicineId,
              reverseDelta,
            );
          }),
        );

        const newType = input.type ?? existing.type;
        if (newType === TransactionType.sale) {
          for (let i = 0; i < input.items.length; i++) {
            if (medicines[i].stock < input.items[i].quantity) {
              await Promise.all(
                existing.details.map((detail: any) => {
                  const redoDelta =
                    existing.type === TransactionType.sale
                      ? -detail.quantity
                      : detail.quantity;
                  return this.inventoryService.adjustStock(
                    detail.medicineId,
                    redoDelta,
                  );
                }),
              );
              throw new BadRequestException(
                `Stok ${medicines[i].name} tidak mencukupi`,
              );
            }
          }
        }

        await Promise.all(
          input.items.map((item, idx) => {
            const delta =
              newType === TransactionType.sale ? -item.quantity : item.quantity;
            return this.inventoryService.adjustStock(item.medicineId, delta);
          }),
        );

        const detailsData = input.items.map((item, idx) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          price: medicines[idx].price,
          subtotal: Number(medicines[idx].price) * item.quantity,
        }));
        updateData.totalAmount = detailsData.reduce(
          (sum, d) => sum + d.subtotal,
          0,
        );
        await tx.transactionDetail.deleteMany({ where: { transactionId: id } });
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
    const existing = await this.findOne(id);

    await Promise.all(
      existing.details.map((detail: any) => {
        const delta =
          existing.type === TransactionType.sale
            ? detail.quantity
            : -detail.quantity;
        return this.inventoryService.adjustStock(detail.medicineId, delta);
      }),
    );

    await this.prisma.transaction.delete({ where: { id } });
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
