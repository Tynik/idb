import { Config } from '@jest/types';

const config: Config.InitialOptions = {
  clearMocks: true,
  moduleNameMapper: {
    '\\.scss$': 'identity-obj-proxy'
  },
  testMatch: [
    '**/src/**/*.spec.ts?(x)',
  ],
  transform: {
    '\\.tsx?$': ['babel-jest', {
      configFile: `./jest.babel.config.js`
    }]
  }
};

export default config;