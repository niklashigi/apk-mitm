import * as fs from 'fs'
import { promisify } from 'util'

export const readFile = promisify(fs.readFile)
export const writeFile = promisify(fs.writeFile)
export const copyFile = promisify(fs.copyFile)
export const exists = promisify(fs.exists)
export const unlink = promisify(fs.unlink)
export const rename = promisify(fs.rename)
export const mkdirp: (path: string) => Promise<void>
  = promisify(require('mkdirp'))
