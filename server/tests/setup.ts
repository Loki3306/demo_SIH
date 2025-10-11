import { jest } from '@jest/globals';

// Mock Web3 globally
jest.mock('web3', () => {
  return jest.fn().mockImplementation(() => ({
    eth: {
      accounts: {
        privateKeyToAccount: jest.fn()
      },
      getBalance: jest.fn(),
      getBlockNumber: jest.fn(),
      net: {
        isListening: jest.fn(),
        getId: jest.fn()
      },
      Contract: jest.fn()
    }
  }));
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ adminId: 'admin123' }),
  decode: jest.fn().mockReturnValue({ adminId: 'admin123' })
}));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless NODE_ENV is 'test-verbose'
  log: process.env.NODE_ENV === 'test-verbose' ? console.log : jest.fn(),
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};