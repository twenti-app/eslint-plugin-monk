import type { SourceCode } from 'eslint';

const NEWLINE = /(\r?\n)/;

export function hasNewline(string: string) {
  return NEWLINE.test(string);
}

export function guessNewline({ text }: SourceCode) {
  const match = NEWLINE.exec(text);

  return match === null ? '\n' : match[0];
}
