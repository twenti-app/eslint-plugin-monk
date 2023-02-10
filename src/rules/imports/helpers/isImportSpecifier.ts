import type { Node } from '../../../@types/Plugin.types';

export function isImportSpecifier({ type }: Node) {
  return type === 'ImportSpecifier';
}
