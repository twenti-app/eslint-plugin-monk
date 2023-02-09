import type { Rule } from 'eslint';

interface Options {
  groups: string[][];
  sortBy: 'import' | 'path';
}

interface RuleContext extends Rule.RuleContext {
  options: Options[];
}

export function maybeReportSorting(context: RuleContext, sorted: string, start: number, end: number) {
  const sourceCode = context.getSourceCode();
  const original = sourceCode.getText().slice(start, end);

  if (original !== sorted) {
    context.report({
      fix: fixer => fixer.replaceTextRange([start, end], sorted),
      loc: { end: sourceCode.getLocFromIndex(end), start: sourceCode.getLocFromIndex(start) },
      messageId: 'sort'
    });
  }
}
