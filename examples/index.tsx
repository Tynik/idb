import { Store, BaseEntity, FIELD_TYPE } from '../src';

class TestEntity extends BaseEntity {
  static FIELDS = {
    userId: FIELD_TYPE.KEY,
    name: FIELD_TYPE.STRING
  }
}

const testStore = new Store('test', 1, [
]);
testStore.onUpgrade((db, oldVersion, newVersion, transaction) => {
  console.log('onUpgrade', oldVersion, newVersion);
});
testStore.init();
