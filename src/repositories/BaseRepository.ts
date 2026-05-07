import { Knex } from 'knex';
import db from '../database/db';

export abstract class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  protected db: Knex;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  protected get query() {
    return this.db<T>(this.tableName);
  }

  async findAll(): Promise<T[]> {
    return this.query.select('*') as unknown as Promise<T[]>;
  }

  async findById(id: number | string): Promise<T | undefined> {
    return this.query.where('id', id).first() as unknown as Promise<T | undefined>;
  }

  async findOne(filter: Partial<T>): Promise<T | undefined> {
    return this.query.where(filter as any).first() as unknown as Promise<T | undefined>;
  }

  async findMany(filter: Partial<T>): Promise<T[]> {
    return this.query.where(filter as any) as unknown as Promise<T[]>;
  }

  async create(data: Partial<T>): Promise<T> {
    const [id] = await this.query.insert(data as any);
    const createdRecord = await this.findById(id as number);
    if (!createdRecord) {
      throw new Error('Failed to create record');
    }
    return createdRecord;
  }

  async update(id: number | string, data: Partial<T>): Promise<T | undefined> {
    await this.query.where('id', id).update(data as any);
    return this.findById(id);
  }

  async delete(id: number | string): Promise<boolean> {
    const deletedRows = await this.query.where('id', id).del();
    return deletedRows > 0;
  }
}
