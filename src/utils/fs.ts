import * as fs from 'fs'
import { promises as fsp } from 'fs'
import { promisify } from 'util'

export const createWriteStream = fs.createWriteStream
export const readFile = promisify(fs.readFile)
export const writeFile = fsp.writeFile
export const copyFile = fsp.copyFile
export const exists = promisify(fs.exists)
export const unlink = fsp.unlink
export const rename = fsp.rename
export const mkdir = fsp.mkdir
