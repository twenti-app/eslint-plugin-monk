import type { Rule } from 'eslint';

function create(context: Rule.RuleContext): Rule.RuleListener {
  return {};
}

function getMetadata(): Rule.RuleMetaData {
  return {};
}

export const exportsRule: Rule.RuleModule = { create, meta: getMetadata() };
