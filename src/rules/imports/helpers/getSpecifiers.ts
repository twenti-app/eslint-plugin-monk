export function getSpecifiers(importNode) {
  return importNode.specifiers.filter(node => isImportSpecifier(node));
}
