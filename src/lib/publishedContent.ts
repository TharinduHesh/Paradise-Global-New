import { useEffect, useState } from 'react';

export interface PublishedItem<T> {
  id: string;
  slug: string;
  title: string;
  data: T;
}

export interface PublishedCollection<T> {
  items: PublishedItem<T>[];
  /** True once admins manage this type in the catalogue; the built-in list must then not be shown. */
  managed: boolean;
}

export async function getPublishedCollection<T>(type: string): Promise<PublishedCollection<T>> {
  const response = await fetch(`/api/content?type=${encodeURIComponent(type)}`);
  if (!response.ok) throw new Error('Published content unavailable');
  const result = await response.json() as { items: PublishedItem<T>[]; managed?: boolean };
  return { items: result.items, managed: Boolean(result.managed) };
}

export async function getPublishedContent<T>(type: string): Promise<PublishedItem<T>[]> {
  return (await getPublishedCollection<T>(type)).items;
}

/**
 * Returns the built-in list until the catalogue responds, then the published catalogue records
 * (mapped with `toItem`). Falls back to the built-in list if the catalogue is unavailable or not yet managed and empty.
 */
export function usePublishedList<T, R = T>(type: string, fallback: R[], toItem: (item: PublishedItem<T>, index: number) => R): R[] {
  const [list, setList] = useState<R[]>(fallback);
  useEffect(() => {
    let active = true;
    getPublishedCollection<T>(type)
      .then(({ items, managed }) => { if (active && (items.length || managed)) setList(items.map(toItem)); })
      .catch(() => undefined);
    return () => { active = false; };
    // toItem is intentionally excluded: callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  return list;
}
