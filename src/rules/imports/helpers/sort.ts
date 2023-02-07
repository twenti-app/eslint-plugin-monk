import type { SortBy } from '../../../@types/Metadata.types';

export function sort(items: string[], groups: string[][], sortBy: SortBy) {
  const itemGroups = groups.map(groups => groups.map(regex => ({ regex, items: [] })));
  const rest = [];
}
