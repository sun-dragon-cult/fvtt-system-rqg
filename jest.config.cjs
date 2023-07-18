module.exports = {
  preset: "ts-jest",
  setupFiles: ["./src/mocks/foundryMockFunctions.js"],
  collectCoverage: true,
  collectCoverageFrom: ["./src/**"],
};
