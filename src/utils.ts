import { Deferred } from './types';

export const idbRequestWrapper = async <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e: Event) => {
      resolve(((e.target) as IDBRequest<T>).result);
    }
    request.onerror = (e: Event) => {
      reject((e.target) as IDBRequest<T>);
    }
  })
}

export const defer = <S = any, E = any>(): Deferred<S, E> => {
  const deferred: Deferred<S, E> = { promise: null, resolve: null, reject: null };
  deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject  = reject;
  });
  return deferred;
}

export const generatorToArray = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
    const r: T[] = []
    for await (const x of generator) {
      r.push(x)
    }
    return r
}
