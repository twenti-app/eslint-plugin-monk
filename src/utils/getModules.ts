import { isPunctuator } from './astNodeTypeUtils';

import type { Chunk, Node } from '../@types/Plugin.types';
import type { Comment } from 'estree';
import type { SourceCode, AST } from 'eslint';

function handleLastSemicolon(chunk: Chunk, sourceCode: SourceCode) {
  const lastIndex = chunk.length - 1;
  const lastNode = chunk[lastIndex];

  const [nextToLastToken, lastToken] = sourceCode.getLastTokens(lastNode, { count: 2 });
  const lastIsSemicolon = isPunctuator(lastToken, ';');

  if (!lastIsSemicolon) return chunk;

  const semicolonBelongsToNode = nextToLastToken.loc.end.line === lastToken.loc.start.line || sourceCode.getTokenAfter(lastToken) == null;

  if (semicolonBelongsToNode) return chunk;

  const newLastNode = {
    ...lastNode,
    range: [lastNode.range?.[0], nextToLastToken.range[1]],
    loc: { end: nextToLastToken.loc.end, start: lastNode.loc?.start }
  } as Node;

  return chunk.slice(0, lastIndex).concat(newLastNode);
}

export function getModules(previousChunk: Chunk, sourceCode: SourceCode) {
  const chunk = handleLastSemicolon(previousChunk, sourceCode);

  return chunk.map((node, index) => {
    const lastModule = index === 0 ? node.loc?.start.line || 0 - 1 : chunk[index - 1].loc?.end.line;
  });
}

function useGetRelevantComments(node: Node, sourceCode: SourceCode, index: number, lastModule: number) {
  const before = sourceCode.getCommentsBefore(node);
  const filtered = before.filter(
    ({ loc }) =>
      (loc as AST.SourceLocation).start.line <= (node.loc as AST.SourceLocation).start.line &&
      (loc as AST.SourceLocation).end.line > lastModule &&
      (index > 0 || (loc as AST.SourceLocation).start.line > lastModule)
  );
  const after = sourceCode.getCommentsAfter(node).filter(comment => comment.loc?.end.line === node.loc?.end.line);

  return [filtered, after];
}

function usePrintComments(node: Node, sourceCode: SourceCode, comments: Comment[]) {
  const after = comments.map((comment, index) => {
    const previous = index === 0 ? node : comments[index - 1];
  });
}
