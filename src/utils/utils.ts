import type { ImportDeclaration } from 'estree';

export function getSource(node: ImportDeclaration) {
  const { source } = node;
  const value = source.value as string;

  return {
    // kind: node.importKind || node.exportKind || 'value',
    originalSource: source,
    source: formatSource(value)
  };
}

const normalizeRelativeDirectoryPath = (value: string): string => value.replace(/^[./]*\.$/, '$&/');

const sortPathsByDepth = (value: string) => value.replace(/^[./]*\/$/, '$&,');

const punctuationReplacements: Record<string, string> = { '.': '_', '/': '-', _: '.', '-': '/' };

const sortPunctuationByOrder = (value: string) =>
  value.replace(/[./_-]/g, character => {
    if (!punctuationReplacements[character]) throw new Error(`Unsupported punctuation character: ${character}`);

    return punctuationReplacements[character];
  });

//   const sortPunctuationByOrder = (value: string) =>
//   value.replace(/[./_-]/g, character => {
//     switch (character) {
//       case '.':
//         return '_';

//       case '/':
//         return '-';

//       case '_':
//         return '.';

//       case '-':
//         return '/';

//       default:
//         throw new Error(`Unsupported punctuation character: ${character}`);
//     }
//   });

const formatSource = (source: string) => sortPunctuationByOrder(sortPathsByDepth(normalizeRelativeDirectoryPath(source)));

export {};
