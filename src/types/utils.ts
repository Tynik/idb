export interface Deferred<S = any, E = any> {
  promise: Promise<S>
  resolve: (value: S) => void
  reject: (reason?: E) => void
}
