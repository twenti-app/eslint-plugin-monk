import type { Token } from '../@types/types';

export function isIdentifier(node: Token) {
  return node.type === 'Identifier';
}

export function isKeyword(node: Token) {
  return node.type === 'Keyword';
}

export function isPunctuator(node: Token, value: string) {
  return node.type === 'Punctuator' && node.value === value;
}

export function isBlockComment(node: Token) {
  return node.type === 'Block';
}

export function isLineComment(node: Token) {
  return node.type === 'Line';
}

export function isSpaces(node: Token) {
  return node.type === 'Spaces';
}

export function isNewline(node: Token) {
  return node.type === 'Newline';
}
