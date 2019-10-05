import execa from 'execa'

export default function executeJar(path: string, args: string[]) {
  return execa('java', ['-jar', path, ...args])
}
