'use strict';

const exportsRule = require('./exports');
const importsRule = require('./imports');

module.exports = { rules: { imports: importsRule, exports: exportsRule } };
