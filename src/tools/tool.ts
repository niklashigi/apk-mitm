import { getCachedPath } from '../utils/download-tool'

export default class Tool {
  name: string
  version: ToolVersion

  protected get jarPath() {
    return getCachedPath(`${this.name}-${this.version.name}.jar`)
  }
}

export interface ToolVersion {
  name: string
  downloadUrl?: string
}
