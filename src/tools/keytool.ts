import { executeBin } from "../utils/execute";
import observeProcess from "../utils/observe-process";

const keytool = {
  createCertificate: () =>
    observeProcess(
      executeBin("keytool", [
        "-genkey",
        "-v",
        "-keystore debug.keystore",
        "-storepass android",
        "-alias androiddebugkey",
        "-keypass android",
        "-keyalg RSA",
        "-keysize 2048",
        "-validity 10000",
        '-dname "cn=Unknown, ou=Unknown, o=Unknown, c=Unknown"'
      ])
    ),
  version: "v0.0.1"
};

export default keytool;
