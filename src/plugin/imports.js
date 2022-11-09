'use strict';

const utils = require('./utils');

const { defaultGroups } = require('./defaults');

module.exports = {
  meta: {
    type: 'layout',
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: { groups: { type: 'array', items: { type: 'array', items: { type: 'string' } } } },
        additionalProperties: false
      }
    ],
    docs: { url: 'https://github.com/twenti-app/eslint-plugin-monk.git' },
    messages: { sort: `Here's the thing... These imports should be sorted.` }
  },
  create: context => {
    const { groups: rawGroups = defaultGroups } = context.options[0] || {};
    const outerGroups = rawGroups.map(groups => groups.map(item => RegExp(item, 'u')));

    return {
      Program: programNode => {
        for (const chunk of utils.extractChunks(programNode, node => (isImport(node) ? 'PartOfChunk' : 'NotPartOfChunk'))) {
          maybeReportChunkSorting(chunk, context, outerGroups);
        }
      }
    };
  }
};

function maybeReportChunkSorting(chunk, context, outerGroups) {
  const sourceCode = context.getSourceCode();
  const items = utils.getImportExportItems(chunk, sourceCode, isSideEffectImport, getSpecifiers);
  const sortedItems = makeSortedItems(items, outerGroups);
  const sorted = utils.printSortedItems(sortedItems, items, sourceCode);

  const { start } = items[0];
  const { end } = items[items.length - 1];

  utils.maybeReportSorting(context, sorted, start, end);
}

function makeSortedItems(items, outerGroups) {
  const itemGroups = outerGroups.map(groups => groups.map(regex => ({ regex, items: [] })));
  const rest = [];

  for (const item of items) {
    const { originalSource } = item.source;

    const source = item.isSideEffectImport ? `\0${originalSource}` : item.source.kind !== 'value' ? `${originalSource}\0` : originalSource;
    const [matchedGroup] = utils
      .flatMap(itemGroups, groups => groups.map(group => [group, group.regex.exec(source)]))
      .reduce(
        ([group, longestMatch], [nextGroup, nextMatch]) =>
          nextMatch != null && (longestMatch == null || nextMatch[0].length > longestMatch[0].length)
            ? [nextGroup, nextMatch]
            : [group, longestMatch],
        [undefined, undefined]
      );
    if (matchedGroup == null) {
      rest.push(item);
    } else {
      matchedGroup.items.push(item);
    }
  }

  return itemGroups
    .concat([[{ regex: /^/, items: rest }]])
    .map(groups => groups.filter(group => group.items.length > 0))
    .filter(groups => groups.length > 0)
    .map(groups => groups.map(group => utils.sortImportExportItems(group.items)));
}

// Exclude "ImportDefaultSpecifier" – the "def" in `import def, {a, b}`.
function getSpecifiers(importNode) {
  return importNode.specifiers.filter(node => isImportSpecifier(node));
}

// Full import statement.
function isImport(node) {
  return node.type === 'ImportDeclaration';
}

// import def, { a, b as c, type d } from "A"
//               ^  ^^^^^^  ^^^^^^
function isImportSpecifier(node) {
  return node.type === 'ImportSpecifier';
}

// import "setup"
// But not: import {} from "setup"
// And not: import type {} from "setup"
function isSideEffectImport(importNode, sourceCode) {
  return (
    importNode.specifiers.length === 0 &&
    (!importNode.importKind || importNode.importKind === 'value') &&
    !utils.isPunctuator(sourceCode.getFirstToken(importNode, { skip: 1 }), '{')
  );
}
