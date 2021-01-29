import {
  Key,
  String,
  Number,
  DateTime
} from './types';

export const FIELD_TYPE = {
  get KEY (): Key {
    const r = {
      auto: Symbol('auto'),
    }
    Object.defineProperty(r, 'type', {
      value: Symbol('key')
    });
    return r
  },
  get FOREIGN_KEY (): Record<string, string> {
    return new Proxy({}, {
      get(target: any, entityName: PropertyKey): string {
        return entityName as string
      }
    })
  },
  get STRING (): String {
    return Symbol('string')
  },
  get NUMBER (): Number {
    return Symbol('number')
  },
  get DATETIME (): DateTime {
    return Symbol('datetime')
  }
}
