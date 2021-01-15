import execa = require('execa')

export function executeJar(path: string, args: string[]) {
  return execa('java', ['-jar', path, ...args], {
    // Necessary for showing both stdout and stderr in error output
    all: true,
  })
}
