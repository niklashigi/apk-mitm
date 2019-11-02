import execa from 'execa'

export function executeJar(path: string, args: string[]) {
  return execa('java', ['-jar', path, ...args])
}
