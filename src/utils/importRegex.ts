export function importRegex(name: string) {
  return [`^(@|ui/${name})`, `^(@|./${name})`, `^(@|${name})`];
}
