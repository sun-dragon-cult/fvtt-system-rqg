module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./src/test/test-setup.js","./src/mocks/foundryMockFunctions.js"],
};
