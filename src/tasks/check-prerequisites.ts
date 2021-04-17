import Listr = require('listr')

import { TaskOptions } from '../cli'
import getJavaVersion from '../utils/get-java-version'
import downloadTools from './download-tools'

const MIN_NODE_VERSION = 10
const MIN_JAVA_VERSION = 8

export default function checkPrerequisites(options: TaskOptions) {
  return new Listr([
    {
      title: 'Checking Node.js version',
      task: () => {
        const majorVersion = parseInt(process.versions.node.split('.')[0])
        if (majorVersion < MIN_NODE_VERSION)
          throw new VersionError('Node.js', MIN_NODE_VERSION, majorVersion)
      },
    },
    {
      title: 'Checking Java version',
      task: async () => {
        const majorVersion = await getJavaVersion()
        if (majorVersion < MIN_JAVA_VERSION)
          throw new VersionError('Java', MIN_JAVA_VERSION, majorVersion)
      },
    },
    {
      title: 'Downloading tools',
      task: () => downloadTools(options),
    },
  ])
}

class VersionError extends Error {
  constructor(tool: string, minVersion: number, currentVersion: number) {
    super(
      `apk-mitm requires at least ${tool} ${minVersion} to work and you seem to be using ${tool} ${currentVersion}.` +
        ` Please upgrade your ${tool} installation and try again!`,
    )
    this.name = VersionError.name
  }
}
