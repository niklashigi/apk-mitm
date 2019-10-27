import * as fs from '../utils/fs'
import xml from 'xml-js'

export default async function modifyManifest(path: string) {
  const fileXml = xml.xml2js(
    await fs.readFile(path, 'utf-8'),
    { compact: true, alwaysArray: true },
  )
  const manifest = fileXml['manifest'][0]
  const application = manifest['application'][0]

  application._attributes['android:debuggable'] = 'true'

  let nscName = 'network_security_config'
  const nscReference: string = application._attributes['android:networkSecurityConfig']
  if (nscReference && nscReference.startsWith('@xml/')) {
    nscName = nscReference.slice(5)
  } else {
    application._attributes['android:networkSecurityConfig'] = `@xml/${nscName}`
  }

  const usesAppBundle = application['meta-data'] && application['meta-data']
    .some((meta: any) => meta._attributes['android:name'] === 'com.android.vending.splits')

  await fs.writeFile(path, xml.js2xml(fileXml, { compact: true, spaces: 4 }))

  return { nscName, usesAppBundle }
}
