import { isBlockComment, isIdentifier, isKeyword, isNewline, isPunctuator, isSpaces } from './astNodeTypeUtils';
import { findLastIndex } from './commonUtils';

import type { SpaceToken, Token } from '../@types/types';
import type { Comment } from 'estree';

export type State = 'before' | 'specifier' | 'after';

export interface Specifier {
  after: (SpaceToken | Comment)[];
  before: (SpaceToken | Comment)[];
  hadComma: boolean;
  specifier: Token[];
  state: State;
}

export type SpecifierResult = Pick<Specifier, 'after' | 'before'> & { specifiers: Specifier[] };

const endsWithSpaces = (tokens: Token[]): boolean => {
  const last = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
  return last == null ? false : isSpaces(last as any);
};

const hasNewline = (line: string): boolean => true;

const makeEmptyItem = (): Specifier => ({ after: [], before: [], hadComma: false, specifier: [], state: 'before' });

const handleAfter = (item: Specifier, token: Token, results: SpecifierResult) => {
  switch (token.type) {
    // Only whitespace and comments after a specifier that are on the same
    // belong to the specifier.
    case 'Newline':
      item.after.push(token);
      results.specifiers.push(item);
      item = makeEmptyItem();
      break;

    case 'Line':
    case 'Spaces':
      item.after.push(token);
      break;

    case 'Block':
      // Multiline block comments belong to the next specifier.
      if (hasNewline(token.code)) {
        results.specifiers.push(item);
        item = makeEmptyItem();
        item.before.push(token);
      } else {
        item.after.push(token);
      }
      break;

    // We’ve reached another specifier – time to process that one.
    default:
      results.specifiers.push(item);
      item = makeEmptyItem();
      item.state = 'specifier';
      item.specifier.push(token);
      break;
  }
};

const handleBefore = (item: Specifier, token: Token, results: SpecifierResult) => {
  switch (token.type) {
    case 'Newline':
      item.before.push(token);

      // All whitespace and comments before the first newline or
      // identifier belong to the `{`, not the first specifier.
      if (results.before.length === 0 && results.specifiers.length === 0) {
        results.before = item.before;
        item = makeEmptyItem();
      }
      break;

    case 'Spaces':
    case 'Block':
    case 'Line':
      item.before.push(token);
      break;

    // We’ve reached an identifier.
    default:
      // All whitespace and comments before the first newline or
      // identifier belong to the `{`, not the first specifier.
      if (results.before.length === 0 && results.specifiers.length === 0) {
        results.before = item.before;
        item = makeEmptyItem();
      }

      item.state = 'specifier';
      item.specifier.push(token);
  }
};

const handleSpecifier = (item: Specifier, token: Token, results: SpecifierResult) => {
  switch (token.type) {
    case 'Punctuator':
      // There can only be comma punctuators, but future-proof by checking.
      // istanbul ignore else
      if (isPunctuator(token, ',')) {
        item.hadComma = true;
        item.state = 'after';
      } else {
        item.specifier.push(token);
      }
      break;

    default:
      break;
  }
};

export const getSpecifierItems = (tokens: Token[]) => {
  const results: SpecifierResult = { after: [], before: [], specifiers: [] };
  const item = makeEmptyItem();

  for (const token of tokens) {
    switch (item.state) {
      case 'after':
        handleAfter(item, token, results);
        break;

      case 'before':
        handleBefore(item, token, results);
        break;

      case 'specifier':
        handleSpecifier(item, token, results);
        break;

      default:
        throw new Error(`Unexpected state: ${item.state}`);
    }
  }

  // We’ve reached the end of the tokens. Handle what’s currently in `item`.
  switch (item.state) {
    case 'after':
      if (endsWithSpaces(item.after as Token[])) results.after = [item.after.pop()];

      results.specifiers.push(item);
      break;

    case 'before':
      // If the last specifier has a trailing comma and some of the remaining
      // whitespace and comments are on the same line we end up here. If so we
      // want to put that whitespace and comments in `result.after`.
      results.after = item.before;
      break;

    // If the last specifier has no trailing comma we end up here. Move all
    // trailing comments and whitespace from `.specifier` to `.after`, and
    // comments and whitespace that don’t belong to the specifier to
    // `result.after`. The last non-comment and non-whitespace token is usually
    // an identifier, but in this case it’s a keyword:
    //
    //    export { z, d as default } from "a"
    case 'specifier':
      const lastIdentifierIndex = findLastIndex(item.specifier, token2 => isIdentifier(token2 as any) || isKeyword(token2 as any));

      const specifier = item.specifier.slice(0, lastIdentifierIndex + 1);
      const after = item.specifier.slice(lastIdentifierIndex + 1);

      // If there’s a newline, put everything up to and including (hence the `+
      // 1`) that newline in the specifiers’s `.after`.
      const newlineIndexRaw = after.findIndex(token2 => isNewline(token2 as any));
      const newlineIndex = newlineIndexRaw === -1 ? -1 : newlineIndexRaw + 1;

      // If there’s a multiline block comment, put everything _befor_ that
      // comment in the specifiers’s `.after`.
      const multilineBlockCommentIndex = after.findIndex(token2 => isBlockComment(token2) && hasNewline(token2.code));

      const sliceIndex =
        // If both a newline and a multiline block comment exists, choose the
        // earlier one.
        newlineIndex >= 0 && multilineBlockCommentIndex >= 0
          ? Math.min(newlineIndex, multilineBlockCommentIndex)
          : newlineIndex >= 0
          ? newlineIndex
          : multilineBlockCommentIndex >= 0
          ? multilineBlockCommentIndex
          : // If there are no newlines, move the last whitespace into `result.after`.
          endsWithSpaces(after)
          ? after.length - 1
          : -1;

      item.specifier = specifier;
      item.after = sliceIndex === -1 ? after : after.slice(0, sliceIndex);
      results.specifiers.push(item);
      results.after = sliceIndex === -1 ? [] : after.slice(sliceIndex);

      break;

    default:
      throw new Error(`Unknown state: ${item.state}`);
  }

  return results;
};

export const sortSpecifierItems = () => {};
