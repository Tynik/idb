export type Key =  {
  auto: Symbol
};
export type String = Symbol;
export type Number = Symbol;
export type DateTime = Symbol;

export type FieldType = Key | String | Number | DateTime;

export type ForeignEntityName = string;

export type EntityFields = Record<string, FieldType | ForeignEntityName>;

export type ExtractFields<T> = { [K in keyof T]: any };

export type Indexes = ({ name: string, keyPath: string | string[], options?: IDBIndexParameters } | string)[]

export type FoundRecord<T> = T | null;
