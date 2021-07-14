import FakeDB from './indexedDB';
import { BaseEntity, getAllIndexFields, selectIndex } from '../entity';
import { genToArr } from '../utils';
import { FIELD_TYPE } from '../constants';
import { ExtractFields } from '../types';

class TestEntity extends BaseEntity {
  static NAME = 'test';

  static FIELDS = {
    userId: FIELD_TYPE.KEY,
    name: FIELD_TYPE.STRING
  };
}

type Test = ExtractFields<typeof TestEntity.FIELDS>;

describe('Test BaseEntity', () => {
  let fakeDB: FakeDB;
  let entity: TestEntity;

  beforeEach(() => {
    fakeDB = new FakeDB();
    entity = new TestEntity(fakeDB.db);
  });

  it('should iterate over records using cursor', async () => {
    const testStore = [{ name: 'Alex' }, { name: 'Soul' }];
    fakeDB.setCursorResults = { test: testStore };

    expect(await genToArr(entity.iterate({}))).toStrictEqual(testStore);
  });

  it('search should return empty array if there is not records found', async () => {
    fakeDB.setCursorResults = { test: [] };

    expect(await entity.search({})).toStrictEqual([]);
  });

  it('autocomplete should return all ordered results by default if empty string passed', async () => {
    const testStore = [
      { userId: 1, name: 'Alexsander' },
      { userId: 2, name: 'Samuel' },
      { userId: 3, name: 'Sam' }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.autocomplete<Test>(
      { name: '' }, 'name')
    )
      .toStrictEqual([
        { userId: 3, name: 'Sam' },
        { userId: 2, name: 'Samuel' },
        { userId: 1, name: 'Alexsander' }
      ]);
  });

  it('autocomplete should return ordered results by ascending length by default', async () => {
    const testStore = [
      { userId: 1, name: 'Alexsander' },
      { userId: 2, name: 'Samuel' },
      { userId: 3, name: 'Sam' },
      { userId: 4, name: 'Mike' },
      { userId: 5, name: 'Kristine' }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 's' }, 'name')
    )
      .toStrictEqual([
        { userId: 3, name: 'Sam' },
        { userId: 2, name: 'Samuel' },
        { userId: 5, name: 'Kristine' },
        { userId: 1, name: 'Alexsander' }
      ]);

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 'sa' }, 'name')
    )
      .toStrictEqual([
        { userId: 3, name: 'Sam' },
        { userId: 2, name: 'Samuel' },
        { userId: 1, name: 'Alexsander' }
      ]);

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 'sam' }, 'name')
    )
      .toStrictEqual([
        { userId: 3, name: 'Sam' },
        { userId: 2, name: 'Samuel' }
      ]);

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 'samanta' }, 'name')
    )
      .toStrictEqual([]);
  });

  it('autocomplete should return ordered results by descending length', async () => {
    const testStore = [
      { userId: 1, name: 'Alexsander' },
      { userId: 2, name: 'Samuel' },
      { userId: 3, name: 'Sam' },
      { userId: 4, name: 'Mike' },
      { userId: 5, name: 'Kristine' }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 's' }, 'name', { asc: false })
    )
      .toStrictEqual([
        { userId: 1, name: 'Alexsander' },
        { userId: 5, name: 'Kristine' },
        { userId: 2, name: 'Samuel' },
        { userId: 3, name: 'Sam' }
      ]);
  });

  it('autocomplete should lookup and return by multi-words', async () => {
    const testStore = [
      { userId: 1, name: 'Alexsander Kirienko Vasiliyovich' },
      { userId: 2, name: 'Samuel Tir' },
      { userId: 3, name: 'Girenko Sam' },
      { userId: 4, name: 'Mike Jenkins' },
      { userId: 5, name: 'Timrova Kristine' }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.autocomplete<Test>(
      { userId: 1, name: 'vas kir' }, 'name')
    )
      .toStrictEqual([
        { userId: 1, name: 'Alexsander Kirienko Vasiliyovich' }
      ]);
  });

  it('should sort by asc', async () => {
    const testStore = [
      { price: 1 },
      { price: 3 },
      { price: 2 },
      { price: 5 },
      { price: 4 }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.getAll<Test>(
      {}, { sort: [['price', true]] })
    )
      .toStrictEqual([
        { price: 1 },
        { price: 2 },
        { price: 3 },
        { price: 4 },
        { price: 5 }
      ]);
  });

  it('should sort by desc', async () => {
    const testStore = [
      { price: 1 },
      { price: 3 },
      { price: 2 },
      { price: 5 },
      { price: 4 }
    ];
    fakeDB.setCursorResults = { test: testStore };

    expect(await entity.getAll<Test>(
      {}, { sort: [['price', false]] })
    )
      .toStrictEqual([
        { price: 5 },
        { price: 4 },
        { price: 3 },
        { price: 2 },
        { price: 1 }
      ]);
  });

  it('should sort by multi fields', async () => {
    const testStore = [
      { category: 2, price: 1 },
      { category: 2, price: 3 },
      { category: 1, price: 2 },
      { category: 4, price: 5 },
      { category: 4, price: 6 },
      { category: 3, price: 4 },
      { category: 4, price: 4 }
    ];
    fakeDB.setCursorResults = { test: testStore };
    // asc
    expect(await entity.getAll<Test>(
      {}, { sort: [['category', true], ['price', true]] })
    )
      .toStrictEqual([
        { category: 1, price: 2 },
        { category: 2, price: 1 },
        { category: 2, price: 3 },
        { category: 3, price: 4 },
        { category: 4, price: 4 },
        { category: 4, price: 5 },
        { category: 4, price: 6 }
      ]);

    // asc + desc
    expect(await entity.getAll<Test>(
      {}, { sort: [['category', true], ['price', false]] })
    )
      .toStrictEqual([
        { category: 1, price: 2 },
        { category: 2, price: 3 },
        { category: 2, price: 1 },
        { category: 3, price: 4 },
        { category: 4, price: 6 },
        { category: 4, price: 5 },
        { category: 4, price: 4 }
      ]);

    // desc
    expect(await entity.getAll<Test>(
      {}, { sort: [['category', false], ['price', false]] })
    )
      .toStrictEqual([
        { category: 4, price: 6 },
        { category: 4, price: 5 },
        { category: 4, price: 4 },
        { category: 3, price: 4 },
        { category: 2, price: 3 },
        { category: 2, price: 1 },
        { category: 1, price: 2 }
      ]);
  });
});

describe('Test extractIndexFields', () => {
  it('should 1', () => {
    // extractIndexFields();
  });
});

describe('Test selectIndexName()', () => {
  it('should select index', () => {
    const entity = {
      INDEXES: [
        { name: 'userId-Idx', keyPath: 'userId', options: { unique: false } },
        { name: 'userIdPhone-Idx', keyPath: ['userId', 'phone'], options: { unique: true } }
      ]
    };
    expect(selectIndex(entity as any, ['userId'])).toStrictEqual(['userId-Idx', ['userId']]);
    expect(selectIndex(entity as any, [])).toStrictEqual([null, []]);
  });
});

describe('Test getAllIndexFields()', () => {
  it('should get only one field indexes with unique criteria', () => {
    const entity = {
      INDEXES: [
        { name: 'userId-Idx', keyPath: 'userId' },
        { name: 'userId-Idx', keyPath: 'email', options: { unique: true } },
        { name: 'userIdPhone-Idx', keyPath: ['userId', 'phone'], options: { unique: true } }
      ]
    };
    expect(getAllIndexFields(entity as any)).toStrictEqual(['userId', 'email']);
  });
});
