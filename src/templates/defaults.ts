const importRegex = (name: string) => [`^(@|ui/${name})`, `^(@|./${name})`, `^(@|${name})`];

const REACT = ['react', 'react-dom', 'react-router-dom', 'recoil'];
const REACT_LIBRARIES = ['^react-', '^@react-'];
const NEXT = ['next'];
const EXTERNAL_LIBRARIES = ['^@?\\w'];

const STYLES = ['^.+\\.?(.styles)$', '^.+\\.?(.scss)$', '^.+\\.?(.css)$'];

const ASSETS = ['assets'];
const CONFIGURATION = ['configuration'];
const CORE_LAYER = ['core'];
const UI = ['components', 'hooks', 'pages', 'stores', 'contexts', 'providers', 'styles', 'helpers', 'utils'].map(item => importRegex(item));

const NOT_MATCHED = ['^'];

const TYPES = [['^\\.'], ['^.+\\u0000$']];

const defaults = [REACT, REACT_LIBRARIES, NEXT, EXTERNAL_LIBRARIES, STYLES, ASSETS, CONFIGURATION, CORE_LAYER, ...UI, NOT_MATCHED, ...TYPES];

export { defaults };
