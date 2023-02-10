import type { Node } from '../../../@types/Plugin.types';

export function isImport({ type }: Node) {
  return type === 'ImportDeclaration';
}
