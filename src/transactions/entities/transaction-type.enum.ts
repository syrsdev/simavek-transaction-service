import { registerEnumType } from '@nestjs/graphql';

export enum TransactionType {
  sale = 'sale',
  purchase = 'purchase',
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
  description:
    'Tipe transaksi: penjualan ke pelanggan atau pembelian dari supplier',
});
