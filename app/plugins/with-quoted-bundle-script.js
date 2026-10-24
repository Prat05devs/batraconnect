// The generated "Bundle React Native code and images" phase runs react-native-xcode.sh through an unquoted
// command substitution, so a project path with a space ("Batra connect") splits and the Release build fails.
// Quote it every time `expo prebuild` writes the Xcode project.
const { withXcodeProject } = require('expo/config-plugins');

const unquoted = /`(\\"\$NODE_BINARY\\" --print \\"require\('path'\)[^`]*react-native-xcode\.sh'\\")`/;

module.exports = function withQuotedBundleScript(config) {
  return withXcodeProject(config, result => {
    const phases = result.modResults.hash.project.objects.PBXShellScriptBuildPhase;
    for (const phase of Object.values(phases)) {
      if (typeof phase !== 'object' || !String(phase.name).includes('Bundle React Native code and images'))
        continue;
      phase.shellScript = phase.shellScript.replace(unquoted, (_, command) => `\\"$(${command})\\"`);
    }
    return result;
  });
};
