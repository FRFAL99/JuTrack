/**
 * Configurazione Metro.
 *
 * Dal SDK 52 Metro rileva e configura da solo i monorepo: qui **non** vanno reimpostati
 * `watchFolders`, `resolver.nodeModulesPaths` o `disableHierarchicalLookup`. L'unica
 * ragione per cui questo file esiste è l'alias su `lib0/webcrypto`.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const LIB0_WEBCRYPTO_SHIM = path.resolve(__dirname, 'src/platform/lib0-webcrypto-shim.js');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Su React Native, l'export map di lib0 manda `lib0/webcrypto` verso
  // `isomorphic-webcrypto`, fermo al 2022 e non installato: il bundle non si
  // risolverebbe. Yjs ne usa solo `getRandomValues`, che expo-crypto fornisce.
  // Vedi src/platform/lib0-webcrypto-shim.js per il ragionamento completo.
  if (
    moduleName === 'lib0/webcrypto' ||
    moduleName.endsWith('isomorphic-webcrypto/src/react-native')
  ) {
    return { type: 'sourceFile', filePath: LIB0_WEBCRYPTO_SHIM };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
