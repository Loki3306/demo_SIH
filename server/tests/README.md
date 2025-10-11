# Wallet Authentication System Test Suite

## Overview

This test suite provides comprehensive coverage for the wallet-based admin authentication system implemented for the Smart Tourist Safety Platform (YatraRakshak).

## Test Structure

### Unit Tests

#### 1. Wallet Authentication Service (`walletAuth.test.ts`)
- **validatePrivateKey**: Tests private key format validation and Web3 integration
- **validateAdminAuthority**: Tests blockchain admin authority verification
- **createAuthSession**: Tests JWT session creation and management
- **getBlockchainHealth**: Tests blockchain connectivity monitoring
- **Error Handling**: Tests blockchain error scenarios and recovery

#### 2. Authentication Routes (`authRoutes.test.ts`)
- **Login Endpoints**: Tests both password and wallet authentication flows
- **Session Management**: Tests token refresh and logout functionality
- **Security Validation**: Tests rate limiting and security constraints
- **Health Monitoring**: Tests blockchain health endpoint
- **Error Scenarios**: Tests various failure conditions and responses

#### 3. Wallet Security Service (`walletSecurity.test.ts`)
- **Security Constraints**: Tests validation of security requirements
- **Rate Limiting**: Tests login attempt tracking and limits
- **Suspicious Activity**: Tests detection of anomalous behavior
- **Audit Logging**: Tests security event logging and monitoring
- **Edge Cases**: Tests handling of malformed requests and edge conditions

### Integration Tests

#### 4. End-to-End Authentication (`e2e.test.ts`)
- **Complete Authentication Flow**: Tests full password and wallet login processes
- **Tourist Management Integration**: Tests authenticated tourist creation and verification
- **Dashboard Integration**: Tests admin dashboard access and metrics
- **Security Features**: Tests security headers, CORS, and logging
- **Error Handling**: Tests graceful error handling and fallback mechanisms

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['auth/**/*.ts']
}
```

### Global Test Setup (`setup.ts`)
- Web3 mocking for blockchain operations
- bcrypt mocking for password hashing
- JWT mocking for token operations
- Console output management for clean test runs

## Running Tests

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev jest @jest/globals ts-jest supertest @types/supertest
```

### Test Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- walletAuth.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Environment Variables for Testing
```bash
# Test environment configuration
NODE_ENV=test
GANACHE_URL=http://localhost:8545
GANACHE_CHAIN_ID=1337
JWT_SECRET=test-jwt-secret
```

## Test Scenarios

### Authentication Success Scenarios
1. **Valid Password Login**: Admin logs in with correct email/password
2. **Valid Wallet Login**: Admin logs in with valid private key
3. **Session Refresh**: Token refreshed before expiration
4. **Graceful Logout**: Session terminated successfully

### Authentication Failure Scenarios
1. **Invalid Credentials**: Wrong password or email
2. **Invalid Private Key**: Malformed or incorrect wallet key
3. **Non-Admin Wallet**: Valid wallet but no admin authority
4. **Inactive Admin**: Valid credentials but deactivated account
5. **Rate Limited**: Too many failed attempts
6. **Session Expired**: Expired token used for protected routes

### Security Test Scenarios
1. **Rate Limiting**: Multiple failed attempts trigger lockout
2. **Suspicious Activity**: Automated tools or unusual patterns detected
3. **IP Validation**: Requests from suspicious IP addresses blocked
4. **Session Security**: Multiple concurrent sessions handled properly
5. **Audit Logging**: All security events logged correctly

### Blockchain Integration Scenarios
1. **Healthy Network**: All blockchain operations succeed
2. **Network Disconnected**: Graceful fallback when blockchain unavailable
3. **Contract Errors**: Smart contract call failures handled
4. **Low Balance**: Admin account with insufficient ETH balance
5. **Wrong Network**: Connected to incorrect blockchain network

## Coverage Goals

### Target Coverage Levels
- **Unit Tests**: 90%+ statement coverage
- **Integration Tests**: 80%+ branch coverage
- **Critical Paths**: 100% coverage for authentication flows
- **Error Handling**: 100% coverage for error scenarios

### Key Coverage Areas
1. **Authentication Logic**: All authentication paths tested
2. **Security Validation**: All security constraints verified
3. **Error Handling**: All error conditions covered
4. **Session Management**: Complete session lifecycle tested
5. **Blockchain Integration**: All Web3 operations mocked and tested

## Mock Strategy

### External Dependencies
- **Web3**: Mocked for blockchain operations
- **bcrypt**: Mocked for password hashing
- **JWT**: Mocked for token operations
- **Database**: In-memory or mocked data store
- **Network Requests**: Mocked HTTP calls

### Test Data
- **Valid Private Keys**: Properly formatted test keys
- **Admin Profiles**: Complete admin data structures
- **Request Objects**: Realistic HTTP request mocks
- **Blockchain Responses**: Typical smart contract responses

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Quality Gates
1. **All Tests Pass**: No failing tests allowed
2. **Coverage Threshold**: Minimum 85% overall coverage
3. **No Security Vulnerabilities**: npm audit must pass
4. **Linting**: ESLint rules must pass
5. **Type Checking**: TypeScript compilation must succeed

## Test Maintenance

### Regular Updates
1. **New Feature Tests**: Add tests for new authentication features
2. **Security Updates**: Update tests for new security measures
3. **Dependency Updates**: Update mocks when dependencies change
4. **Performance Tests**: Add tests for performance requirements

### Test Review Process
1. **Code Review**: All test code reviewed before merge
2. **Coverage Review**: Coverage reports reviewed for gaps
3. **Integration Testing**: E2E tests updated for workflow changes
4. **Documentation**: Test documentation kept current

## Troubleshooting

### Common Issues
1. **Mock Failures**: Ensure mocks match actual API signatures
2. **Timeout Issues**: Increase timeout for blockchain operations
3. **Async Handling**: Proper await/async usage in tests
4. **Test Isolation**: Tests should not depend on each other
5. **Environment Variables**: Proper test environment configuration

### Debug Commands
```bash
# Run single test with debug output
npm test -- --testNamePattern="specific test" --verbose

# Run tests with Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Check test coverage details
npm run test:coverage -- --verbose
```

This comprehensive test suite ensures the reliability, security, and maintainability of the wallet-based admin authentication system.