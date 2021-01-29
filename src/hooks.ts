import * as React from 'react';

import { Store } from './store';
import { BaseEntity } from './entity';

export const useAsyncEffect = (effect: () => Promise<void>, deps: React.DependencyList = []) => {
  React.useEffect(() => {
    (async () => {
      await effect();
    })();
  }, deps);
}

export const useEntity = <T extends BaseEntity>(store: Store, entityName: string): T => {
  const entityRef = React.useRef<T>(null);

  useAsyncEffect(async () => {
    entityRef.current = await store.get<T>(entityName);
  }, []);

  return entityRef.current
}
