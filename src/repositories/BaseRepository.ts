import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import db from '../database/db';

export abstract class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  protected db: Knex;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  protected getQuery(trx?: Knex.Transaction) {
    return trx ? trx<T>(this.tableName) : this.db<T>(this.tableName);
  }

  async findAll(trx?: Knex.Transaction): Promise<T[]> {
    return this.getQuery(trx).select('*') as unknown as Promise<T[]>;
  }

  async findById(id: number | string, trx?: Knex.Transaction): Promise<T | undefined> {
    return this.getQuery(trx).where('id', id).first() as unknown as Promise<T | undefined>;
  }

  async findOne(filter: Partial<T>, trx?: Knex.Transaction): Promise<T | undefined> {
    return this.getQuery(trx).where(filter as any).first() as unknown as Promise<T | undefined>;
  }

  async findMany(filter: Partial<T>, trx?: Knex.Transaction): Promise<T[]> {
    return this.getQuery(trx).where(filter as any) as unknown as Promise<T[]>;
  }

  async create(data: Partial<T>, trx?: Knex.Transaction): Promise<T> {
    const query = this.getQuery(trx);
    const payload = { ...data } as Record<string, any>;
    if (!payload.id) {
      payload.id = randomUUID();
    }

    const inserted = await query.insert(payload as any);
    const id = payload.id ?? (Array.isArray(inserted) ? inserted[0] : inserted);
    const createdRecord = await this.findById(id as string | number, trx);
    if (!createdRecord) {
      throw new Error('Failed to create record');
    }
    return createdRecord;
  }

  async update(id: number | string, data: Partial<T>, trx?: Knex.Transaction): Promise<T | undefined> {
    await this.getQuery(trx).where('id', id).update(data as any);
    return this.findById(id, trx);
  }

  async delete(id: number | string, trx?: Knex.Transaction): Promise<boolean> {
    const deletedRows = await this.getQuery(trx).where('id', id).del();
    return deletedRows > 0;
  }

  async findAndUpdate(filter: Partial<T>, data: Partial<T>, trx?: Knex.Transaction): Promise<T | undefined> {
    const record = await this.findOne(filter, trx);
    if (!record) {
      return undefined;
    }
    return this.update(record.id as string | number, data, trx);
  }
}
