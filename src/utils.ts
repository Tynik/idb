import { Deferred, SortOptions } from './types';

export const idbRequestWrapper = async <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e: Event) => {
      resolve(((e.target) as IDBRequest<T>).result);
    };
    request.onerror = (e: Event) => {
      reject((e.target) as IDBRequest<T>);
    };
  });
};

export const defer = <S = any, E = any>(): Deferred<S, E> => {
  const deferred: Deferred<S, E> = { promise: null, resolve: null, reject: null };
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

export const genToArr = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
  const r: T[] = [];
  for await (const x of generator) {
    r.push(x);
  }
  return r;
};

export const mergeWords = (str: string): string => {
  return str.split(' ').join('');
};

export const splitByWords = (str: string): string[] => {
  return str.split(' ').filter((word) => word);
};

export const sortComparator = <T = any>(sortedItems: T[], sortOptions: SortOptions, record: T) => {
  let inserted = false;

  start:
    if (sortedItems.length) {
      for (let sortedItemIdx = 0; sortedItemIdx < sortedItems.length; sortedItemIdx++) {
        // through sort all fields
        for (let sortFieldIdx = 0; sortFieldIdx < sortOptions.length; sortFieldIdx++) {
          const [sortField, sortByAsc = true] = sortOptions[sortFieldIdx];

          const diff = sortedItems[sortedItemIdx][sortField] - record[sortField];
          // if items are different or the same, but only if sorting by last sort field
          if (diff || (!diff && sortFieldIdx === sortOptions.length - 1)) {
            if (sortByAsc ? diff >= 0 : diff <= 0) {
              inserted = true;
              sortedItems.splice(sortedItemIdx, 0, record);
              break start;
            }
            break;
          }
        }
      }
    }

  if (!inserted) {
    sortedItems.push(record);
  }
}

export const sort = <T = any>(
  records: T[],
  sortOptions: SortOptions,
  offset: number = null,
  limit: number = null
): any[] => {

  const sortedItems = [];
  records.forEach(sortComparator.bind(null, sortedItems, sortOptions));

  return (offset || limit) ? sortedItems.splice(offset, limit) : sortedItems;
}

export const iterSort = async <T, TNext = any>(
  iter: AsyncGenerator<T, void, TNext>,
  sortOptions: SortOptions,
  offset: number = null,
  limit: number = null
): Promise<T[]> => {

  const sortedItems = [];
  for await (const record of iter) {
    sortComparator(sortedItems, sortOptions, record);
  }
  return (offset || limit) ? sortedItems.splice(offset, limit) : sortedItems;
};
