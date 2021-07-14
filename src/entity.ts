import {
  EntityFields,
  FoundRecord,
  Indexes
} from './types';
import {
  defer,
  genToArr,
  idbRequestWrapper,
  mergeWords,
  splitByWords,
  sort as sortF,
  iterSort
} from './utils';
import { SortOptions } from './types';

export class BaseEntity {
  static NAME: string;
  static INDEXES: Indexes = [];
  // TODO: feature
  static CONSTRAINTS: [];
  static FIELDS: EntityFields;

  protected readonly db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  async add<T = any>(record: Partial<T>): Promise<T> {
    const [_, autoIncrementKey] = getEntityKeyPath(Object.getPrototypeOf(this).constructor);

    const pkValue = await idbRequestWrapper<IDBValidKey>(
      this.getObjectStore('readwrite').add(record)
    );
    return {
      ...record,
      // if there's not autoIncrement PK the record should already has the key paths and we don't to merge them
      ...(autoIncrementKey && { [autoIncrementKey]: pkValue })
    } as any;
  }

  async* iterate<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    {
      offset, limit
    }: {
      offset?: number
      limit?: number
    } = {
      offset: null, limit: null
    }
  ): AsyncGenerator<T, void, IDBValidKey> {

    const objectStore = this.getObjectStore();
    const cursorRequest = this.requestMethodSelector<IDBCursorWithValue | null>(
      objectStore, query, 'openCursor'
    );
    let cursorIterationFinishedPromise = defer<IDBCursorWithValue | null, IDBRequest>();

    cursorRequest.onsuccess = (e: Event) => {
      const cursor = ((e.target) as IDBRequest<IDBCursorWithValue | null>).result;
      cursorIterationFinishedPromise.resolve(cursor);
    };
    cursorRequest.onerror = (e: Event) => {
      cursorIterationFinishedPromise.reject((e.target) as IDBRequest);
    };
    while (1) {
      const cursor = await cursorIterationFinishedPromise.promise;
      if (!cursor) {
        // ended
        break;
      }
      // recreate deferred promise
      cursorIterationFinishedPromise = defer();

      if (offset) {
        cursor.advance(offset);
        // reset to don't offset next time
        offset = null;
        continue;
      }
      let isInList = false;
      // add .or() function, where .and() by default
      const found = Object.entries(query).every(([field, value]) => {
        if (Array.isArray(value)) {
          isInList = true;
          return value.includes(cursor.value[field]);
        }
        if (typeof value === 'function') {
          isInList = true;
          return value(cursor.value[field]);
        }
        return true;
      });
      if (isInList && !found) {
        cursor.continue();
        continue;
      }
      let nextKey: IDBValidKey = yield cursor.value as T;

      if (limit !== null && !--limit) {
        return;
      }
      cursor.continue(nextKey);
    }
  }

  async autocomplete<T = any>(
    query: Partial<T>,
    keyToMatch: keyof T,
    {
      asc, limit, locales
    }: {
      asc?: boolean, limit?: number, locales?: string[]
    } = {
      asc: true, limit: null, locales: ['en']
    }
  ): Promise<T[]> {

    let matchedRecords: T[] = [];

    const recordsIterator = this.iterate<T>(query);
    while (1) {
      const iterationResult = await recordsIterator.next();
      if (iterationResult.value === undefined) {
        break;
      }
      const sourceValue: any = (iterationResult.value as T)[keyToMatch];
      if (sourceValue === undefined) {
        continue;
      }
      const queryLen = ((query[keyToMatch] as any) as string).length;
      if (!queryLen) {
        // add each record if empty string passed
        matchedRecords.push(iterationResult.value as T);
        continue;
      }
      const queryWords = splitByWords(query[keyToMatch] as any);
      const sourceStr = mergeWords(sourceValue);

      const matched = queryWords.every((queryWord) => {
        for (let sWordCharInd = 0; sWordCharInd < sourceStr.length; sWordCharInd++) {
          const matched = sourceStr.substr(sWordCharInd, queryWord.length).localeCompare(
            queryWord, locales, { sensitivity: 'base' }
          ) === 0;

          if (matched) {
            return true;
          }
        }
      });

      if (matched) {
        matchedRecords.push(iterationResult.value as T);
      }
    }
    matchedRecords.sort(asc || asc === undefined
      ? (a, b) => (a[keyToMatch] as any).length - (b[keyToMatch] as any).length
      : (a, b) => (b[keyToMatch] as any).length - (a[keyToMatch] as any).length
    );
    return limit ? matchedRecords.slice(0, limit) : matchedRecords;
  }

  // TODO: in developing
  async search<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    { asc, limit }: { asc?: boolean, limit: number } = { asc: true, limit: null }
  ): Promise<T[]> {

    const recordsIterator = this.iterate<T>(query);

    const keysToMatch = Object.keys(query).filter((key) => {
      return query[key] instanceof RegExp;
    });
    const matchedRecords: T[] = [];
    while (1) {
      const iterationResult = await recordsIterator.next();
      if (iterationResult.value === undefined) {
        break;
      }
      const matched = keysToMatch.every((keyToMatch) => {
        const recordValue = iterationResult.value[keyToMatch];
        return query[keyToMatch].test(recordValue);
      });
      if (matched) {
        matchedRecords.push(iterationResult.value as T);
      }
    }
    matchedRecords.sort((a, b) => a[keysToMatch[0]].length - b[keysToMatch[0]].length);
    return limit
      ? matchedRecords.slice(0, limit)
      : matchedRecords;
  }

  async getAll<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    {
      offset, limit, sort
    }: {
      offset?: number
      limit?: number
      sort?: SortOptions
    } = {
      offset: null, limit: null, sort: null
    }
  ): Promise<T[]> {

    if (sort) {
      return iterSort<T>(this.iterate<T>(query), sort, offset, limit);
    }
    return genToArr<T>(this.iterate<T>(query, { offset, limit }));
  }

  async aggMap<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    keyField: keyof T,
    fields: (keyof T)[],
    flat: boolean = false
  ): Promise<Record<any, Partial<T>> | Partial<T>> {

    const result: Record<any, Partial<T>> = (await this.getAll<T>(query)).reduce((aggResult: any, record: T) => {
      aggResult[record[keyField]] = fields.reduce((recordResult: Record<any, Partial<T>>, field) => {
        recordResult[field] = record[field] + (aggResult[record[keyField]]?.[field] || 0);
        return recordResult;
      }, {});
      aggResult[record[keyField]][keyField] = record[keyField];
      return aggResult;
    }, {});

    if (flat) {
      return Object.values(result)[0];
    }
    return result;
  }

  async agg<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    key: keyof T,
    fields: (keyof T)[],
    {
      offset, limit, sort
    }: {
      offset?: number
      limit?: number
      sort?: SortOptions
    } = {
      offset: null, limit: null, sort: null
    }
  ): Promise<Partial<T>[]> {

    const records = Object.values(await this.aggMap<T>(query, key, fields));
    if (sort) {
      return sortF(records, sort, offset, limit);
    }
    return (offset || limit) ? records.splice(offset, limit) : records;
  }

  async getCount(index: string, query: IDBValidKey): Promise<number> {
    return idbRequestWrapper<number>(this.getObjectStore().index(index).count(query));
  }

  async get<T = any>(
    query: IDBValidKey | IDBKeyRange | Partial<T>
  ): Promise<T | null> {

    const objectStore = this.getObjectStore();

    const foundRecord = await idbRequestWrapper<FoundRecord<T>>(this.requestMethodSelector(objectStore, query));
    if (!foundRecord) {
      return foundRecord as null;
    }
    return foundRecord as T;
  }

  private getKeyField(): string {
    const FIELDS: EntityFields = Object.getPrototypeOf(this).constructor.FIELDS;

    return Object.keys(FIELDS).filter((field: string) =>
      typeof FIELDS[field] === 'symbol' && (FIELDS[field] as Symbol).description === 'key')[0];
  }

  private getObjectStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    const entity: typeof BaseEntity = Object.getPrototypeOf(this).constructor;

    const storeName = entity.NAME;
    if (!storeName) {
      throw new Error(`The "NAME" property for "${entity.name}" entity wasn't set`);
    }
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  private requestMethodSelector<T = any>(
    storeObject: IDBObjectStore,
    query: IDBValidKey | IDBKeyRange | Partial<T>,
    method: 'get' | 'openCursor' = 'get'
  ): IDBRequest<T> {

    if (typeof query === 'object' && !(query instanceof IDBKeyRange)) {

      const entity = Object.getPrototypeOf(this).constructor;
      const allIndexFields: string[] = getAllIndexFields(entity);
      const passedIndexFields = Object.keys(query).filter((key) => allIndexFields.includes(key));

      if (!passedIndexFields.length) {
        // console.warn(`No one index field found in the query: "${JSON.stringify(query)}" for "${entity.NAME}" entity`);
        // if no one index field found in the query
        return storeObject[method](null);
      }
      const [selectedIndexName, selectedIndexKeyPath] = selectIndex(Object.getPrototypeOf(this).constructor, passedIndexFields);

      const params = selectedIndexKeyPath.length > 1
        ? selectedIndexKeyPath.map((field) => query[field]).filter(value => !Array.isArray(value))
        : (
          Array.isArray(query[selectedIndexKeyPath[0]])
            ? null
            : query[selectedIndexKeyPath[0]]
        );

      return storeObject.index(selectedIndexName)[method](params);
    }
    return storeObject[method](query as IDBValidKey | IDBKeyRange);
  }
}

export const getEntityKeyPath = (entity: typeof BaseEntity): [string[], string] => {
  const keyPath: string[] = [];
  let autoIncrementKey: string = null;

  for (const fieldName in entity.FIELDS) {
    const field = entity.FIELDS[fieldName];

    if (typeof field === 'symbol' && field.description === 'auto') {
      keyPath.push(fieldName);
      autoIncrementKey = fieldName;
      break;

    } else if (typeof field === 'object' && ((field as any).type as Symbol).description === 'key') {
      keyPath.push(fieldName);
    }
  }
  return [keyPath, autoIncrementKey];
};

export const getAllIndexFields = (entity: typeof BaseEntity): any[] => {
  return Array.from((entity.INDEXES || []).reduce((result: Set<string>, indexDesc) => {
    if (typeof indexDesc === 'object') {
      if (Array.isArray(indexDesc.keyPath)) {
        if (!indexDesc.options?.unique) {
          indexDesc.keyPath.forEach((field) => result.add(field));
        }
      } else {
        result.add(indexDesc.keyPath);
      }
    } else {
      result.add(indexDesc);
    }
    return result;
  }, new Set()));
};

export const selectIndex = (entity: typeof BaseEntity, passedIndexFields): [string | null, string[]] => {
  let selectedIndex: [string | null, string[]] = [null, []];

  for (const indexDesc of entity.INDEXES) {
    if (typeof indexDesc === 'object') {
      if (passedIndexFields.length > 1) {
        if (typeof indexDesc.keyPath !== 'string' && passedIndexFields.length === indexDesc.keyPath.length) {
          if (passedIndexFields.every((passedField) => indexDesc.keyPath.includes(passedField))) {
            selectedIndex = [indexDesc.name, indexDesc.keyPath];
          }
        }
        continue;
      }
      if (
        typeof indexDesc.keyPath === 'string'
          ? passedIndexFields[0] === indexDesc.keyPath
          : indexDesc.keyPath.length === 1 && passedIndexFields[0] === indexDesc.keyPath[0]
      ) {
        selectedIndex = [
          indexDesc.name,
          typeof indexDesc.keyPath === 'string' ? [indexDesc.keyPath] : indexDesc.keyPath
        ];
      }
      continue;
    }
    // string value
    selectedIndex = [indexDesc, [indexDesc]];
  }
  return selectedIndex;
};

export const exclude = (values: any[]) => (value: any): boolean => !values.includes(value);
