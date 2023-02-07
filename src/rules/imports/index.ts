import { defaults } from './defaults';

import { extractChunks } from '../../utils/extractChunks';
import { isImport } from '../../utils/isImport';

import type { Rule } from 'eslint';
import type { RuleContext } from '../../@types/Plugin.types';
import type { SortBy } from '../../@types/Metadata.types';

interface Options {
  groups: string[][];
  sortBy: SortBy;
}

function create(context: RuleContext<Options>): Rule.RuleListener {
  const { groups = defaults, sortBy = 'name' } = context.options[0] || {};
  const outerGroups = groups.map(groups => groups.map(item => RegExp(item, 'u')));

  return {
    Program: program => {
      for (const chunk of extractChunks(program, node => (isImport(node) ? 'PartOfChunk' : 'NotPartOfChunk'))) {
      }
    }
  };
}

function getMetadata(): Rule.RuleMetaData {
  return { docs: { url: `` }, fixable: 'code', messages: {}, schema: [], type: 'layout' };
}

export const importsRule: Rule.RuleModule = { create, meta: getMetadata() };
