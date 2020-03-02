import * as fs from '../utils/fs'
import { dirname } from 'path'
import xml from 'xml-js'

const DEFAULT_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>`

export default async function modifyNetworkSecurityConfig(path: string) {
  if (!(await fs.exists(path))) {
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(path, DEFAULT_CONFIG)

    return
  }

  const fileXml = xml.xml2js(
    await fs.readFile(path, 'utf-8'),
    { compact: true, alwaysArray: true },
  )
  const config = fileXml['network-security-config'][0]

  // Remove certificate pinning rules
  // See https://developer.android.com/training/articles/security-config#pin-set
  delete config['pin-set']

  const overrides = (config['debug-overrides'] || (config['debug-overrides'] = [{}]))[0]
  const trustAnchors = (overrides['trust-anchors'] || (overrides['trust-anchors'] = [{}]))[0]
  const certificates = trustAnchors['certificates'] || (trustAnchors['certificates'] = [])

  if (!certificates.filter((c: any) => c._attributes.src === 'user').length) {
    certificates.push({ _attributes: { src: 'user' } })
  }

  await fs.writeFile(path, xml.js2xml(fileXml, { compact: true, spaces: 4 }))
}
