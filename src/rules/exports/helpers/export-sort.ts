const NOT_MATCHED = ['^'];
const TYPES = [['^\\.'], ['^.+\\u0000$']];

export function sort(items: RegExp[]) {
  const groups = [NOT_MATCHED, ...TYPES];

  const outerGroups = groups.map(groups => groups.map(item => RegExp(item, 'u')));
  const itemGroups = outerGroups.map(groups => groups.map(regex => ({ regex, items: [] })));
  const rest = [];

  for (const item of items) {
    const { originalSource } = item.source;

    const source = item.isSideEffectImport ? `\0${originalSource}` : item.source.kind !== 'value' ? `${originalSource}\0` : originalSource;
  }
}
