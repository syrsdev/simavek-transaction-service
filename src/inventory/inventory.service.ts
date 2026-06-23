import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient, gql } from 'graphql-request';

export interface MedicineData {
  id: string;
  name: string;
  price: number;
  stock: number;
  min_stock: number;
}

@Injectable()
export class InventoryService {
  private client: GraphQLClient;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>(
      'HASURA_GRAPHQL_ENDPOINT',
      'http://localhost:8080/v1/graphql',
    );
    const adminSecret = this.config.get<string>(
      'HASURA_ADMIN_SECRET',
      'myadminsecret',
    );

    this.client = new GraphQLClient(endpoint, {
      headers: {
        'x-hasura-admin-secret': adminSecret,
      },
    });
  }

  // Ambil data obat dari Inventory Service (nama, harga, stok saat ini)
  async getMedicineById(medicineId: string): Promise<MedicineData> {
    const query = gql`
      query GetMedicine($id: uuid!) {
        medicines_by_pk(id: $id) {
          id
          name
          price
          stock
          min_stock
        }
      }
    `;

    try {
      const result = await this.client.request<{
        medicines_by_pk: MedicineData | null;
      }>(query, { id: medicineId });

      if (!result.medicines_by_pk) {
        throw new BadRequestException(
          `Obat dengan id ${medicineId} tidak ditemukan`,
        );
      }

      return result.medicines_by_pk;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Unknown error';
      throw new InternalServerErrorException(
        `Gagal menghubungi Inventory Service: ${message}`,
      );
    }
  }

  // Update stok obat - delta negatif untuk sale, positif untuk purchase
  async adjustStock(medicineId: string, delta: number): Promise<void> {
    const mutation = gql`
      mutation AdjustStock($id: uuid!, $delta: Int!) {
        update_medicines_by_pk(
          pk_columns: { id: $id }
          _inc: { stock: $delta }
        ) {
          id
          stock
        }
      }
    `;

    try {
      await this.client.request(mutation, { id: medicineId, delta });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Unknown error';
      throw new InternalServerErrorException(
        `Gagal update stok di Inventory Service: ${message}`,
      );
    }
  }
}
