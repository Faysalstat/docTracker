import 'server-only';
import type { ApiList, Paginated } from '@/types/api';

/** Turns the UI's page number into the API's offset/limit query. */
export function toOffsetQuery<T extends { page: number; limit: number }>({
  page,
  limit,
  ...rest
}: T) {
  return { ...rest, offset: (page - 1) * limit, limit };
}

/** Builds the page metadata the pagination component needs from the API's total. */
export function toPaginated<T>(list: ApiList<T>, page: number, limit: number): Paginated<T> {
  return {
    data: list.data,
    meta: {
      page,
      limit,
      total: list.length,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
    },
  };
}
