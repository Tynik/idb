import FakeDB from './indexedDB';
import { BaseEntity, getAllIndexFields, selectIndex } from '../entity';
import { generatorToArray } from '../utils';
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

    expect(await generatorToArray(entity.iterate({}))).toStrictEqual(testStore);
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
  it('should get only non unique indexes', () => {
    const entity = {
      INDEXES: [
        { name: 'userId-Idx', keyPath: 'userId', options: { unique: false } },
        { name: 'userIdPhone-Idx', keyPath: ['userId', 'phone'], options: { unique: true } }
      ]
    };
    expect(getAllIndexFields(entity as any)).toStrictEqual(['userId']);
  });
});
