/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // The widget refresh crosses into a native Expo module that can't load
  // under node — see __tests__/widgetRefreshStub.ts.
  moduleNameMapper: {
    "^\\.\\./widgets/refresh$": "<rootDir>/__tests__/widgetRefreshStub.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
