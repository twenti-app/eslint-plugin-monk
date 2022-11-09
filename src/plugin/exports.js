'use strict';

const utils = require('./utils');

module.exports = {
  meta: {
    type: 'layout',
    fixable: 'code',
    schema: [],
    docs: { url: 'https://github.com/twenti-app/eslint-plugin-monk.git' },
    messages: { sort: `Here's the thing... These imports should be sorted.` }
  },
  create: context => ({
    Program: programNode => {
      const sourceCode = context.getSourceCode();
      for (const chunk of utils.extractChunks(programNode, (node, lastNode) => isPartOfChunk(node, lastNode, sourceCode))) {
        maybeReportChunkSorting(chunk, context);
      }
    },
    ExportNamedDeclaration: node => {
      if (node.source == null && node.declaration == null) {
        maybeReportExportSpecifierSorting(node, context);
      }
    }
  })
};

const isSideEffectImport = () => false;

function maybeReportChunkSorting(chunk, context) {
  const sourceCode = context.getSourceCode();
  const items = utils.getImportExportItems(chunk, sourceCode, isSideEffectImport, getSpecifiers);
  const sortedItems = [[utils.sortImportExportItems(items)]];
  const sorted = utils.printSortedItems(sortedItems, items, sourceCode);

  const { start } = items[0];
  const { end } = items[items.length - 1];

  utils.maybeReportSorting(context, sorted, start, end);
}

function maybeReportExportSpecifierSorting(node, context) {
  const sorted = utils.printWithSortedSpecifiers(node, context.getSourceCode(), getSpecifiers);
  const [start, end] = node.range;

  utils.maybeReportSorting(context, sorted, start, end);
}

// `export * from "a"` does not have `.specifiers`.
function getSpecifiers(exportNode) {
  return exportNode.specifiers || [];
}

function isPartOfChunk(node, lastNode, sourceCode) {
  if (!isExportFrom(node)) {
    return 'NotPartOfChunk';
  }

  const hasGroupingComment = sourceCode
    .getCommentsBefore(node)
    .some(comment => (lastNode == null || comment.loc.start.line > lastNode.loc.end.line) && comment.loc.end.line < node.loc.start.line);

  return hasGroupingComment ? 'PartOfNewChunk' : 'PartOfChunk';
}

// Full export-from statement.
// export {a, b} from "A"
// export * from "A"
// export * as A from "A"
function isExportFrom(node) {
  return (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source != null;
}
