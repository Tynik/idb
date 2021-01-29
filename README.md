## Frontend storage (IndexedDB)

TBD

### How to use

#### Init store

```typescript
import { Store } from 'idb'
import * as entity from './entity'

const shopStore = new Store('shop', 1, {
  user: entity.UserEntity,
  product: entity.ProductEntity
});
shopStore.init();

export const store = shopStore;
```

#### Entities

```typescript
// ./entity/index.ts

export * from './User'
export * from './Product'
```

*User*

```typescript
// ./entity/User.ts

export class UserEntity extends BaseEntity {
  static NAME = 'user'

  static FIELDS = {
    id: FIELD_TYPE.KEY,
    name: FIELD_TYPE.STRING,
    password: FIELD_TYPE.STRING
  }
}
```

*Product*

```typescript
// ./entity/Product.ts

export class ProductEntity extends BaseEntity {
  static NAME = 'product'

  static INDEXES = [
    { name: 'userId', keyPath: 'userId' },
    { name: 'userId-name', keyPath: ['userId', 'name'], props: { unique: true } },
  ];

  static FIELDS = {
    id: FIELD_TYPE.KEY.auto,
    userId: FIELD_TYPE.FOREIGN_KEY.UserEntity,
    name: FIELD_TYPE.STRING,
    link: FIELD_TYPE.STRING,
    dateAdded: FIELD_TYPE.DATETIME
  }
}
```