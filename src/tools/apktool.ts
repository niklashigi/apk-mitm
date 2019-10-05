import * as path from 'path'
import execa from 'execa'

const jar = path.join(__dirname, '../../jar/apktool.jar')

const apktool = {
  decode(inputPath: string, outputPath: string) {
    return execa('java', ['-jar', jar,
      'decode', inputPath, '--output', outputPath,
    ])
  },
  encode(inputPath: string, outputPath: string) {
    return execa('java', ['-jar', jar,
      'build', inputPath, '--output', outputPath,
    ])
  },
  version: 'commit 683fef3',
}

export default apktool
