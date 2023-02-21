import type { AST, SourceCode } from 'eslint';
import type { Comment, Node, Program, ImportDeclaration, ExportAllDeclaration } from 'estree';
import type { Rule } from 'eslint';

export type Chunk = Node[];
export type ChunkSource = 'PartOfChunk' | 'PartOfNewChunk' | 'NotPartOfChunk';
export type SortBy = 'name' | 'path';
export type SpaceType = 'Newline' | 'Spaces';

export type WhiteToken = { type: SpaceType; code: string };

export type AllPossibleTokens = AST.Token | Comment | WhiteToken;

export type isSideEffectImport = (node: Node, sourceCode: SourceCode) => boolean;
export type getSpecifiers = (node: Node) => Chunk;

export interface ImportDeclarationWithKind extends ImportDeclaration {
  importKind?: 'type' | 'typeof' | 'value';
}

export interface ExportAllDeclarationWithKind extends ExportAllDeclaration {
  exportKind?: 'type' | 'value';
}

export interface Options {
  groups: string[][];
  sortBy: 'import' | 'path';
}

export interface RuleContext extends Rule.RuleContext {
  options: Options[];
}

const NEWLINE = /(\r?\n)/;

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

const compare = (a: string, b: string): number => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);

const flatMap = <T, U>(array: T[], fn: (item: T, index: number) => U[]): U[] => ([] as U[]).concat(...array.map(fn));

// Returns `sourceCode.getTokens(node)` plus whitespace and comments. All tokens
// have a `code` property with `sourceCode.getText(token)`.
function getAllTokens(node: Node, sourceCode: SourceCode): AllPossibleTokens[] {
  const tokens = sourceCode.getTokens(node);
  const lastTokenIndex = tokens.length - 1;

  return flatMap(tokens, (token, tokenIndex) => {
    const newToken = { ...token, code: sourceCode.getText(token as unknown as Node) };

    if (tokenIndex === lastTokenIndex) return [newToken];

    const comments = sourceCode.getCommentsAfter(token);
    const last = comments.length > 0 ? comments[comments.length - 1] : token;
    const nextToken = tokens[tokenIndex + 1];

    return [
      newToken,
      ...flatMap(comments, (comment, commentIndex) => {
        const previous = commentIndex === 0 ? token : comments[commentIndex - 1];
        return [
          ...parseWhitespace(sourceCode.text.slice(previous.range![1], comment.range![0])),
          { ...comment, code: sourceCode.getText(comment as unknown as Node) }
        ];
      }),
      ...parseWhitespace(sourceCode.text.slice(last.range![1], nextToken.range[0]))
    ];
  });
}

const getImportExportKind = (node: ImportDeclarationWithKind | ExportAllDeclarationWithKind) => {
  // `type` and `typeof` imports, as well as `type` exports (there are no
  // `typeof` exports). In Flow, import specifiers can also have a kind. Default
  // to "value" (like TypeScript) to make regular imports/exports come after the
  // type imports/exports.
  if ('importKind' in node) return node.importKind;

  if ('exportKind' in node) return node.exportKind;

  return 'value';
};

const getIndentation = (node: Node, sourceCode: SourceCode): string => {
  const tokenBefore = sourceCode.getTokenBefore(node, { includeComments: true });

  if (tokenBefore == null) {
    const text = sourceCode.text.slice(0, node.range?.[0]);
    const lines = text.split(NEWLINE);

    return lines[lines.length - 1];
  }

  const text = sourceCode.text.slice(tokenBefore.range![1], node.range![0]);
  const lines = text.split(NEWLINE);

  return lines.length > 1 ? lines[lines.length - 1] : '';
};

// Turns a list of tokens between the `{` and `}` of an import/export specifiers
// list into an object with the following properties:
//
// - before: Array of tokens – whitespace and comments after the `{` that do not
//   belong to any specifier.
// - after: Array of tokens – whitespace and comments before the `}` that do not
//   belong to any specifier.
// - items: Array of specifier items.
//
// Each specifier item looks like this:
//
// - before: Array of tokens – whitespace and comments before the specifier.
// - after: Array of tokens – whitespace and comments after the specifier.
// - specifier: Array of tokens – identifiers, whitespace and comments of the
//   specifier.
// - hadComma: A Boolean representing if the specifier had a comma originally.
//
// We have to do carefully preserve all original whitespace this way in order to
// be compatible with other stylistic ESLint rules.
function getSpecifierItems(tokens: AllPossibleTokens[]) {
  const result = { after: [], before: [], items: [] };
  let current = makeEmptyItem();

  for (const token of tokens) {
    switch (current.state) {
      case 'before':
        switch (token.type) {
          case 'Newline':
            current.before.push(token);

            // All whitespace and comments before the first newline or
            // identifier belong to the `{`, not the first specifier.
            if (result.before.length === 0 && result.items.length === 0) {
              result.before = current.before;
              current = makeEmptyItem();
            }
            break;

          case 'Spaces':
          case 'Block':
          case 'Line':
            current.before.push(token);
            break;

          // We’ve reached an identifier.
          default:
            // All whitespace and comments before the first newline or
            // identifier belong to the `{`, not the first specifier.
            if (result.before.length === 0 && result.items.length === 0) {
              result.before = current.before;
              current = makeEmptyItem();
            }

            current.state = 'specifier';
            current.specifier.push(token);
        }
        break;

      case 'specifier':
        switch (token.type) {
          case 'Punctuator':
            // There can only be comma punctuators, but future-proof by checking.
            // istanbul ignore else
            if (isPunctuator(token, ',')) {
              current.hadComma = true;
              current.state = 'after';
            } else {
              current.specifier.push(token);
            }
            break;

          // When consuming the specifier part, we eat every token until a comma
          // or to the end, basically.
          default:
            current.specifier.push(token);
        }
        break;

      case 'after':
        switch (token.type) {
          // Only whitespace and comments after a specifier that are on the same
          // belong to the specifier.
          case 'Newline':
            current.after.push(token);
            result.items.push(current);
            current = makeEmptyItem();
            break;

          case 'Spaces':
          case 'Line':
            current.after.push(token);
            break;

          case 'Block':
            // Multiline block comments belong to the next specifier.
            if (hasNewline(token.code)) {
              result.items.push(current);
              current = makeEmptyItem();
              current.before.push(token);
            } else {
              current.after.push(token);
            }
            break;

          // We’ve reached another specifier – time to process that one.
          default:
            result.items.push(current);
            current = makeEmptyItem();
            current.state = 'specifier';
            current.specifier.push(token);
        }
        break;

      // istanbul ignore next
      default:
        throw new Error(`Unknown state: ${current.state}`);
    }
  }

  // We’ve reached the end of the tokens. Handle what’s currently in `current`.
  switch (current.state) {
    // If the last specifier has a trailing comma and some of the remaining
    // whitespace and comments are on the same line we end up here. If so we
    // want to put that whitespace and comments in `result.after`.
    case 'before':
      result.after = current.before;
      break;

    // If the last specifier has no trailing comma we end up here. Move all
    // trailing comments and whitespace from `.specifier` to `.after`, and
    // comments and whitespace that don’t belong to the specifier to
    // `result.after`. The last non-comment and non-whitespace token is usually
    // an identifier, but in this case it’s a keyword:
    //
    //    export { z, d as default } from "a"
    case 'specifier': {
      const lastIdentifierIndex = findLastIndex(current.specifier, token2 => isIdentifier(token2) || isKeyword(token2));

      const specifier = current.specifier.slice(0, lastIdentifierIndex + 1);
      const after = current.specifier.slice(lastIdentifierIndex + 1);

      // If there’s a newline, put everything up to and including (hence the `+
      // 1`) that newline in the specifiers’s `.after`.
      const newlineIndexRaw = after.findIndex(token2 => isNewline(token2));
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

      current.specifier = specifier;
      current.after = sliceIndex === -1 ? after : after.slice(0, sliceIndex);
      result.items.push(current);
      result.after = sliceIndex === -1 ? [] : after.slice(sliceIndex);

      break;
    }

    // If the last specifier has a trailing comma and all remaining whitespace
    // and comments are on the same line we end up here. If so we want to move
    // the final whitespace to `result.after`.
    case 'after':
      if (endsWithSpaces(current.after)) {
        const last = current.after.pop();
        result.after = [last];
      }
      result.items.push(current);
      break;

    // istanbul ignore next
    default:
      throw new Error(`Unknown state: ${current.state}`);
  }

  return result;
}

function getSource(node: ImportDeclaration | ExportAllDeclaration) {
  const source = node.source.value as string;

  return {
    // Sort by directory level rather than by string length.
    source: source
      // Treat `.` as `./`, `..` as `../`, `../..` as `../../` etc.
      .replace(/^[./]*\.$/, '$&/')
      // Make `../` sort after `../../` but before `../a` etc.
      // Why a comma? See the next comment.
      .replace(/^[./]*\/$/, '$&,')
      // Make `.` and `/` sort before any other punctation.
      // The default order is: _ - , x x x . x x x / x x x
      // We’re changing it to: . / , x x x _ x x x - x x x
      .replace(/[./_-]/g, char => {
        switch (char) {
          case '.':
            return '_';
          case '/':
            return '-';
          case '_':
            return '.';
          case '-':
            return '/';
          // istanbul ignore next
          default:
            throw new Error(`Unknown source substitution character: ${char}`);
        }
      }),
    originalSource: source,
    kind: getImportExportKind(node)
  };
}

function getTrailingSpaces(node: Node, sourceCode: SourceCode): string {
  const tokenAfter = sourceCode.getTokenAfter(node, { includeComments: true });

  if (tokenAfter == null) {
    const text = sourceCode.text.slice(node.range![1]);
    const lines = text.split(NEWLINE);

    return lines[0];
  }

  const text = sourceCode.text.slice(node.range![1], tokenAfter.range![0]);
  const lines = text.split(NEWLINE);

  return lines[0];
}

const guessNewline = (sourceCode: SourceCode): string => (NEWLINE.exec(sourceCode.text) || ['\n'])[0];

const hasNewline = (string: string): boolean => NEWLINE.test(string);

const handleLastSemicolon = (chunk: Chunk, sourceCode: SourceCode): Chunk => {
  const lastIndex = chunk.length - 1;
  const lastNode = chunk[lastIndex];

  const [nextToLastToken, lastToken] = sourceCode.getLastTokens(lastNode, { count: 2 });
  const lastIsSemicolon = isPunctuator(lastToken, ';');

  if (!lastIsSemicolon) return chunk;

  const semicolonBelongsToNode = nextToLastToken.loc.end.line === lastToken.loc.start.line || sourceCode.getTokenAfter(lastToken) == null;

  if (semicolonBelongsToNode) return chunk;

  const location = { end: nextToLastToken.loc.end, start: lastNode.loc?.start };
  const range = [lastNode.range?.[0], nextToLastToken.range[1]];

  return chunk.slice(0, lastIndex).concat({ ...lastNode, range, loc: location } as Node);
};

type State = 'before' | 'specifier' | 'after';
type EmptyItem = { after: WhiteToken[]; before: WhiteToken[]; hadComma: boolean; specifier: WhiteToken[]; state: State };
const makeEmptyItem = (): EmptyItem => ({ after: [], before: [], hadComma: false, specifier: [], state: 'before' });

const parseWhitespace = (whitespace: string): WhiteToken[] => {
  const allItems = whitespace.split(NEWLINE);
  const items = allItems.length >= 5 ? allItems.slice(0, 2).concat(allItems.slice(-1)) : allItems;

  return items.map((data, index) => ({ type: index % 2 === 0 ? 'Spaces' : 'Newline', code: data } as const)).filter(token => token.code !== '');
};

const printTokens = (tokens: AllPossibleTokens[]): string => tokens.map(({ code }) => code).join('');

const removeBlankLines = (whitespace: string): string => printTokens(parseWhitespace(whitespace));

//////////////
// CHECKERS //
//////////////
const isPunctuator = (token: AllPossibleTokens, value: string): boolean => token.type === 'Punctuator' && token.value === value;

const isLineComment = (node: AllPossibleTokens): boolean => node.type === 'Line';

/////////////
// HELPERS //
/////////////
const useGetRelevantComments = (node: Node, sourceCode: SourceCode, index: number, lastModule: number): [Comment[], Comment[]] => {
  const before = sourceCode.getCommentsBefore(node);
  const filtered = before.filter(
    ({ loc }) =>
      (loc as AST.SourceLocation).start.line <= (node.loc as AST.SourceLocation).start.line &&
      (loc as AST.SourceLocation).end.line > lastModule &&
      (index > 0 || (loc as AST.SourceLocation).start.line > lastModule)
  );
  const after = sourceCode.getCommentsAfter(node).filter(comment => comment.loc?.end.line === node.loc?.end.line);

  return [filtered, after];
};

const usePrintComments = (node: Node, comments: [Comment[], Comment[]], sourceCode: SourceCode): [string, string] => {
  const lastIndex = comments.length - 1;

  const before = comments
    .map((comment, index) => {
      const next = index === lastIndex ? node : (comments[index + 1] as unknown as Node);
      const { range } = comment as unknown as Node;

      return sourceCode.getText(comment as unknown as Node) + removeBlankLines(sourceCode.text.slice(range?.[1], next.range?.[0]));
    })
    .join('');

  const after = comments
    .map((comment, index) => {
      const previous = index === 0 ? node : (comments[index - 1] as unknown as Node);
      const { range } = comment as unknown as Node;

      return removeBlankLines(sourceCode.text.slice(previous.range?.[1], range?.[0])) + sourceCode.getText(comment as unknown as Node);
    })
    .join('');

  return [before, after];
};

//////////////////////
// EXPORTABLE UTILS //
//////////////////////
export function extractChunks(program: Program, getSource: (node: Node, prevNode: Node | undefined) => ChunkSource): Chunk[] {
  const { body } = program;
  const chunks: Chunk[] = [];

  let chunk: Chunk = [];
  let previousNode: Node | undefined = undefined;

  for (const node of body) {
    const source = getSource(node, previousNode);

    switch (source) {
      case 'NotPartOfChunk':
        if (chunk.length > 0) {
          chunks.push(chunk);
          chunk = [];
        }
        break;

      case 'PartOfChunk':
        chunk.push(node);
        break;

      case 'PartOfNewChunk':
        if (chunk.length > 0) chunks.push(chunk);

        chunk = [node];
        break;

      default:
        throw new Error(`Unknown chunk result: ${source}`);
    }

    previousNode = node;
  }

  if (chunk.length > 0) chunks.push(chunk);

  return chunks;
}

export function maybeReportSorting(context: RuleContext, sorted: string, start: number, end: number): void {
  const sourceCode = context.getSourceCode();
  const original = sourceCode.getText().slice(start, end);

  if (original !== sorted) {
    context.report({
      fix: fixer => fixer.replaceTextRange([start, end], sorted),
      loc: { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) },
      messageId: 'sort'
    });
  }
}

export function printSortedItems(sortedItems: unknown, originalItems: unknown, sourceCode: SourceCode) {}

export function getImportExportItems(
  previousChunk: Chunk,
  sourceCode: SourceCode,
  isSideEffectImport: isSideEffectImport,
  getSpecifiers: getSpecifiers
) {
  const chunk = handleLastSemicolon(previousChunk, sourceCode);

  return chunk.map((node, index) => {
    const lastLine = index === 0 ? node.loc!.start.line - 1 : chunk[index - 1].loc!.end.line;

    // BEFORE:
    // Get all comments before the import/export, except:
    //
    // - Comments on another line for the first import/export.
    // - Comments that belong to the previous import/export (if any) – that is,
    //   comments that are on the same line as the previous import/export. But
    //   multiline block comments always belong to this import/export, not the
    //   previous.

    // AFTER:
    // Get all comments after the import/export that are on the same line.
    // Multiline block comments belong to the _next_ import/export (or the
    // following code in case of the last import/export).
    const [commentsBefore, commentsAfter] = useGetRelevantComments(node, sourceCode, index, lastLine);
    const [before, after] = usePrintComments(node, [commentsBefore, commentsAfter], sourceCode);

    // Print the indentation before the import/export or its first comment, if
    // any, to support indentation in `<script>` tags.
    const indentation = getIndentation(commentsBefore.length > 0 ? (commentsBefore[0] as unknown as Node) : node, sourceCode);

    // Print spaces after the import/export or its last comment, if any, to
    // avoid producing a sort error just because you accidentally added a few
    // trailing spaces among the imports/exports.
    const trailingSpaces = getTrailingSpaces(
      commentsAfter.length > 0 ? (commentsAfter[commentsAfter.length - 1] as unknown as Node) : node,
      sourceCode
    );

    const code = indentation + before + printWithSortedSpecifiers(node, sourceCode, getSpecifiers) + after + trailingSpaces;

    const all = [...commentsBefore, node, ...commentsAfter];
    const [start] = all[0].range!;
    const [, end] = all[all.length - 1].range!;

    const source = getSource(node as ImportDeclaration | ExportAllDeclaration);

    return {
      node,
      code,
      start: start - indentation.length,
      end: end + trailingSpaces.length,
      isSideEffectImport: isSideEffectImport(node, sourceCode),
      source,
      index,
      needsNewline: commentsAfter.length > 0 && isLineComment(commentsAfter[commentsAfter.length - 1])
    };
  });
}

export function printWithSortedSpecifiers(node: Node, sourceCode: SourceCode, getSpecifiers: getSpecifiers) {
  const allTokens = getAllTokens(node, sourceCode);

  const openBraceIndex = allTokens.findIndex(token => isPunctuator(token, '{'));
  const closeBraceIndex = allTokens.findIndex(token => isPunctuator(token, '}'));

  const specifiers = getSpecifiers(node);

  if (openBraceIndex === -1 || closeBraceIndex === -1 || specifiers.length <= 1) return printTokens(allTokens);

  const specifierTokens = allTokens.slice(openBraceIndex + 1, closeBraceIndex);
  const itemsResult = getSpecifierItems(specifierTokens);

  const items = itemsResult.items.map((originalItem, index) => ({ ...originalItem, node: specifiers[index] }));
}

export type Item = { code: string; index: number; isSideEffectImport: boolean; source: ItemSource };
export type ItemSource = { kind: string; originalSource: string; source: string };

export function sortImportExportItems(items: Item[], sortBy: SortBy) {
  return items.slice().sort((itemA, itemB) => {
    if (itemA.isSideEffectImport && itemB.isSideEffectImport) return itemA.index - itemB.index;

    if (itemA.isSideEffectImport) return -1;

    if (itemB.isSideEffectImport) return 1;

    if (sortBy === 'name') return compare(itemA.code, itemB.code);

    return (
      // Compare the `from` part.
      compare(itemA.source.source, itemB.source.source) ||
      // The `.source` has been slightly tweaked. To stay fully deterministic,
      // also sort on the original value.
      compare(itemA.source.originalSource, itemB.source.originalSource) ||
      // Then put type imports/exports before regular ones.
      compare(itemA.source.kind, itemB.source.kind) ||
      // Keep the original order if the sources are the same. It’s not worth
      // trying to compare anything else, and you can use `import/no-duplicates`
      // to get rid of the problem anyway.
      itemA.index - itemB.index
    );
  });
}
