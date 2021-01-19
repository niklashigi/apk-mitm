import { getCachedPath } from '../utils/download-tool'

export default abstract class Tool {
  abstract name: string
  abstract get version(): ToolVersion

  protected get jarPath() {
    return getCachedPath(`${this.name}-${this.version.name}.jar`)
  }
}

export interface ToolVersion {
  name: string
  downloadUrl?: string
}
