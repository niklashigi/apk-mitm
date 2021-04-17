import execa = require('execa')

/** Extracts the Java major version from the output of `java -version`. */
export default async function getJavaVersion() {
  try {
    const { stderr } = await execa('java', ['-version'])
    const version = stderr.match(/"(\d+\.\d+\.\d+)/)![1]

    // `.replace` needed to remove `1.` prefix from versions older than Java 9
    return parseInt(version.replace(/^1\./, '').match(/^\d+/)![0])
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(
        'No "java" executable could be found!' +
          ' Make sure that Java is installed and available in your PATH.',
      )

    throw error
  }
}
