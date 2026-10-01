import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Ajudantes em __tests__/mocks não são suites de teste.
  testPathIgnorePatterns: ["<rootDir>/__tests__/mocks/", "<rootDir>/__tests__/fixtures/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
}

export default createJestConfig(config)
