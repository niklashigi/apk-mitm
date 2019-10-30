import execa from 'execa'

export function executeJar(path: string, args: string[]) {
  return execa('java', ['-jar', path, ...args])
}

export function executeBin(exec: string, args: string[]) {
  return execa(exec, [...args]);
}
