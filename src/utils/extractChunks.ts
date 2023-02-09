import type { Chunk, Node, Source } from '../@types/Plugin.types';
import type { Program } from 'estree';

export function extractChunks(program: Program, getSource: (node: Node, prevNode: Node | undefined) => Source) {
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
