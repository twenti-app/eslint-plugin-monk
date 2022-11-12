const { importRegex } = require('./helpers');

const REACT = ['react', 'react-dom', 'react-router-dom', 'recoil'];
const REACT_LIBRARIES = ['^react-', '^@react-'];
const EXTERNAL_LIBRARIES = ['^@?\\w'];

const STYLES = ['^.+\\.?(styles.ts)$', '^.+\\.?(.scss)$', '^.+\\.?(.css)$'];

const ASSETS = ['assets'];
const CONFIGURATION = ['configuration'];
const CORE_LAYER = ['core'];
const UI = ['components', 'hooks', 'pages', 'stores', 'contexts', 'providers', 'styles', 'helpers', 'utils'].map(item => importRegex(item));

const NOT_MATCHED = ['^'];
const TYPES = [['^\\.'], ['^.+\\u0000$']];

const defaultGroups = [REACT, REACT_LIBRARIES, EXTERNAL_LIBRARIES, STYLES, ASSETS, CONFIGURATION, CORE_LAYER, ...UI, NOT_MATCHED, ...TYPES];

module.exports = { defaultGroups };
