import type { AST } from 'eslint';
import type { Comment } from 'estree';

export type Node = AST.Token | Comment | { type: 'Spaces' } | { type: 'Newline' };

export function isIdentifier(node: Node) {
  return node.type === 'Identifier';
}

export function isKeyword(node: Node) {
  return node.type === 'Keyword';
}

export function isPunctuator(node: Node, value: string) {
  return node.type === 'Punctuator' && node.value === value;
}

export function isBlockComment(node: Node) {
  return node.type === 'Block';
}

export function isLineComment(node: Node) {
  return node.type === 'Line';
}

export function isSpaces(node: Node) {
  return node.type === 'Spaces';
}

export function isNewline(node: Node) {
  return node.type === 'Newline';
}
