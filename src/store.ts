import { defer } from './utils';
import { Deferred } from './types';
import { BaseEntity, getEntityKeyPath } from './entity';

export class Store {
  private readonly name: string;
  private readonly version: number;
  private readonly entities: typeof BaseEntity[];
  private readonly db: IDBFactory;
  private readonly transaction: IDBTransaction;
  private readonly keyRange: IDBKeyRange;
  private isConnected: Deferred;
  private onUpgradeCallback: (db: IDBDatabase, oldVersion: number, newVersion: number) => void;

  constructor(name: string, version: number, entities: typeof BaseEntity[]) {
    this.name = name;
    this.version = version;
    this.entities = entities;
    this.db = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    this.transaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    this.keyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    this.init();

    // Object.entries(entities).forEach(([entityName, entity]) => {
    //   Object.entries(entity.FIELDS).forEach(([fieldName, field]) => {
    //     if (typeof field === 'symbol') {
    //       // next if Symbol instance
    //       return;
    //     }
    //     const relatedEntity = field as typeof BaseEntity;
    //
    //     const keyFieldName = Object.keys(relatedEntity.FIELDS).filter((fieldName: string) => {
    //       return typeof relatedEntity.FIELDS[fieldName] === 'symbol'
    //         && (relatedEntity.FIELDS[fieldName] as Symbol).description === 'key'
    //     })[0];
    //     if (!keyFieldName) {
    //       throw new Error('Key field was not declared')
    //     }
    //     console.log(`${entityName}.${fieldName}`, `${(field as any).name}.${keyFieldName}`)
    //   });
    // });
  }

  init() {
    const request = this.db.open(this.name, this.version);
    request.onerror = (e) => {
      console.error(e.target);
    };

    this.isConnected = defer();
    request.onsuccess = (e) => {
      this.isConnected.resolve((e.target as IDBOpenDBRequest).result);
    };
    request.onblocked = (e) => {
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (e.newVersion === 1) {
        this.entities.forEach((entity) => {
          const [keyPath, autoIncrementKey] = getEntityKeyPath(entity);

          console.info(`Create entity "${entity.NAME}"`)

          const objectStore = db.createObjectStore(entity.NAME, {
            keyPath: autoIncrementKey || (keyPath.length > 1 ? keyPath : keyPath[0]),
            autoIncrement: Boolean(autoIncrementKey)
          });
          // create indexes
          entity.INDEXES.forEach((indexDesc) => {
            if (typeof indexDesc === 'object') {
              console.info(`Create index "${indexDesc.name}" for entity "${entity.NAME}"`);

              objectStore.createIndex(indexDesc.name, indexDesc.keyPath, indexDesc.options);
            } else {
              console.info(`Create index "${indexDesc}" for entity "${entity.NAME}"`);

              objectStore.createIndex(indexDesc, indexDesc, { unique: false });
            }
          });
        });
      }
      if (this.onUpgradeCallback) {
        this.onUpgradeCallback(db, e.oldVersion, e.newVersion);
      }
    };
  }

  onUpgrade(callback: (db: IDBDatabase, oldVersion: number, newVersion: number) => void) {
    this.onUpgradeCallback = callback;
  }

  async get<T extends BaseEntity>(entityName: string): Promise<T> {
    const db: IDBDatabase = await this.isConnected.promise;
    const entity: new (db: IDBDatabase) => any = this.entities.find((entity) => entity.NAME === entityName);
    return new entity(db);
  }
}
