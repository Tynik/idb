type StoreName = string;
type CursorResults = any[];
type StoresCursorResults = Record<StoreName, CursorResults>;

class IDBKeyRange {

}

// @ts-ignore
window.IDBKeyRange = IDBKeyRange;

const requestAPI = (
  results: any[],
  resultHandler = (result: any, advance: (offset: number) => void, next: (key?: IDBValidKey) => void) => result
): IDBRequest => {
  const request = {
    onsuccess(this: IDBRequest<T>, ev: Event): any { },
    onerror(this: IDBRequest<T>, ev: Event): any { }
  };
  (function triggerSuccessEvent(leftResults) {
    setTimeout(() => {

      const result = leftResults ? resultHandler(
        results[results.length - leftResults],
        (offset) => triggerSuccessEvent(leftResults - offset),
        triggerSuccessEvent.bind(null, --leftResults)
      ) : null;

      const e = new Event('request');
      Object.defineProperty(e, 'target', {
        writable: false,
        value: {
          result: result
        }
      });
      request.onsuccess.call(request, e);
    }, 0);
  })(results.length);

  return request as IDBRequest;
};

const cursorAPI = (value, _advance: (count: number) => void, _continue: (key?: IDBValidKey) => void) => ({
    value,
    continue: _continue,
    advance: _advance
  } as IDBCursorWithValue
);

class FakeDB {
  private cursorResults: StoresCursorResults;

  constructor() {
    this.cursorResults = {};
  }

  getIndexAPI(storeName: StoreName) {
    const self = this;
    return {
      openCursor(query?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null> {
        return requestAPI(self.cursorResults[storeName] || [], cursorAPI);
      }
    } as IDBIndex;
  }

  getTransactionAPI() {
    const self = this;
    return {
      objectStore(storeName: StoreName): IDBObjectStore {
        return {
          openCursor(query?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null> {
            return requestAPI(self.cursorResults[storeName] || [], cursorAPI);
          },
          index(indexName: string): IDBIndex {
            return self.getIndexAPI(storeName);
          }
        } as IDBObjectStore;
      }
    } as IDBTransaction;
  }

  get db() {
    const self = this;
    return {
      transaction(storeNames: StoreName | Iterable<StoreName>, mode?: IDBTransactionMode): IDBTransaction {
        return self.getTransactionAPI();
      }
    } as IDBDatabase;
  }

  set setCursorResults(cursorResults: StoresCursorResults) {
    this.cursorResults = cursorResults;
  }
}

export default FakeDB;
