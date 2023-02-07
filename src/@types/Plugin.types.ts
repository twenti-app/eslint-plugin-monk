import type { Directive, ModuleDeclaration, Statement } from 'estree';
import type { Rule } from 'eslint';

export type Chunk = Node[];
export type Node = Directive | Statement | ModuleDeclaration;
export type Source = 'PartOfChunk' | 'PartOfNewChunk' | 'NotPartOfChunk';

export interface RuleContext<T> extends Rule.RuleContext {
  options: T[];
}
