export function findLastIndex<T>(array: T[], fn: (value: T, index: number, arr: T[]) => boolean): number {
  for (let index = array.length - 1; index >= 0; index--) {
    if (fn(array[index], index, array)) return index;
  }

  return -1;
}

export function flatMap<T, U>(array: T[], fn: (item: T) => U[]): U[] {
  return ([] as U[]).concat(...array.map(fn));
}
