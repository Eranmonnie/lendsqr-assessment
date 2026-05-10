import { Knex } from "knex";
import { randomUUID } from "crypto";
import db from "../database/db";

export abstract class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  protected db: Knex;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Builds a query builder for the current table.
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Knex query builder for the repository table
   */
  protected getQuery(trx?: Knex.Transaction) {
    return trx ? trx<T>(this.tableName) : this.db<T>(this.tableName);
  }

  /**
   * Returns all records from the repository table.
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T[]> (all records)
   */
  async findAll(trx?: Knex.Transaction): Promise<T[]> {
    return this.getQuery(trx).select("*") as unknown as Promise<T[]>;
  }

  /**
   * Finds a record by its ID.
   * @param id number | string (record ID)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T | undefined> (matched record)
   */
  async findById(
    id: number | string,
    trx?: Knex.Transaction,
  ): Promise<T | undefined> {
    return this.getQuery(trx).where("id", id).first() as unknown as Promise<
      T | undefined
    >;
  }

  /**
   * Finds the first record matching a filter.
   * @param filter Partial<T> (query filter)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T | undefined> (matched record)
   */
  async findOne(
    filter: Partial<T>,
    trx?: Knex.Transaction,
  ): Promise<T | undefined> {
    return this.getQuery(trx)
      .where(filter as any)
      .first() as unknown as Promise<T | undefined>;
  }

  /**
   * Finds all records matching a filter.
   * @param filter Partial<T> (query filter)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T[]> (matched records)
   */
  async findMany(filter: Partial<T>, trx?: Knex.Transaction): Promise<T[]> {
    return this.getQuery(trx).where(filter as any) as unknown as Promise<T[]>;
  }

  /**
   * Creates a new record in the repository table.
   * @param data Partial<T> (record payload)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T> (created record)
   * @throws Error if the record cannot be created
   */
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
      throw new Error("Failed to create record");
    }
    return createdRecord;
  }

  /**
   * Updates a record by ID.
   * @param id number | string (record ID)
   * @param data Partial<T> (patch payload)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T | undefined> (updated record)
   */
  async update(
    id: number | string,
    data: Partial<T>,
    trx?: Knex.Transaction,
  ): Promise<T | undefined> {
    await this.getQuery(trx)
      .where("id", id)
      .update(data as any);
    return this.findById(id, trx);
  }

  /**
   * Deletes a record by ID.
   * @param id number | string (record ID)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<boolean> (true when a row was deleted)
   */
  async delete(id: number | string, trx?: Knex.Transaction): Promise<boolean> {
    const deletedRows = await this.getQuery(trx).where("id", id).del();
    return deletedRows > 0;
  }

  /**
   * Finds a record matching a filter and updates it.
   * @param filter Partial<T> (lookup filter)
   * @param data Partial<T> (update payload)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T | undefined> (updated record)
   */
  async findAndUpdate(
    filter: Partial<T>,
    data: Partial<T>,
    trx?: Knex.Transaction,
  ): Promise<T | undefined> {
    const record = await this.findOne(filter, trx);
    if (!record) {
      return undefined;
    }
    return this.update(record.id as string | number, data, trx);
  }

  /**
   * Creates a record or returns the existing one if a duplicate key occurs.
   * @param data Partial<T> (record payload)
   * @param condition Partial<T> (lookup condition if duplicate occurs)
   * @param trx Knex.Transaction (optional transaction scope)
   * @returns Promise<T | undefined> (created or existing record)
   */
  async createOrGetByCondition(
    data: Partial<T>,
    condition?: Partial<T>,
    trx?: Knex.Transaction,
  ): Promise<T | undefined> {
    try {
      return await this.create(data, trx);
    } catch (error: any) {
      // Catch duplicate reference (MySQL error code 1062, or generic duplicate key)
      if (
        error.code === "ER_DUP_ENTRY" ||
        error.errno === 1062 ||
        error.message?.includes("UNIQUE constraint")
      ) {
        const searchCondition = condition || data;
        const existing = await this.findOne(searchCondition as Partial<T>, trx);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Find records with pagination support
   * @param filter Partial query filter
   * @param limit Number of records to return (default 10, max 100)
   * @param offset Number of records to skip (default 0)
   * @param orderBy Column to order by (default 'created_at')
   * @param orderDirection Sort direction (default 'desc')
   * @param trx Optional transaction
   */
  async findWithPagination(
    filter: Partial<T>,
    limit: number = 10,
    offset: number = 0,
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc',
    trx?: Knex.Transaction,
  ): Promise<T[]> {
    return this.getQuery(trx)
      .where(filter as any)
      .orderBy(orderBy, orderDirection)
      .limit(Math.min(limit, 100))
      .offset(Math.max(offset, 0))
      .select('*') as unknown as Promise<T[]>;
  }

  /**
   * Find records with pagination using a custom query builder
   */
  async findWithPaginationByQuery(
    buildQuery: (query: Knex.QueryBuilder<T, any>) => Knex.QueryBuilder<T, any>,
    limit: number = 10,
    offset: number = 0,
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc',
    trx?: Knex.Transaction,
  ): Promise<T[]> {
    return buildQuery(this.getQuery(trx))
      .orderBy(orderBy, orderDirection)
      .limit(Math.min(limit, 100))
      .offset(Math.max(offset, 0))
      .select('*') as unknown as Promise<T[]>;
  }

  /**
   * Count records matching a filter
   * @param filter Partial query filter
   * @param trx Optional transaction
   */
  async countByCondition(
    filter: Partial<T>,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const result = await this.getQuery(trx)
      .where(filter as any)
      .count('*', { as: 'count' })
      .first();
    return (result?.count as number) || 0;
  }

  /**
   * Count records using a custom query builder
   */
  async countByQuery(
    buildQuery: (query: Knex.QueryBuilder<T, any>) => Knex.QueryBuilder<T, any>,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const result = await buildQuery(this.getQuery(trx))
      .count('*', { as: 'count' })
      .first();
    return (result?.count as number) || 0;
  }
}
