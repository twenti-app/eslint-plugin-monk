import type { AST } from 'eslint';
import type { Comment } from 'estree';

export type SpaceType = 'Newline' | 'Spaces';
export type SpaceToken = { code: string; type: SpaceType };

export type Token = AST.Token | Comment | SpaceToken;
