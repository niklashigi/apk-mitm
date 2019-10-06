import * as fs from '../utils/fs'
import xml from 'xml-js'

export default async function modifyManifest(path: string) {
  const manifest = xml.xml2js(await fs.readFile(path, 'utf-8'))

  const application = manifest.elements[0].elements
    .filter((element: any) => element.name === 'application')[0]

  application.attributes['android:debuggable'] = 'true'

  let nscName = 'network_security_config'
  const nscReference: string = application.attributes['android:networkSecurityConfig']
  if (nscReference && nscReference.startsWith('@xml/')) {
    nscName = nscReference.slice(5)
  } else {
    application.attributes['android:networkSecurityConfig'] = '@xml/network_security_config'
  }

  await fs.writeFile(path, xml.js2xml(manifest, { spaces: 4 }))

  return { nscName }
}
