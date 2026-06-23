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
    const medicines = await Promise.all(
      input.items.map((item) =>
        this.inventoryService.getMedicineById(item.medicineId),
      ),
    );

    if (input.type === TransactionType.sale) {
      for (let i = 0; i < input.items.length; i++) {
        if (medicines[i].stock < input.items[i].quantity) {
          throw new BadRequestException(
            `Stok ${medicines[i].name} tidak mencukupi. Tersedia: ${medicines[i].stock}, diminta: ${input.items[i].quantity}`,
          );
        }
      }
    }

    const detailsData = input.items.map((item, idx) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      price: medicines[idx].price,
      subtotal: Number(medicines[idx].price) * item.quantity,
    }));
    const totalAmount = detailsData.reduce((sum, d) => sum + d.subtotal, 0);

    const transaction = await this.prisma.transaction.create({
      data: {
        trxNumber: this.generateTrxNumber(input.type),
        type: input.type,
        totalAmount,
        details: { create: detailsData },
      },
      include: { details: true },
    });

    // Update stok & cek low stock
    const updatedMedicines = await Promise.all(
      input.items.map((item) => {
        const delta =
          input.type === TransactionType.sale ? -item.quantity : item.quantity;
        return this.inventoryService.adjustStock(item.medicineId, delta);
      }),
    );

    updatedMedicines.forEach((medicine) => {
      if (medicine.stock <= medicine.min_stock) {
        this.rabbitmqService.publishLowStock({
          medicineId: medicine.id,
          medicineName: medicine.name,
          currentStock: medicine.stock,
          minStock: medicine.min_stock,
        });
        this.logger.warn(
          `Low stock: ${medicine.name} sisa ${medicine.stock} unit`,
        );
      }
    });

    this.rabbitmqService.publishTransactionCompleted({
      trxNumber: transaction.trxNumber,
      transactionType: transaction.type as 'sale' | 'purchase',
      totalAmount: Number(transaction.totalAmount),
    });

    this.logger.log(`Transaksi ${transaction.trxNumber} berhasil dibuat`);
    return transaction;
  }

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
          input.items.map((item) => {
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
