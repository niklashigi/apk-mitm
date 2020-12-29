import * as fs from '../utils/fs'
import * as pathUtils from 'path'

const TEMPLATE_PATH = pathUtils.join(__dirname, '../../res/nsc_mitm.xml')

export default async function createNetworkSecurityConfig(path: string) {
  await fs.mkdir(pathUtils.dirname(path), { recursive: true })
  await fs.copyFile(TEMPLATE_PATH, path)
}
