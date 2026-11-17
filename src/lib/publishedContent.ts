export interface PublishedItem<T> {
  id: string;
  slug: string;
  title: string;
  data: T;
}

export async function getPublishedContent<T>(type: string): Promise<PublishedItem<T>[]> {
  const response = await fetch(`/api/content?type=${encodeURIComponent(type)}`);
  if (!response.ok) throw new Error('Published content unavailable');
  const result = await response.json() as { items: PublishedItem<T>[] };
  return result.items;
}
