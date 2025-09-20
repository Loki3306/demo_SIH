# Tourist Digital ID Blockchain System

A comprehensive blockchain implementation for creating and managing digital IDs for tourists using Ganache GUI and Hardhat. This system provides seamless integration with the existing Express backend while maintaining backward compatibility with the mock service.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- [Ganache GUI](https://trufflesuite.com/ganache/) installed and running
- Git

### One-Command Setup

```bash
# From the blockchain directory
node scripts/setup.js
```

This interactive setup script will guide you through:
1. Installing dependencies
2. Configuring Ganache connection
3. Setting up environment variables
4. Deploying smart contracts
5. Creating seed data
6. Running tests

### Manual Setup

If you prefer manual setup:

```bash
# 1. Install dependencies
npm install

# 2. Copy Account 0 private key from Ganache to .env.blockchain
# ADMIN_PRIVATE_KEY=0x...

# 3. Compile contracts
npx hardhat compile

# 4. Deploy to Ganache
npx hardhat run scripts/deploy.js --network ganache

# 5. Create seed data
npx hardhat run scripts/seed-data.js --network ganache

# 6. Start blockchain service
npm start
```

## 🏗️ Architecture

### Smart Contract: TouristDigitalID.sol

The core smart contract manages digital tourist IDs with the following features:

- **Digital ID Creation**: Authorized authorities can create unique digital IDs
- **Verification**: Public verification of ID validity and status
- **Status Management**: Suspend, renew, or revoke IDs
- **Authority Management**: Multi-authority support with role-based access
- **Development Helpers**: Batch operations and reset functions

### Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Express Backend │    │ Blockchain Service │    │   Ganache GUI   │
│                 │────▶│                  │────▶│                 │
│ /api/admin/     │    │ /createID        │    │ Smart Contract  │
│ approve/:userId │    │ /verifyID        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │
        │                       ▼
        │              ┌──────────────────┐
        └──────────────▶│  Fallback Mode  │
                       │  (Mock Service)  │
                       └──────────────────┘
```

## 📡 API Endpoints

### Blockchain Service Endpoints

#### POST /createID
Creates a new digital ID for a tourist.

**Request:**
```json
{
  "userId": "t123",
  "name": "Alice Kumar",
  "documentType": "passport",
  "documentNumber": "P123456789",
  "kycHash": "sha256:...",
  "validUntil": "2025-09-20T00:00:00Z"
}
```

**Response:**
```json
{
  "blockchainId": "1",
  "qr": "data:image/png;base64,...",
  "status": "created",
  "expiresAt": "2025-09-20T00:00:00Z",
  "onChain": true,
  "transactionHash": "0x1234...",
  "verificationLevel": 4
}
```

#### GET /verifyID?blockchainId=1
Verifies the validity of a digital ID.

**Response:**
```json
{
  "blockchainId": "1",
  "userId": "t123",
  "name": "Alice Kumar",
  "valid": true,
  "status": "Active",
  "issuedAt": "2025-09-15T00:00:00Z",
  "expiresAt": "2025-09-20T00:00:00Z",
  "verificationLevel": 4,
  "authorityAddress": "0x...",
  "onChain": true
}
```

#### GET /health
Service health check and blockchain connectivity status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-15T10:00:00Z",
  "blockchain": {
    "connected": true,
    "contractAddress": "0x...",
    "totalIDs": 5,
    "activeIDs": 4
  }
}
```

### Enhanced Express Backend Endpoints

#### GET /api/bridge/blockchain/health
Proxies to blockchain service health check.

#### GET /api/tourists/:id/verification
Enhanced tourist verification with blockchain status.

## 🔧 Configuration

### Environment Variables

#### .env.blockchain (Blockchain Service)
```env
# Ganache connection
ADMIN_PRIVATE_KEY=0x...  # Account 0 private key from Ganache
GANACHE_URL=http://127.0.0.1:7545
NETWORK_ID=5777

# Contract deployment
CONTRACT_ADDRESS=0x...   # Auto-populated after deployment

# Service configuration
BLOCKCHAIN_MODE=ganache
SERVICE_PORT=5002
```

#### .env (Main Project)
```env
# Blockchain mode switching
BLOCKCHAIN_MODE=ganache          # Options: mock | ganache
BLOCKCHAIN_API_URL=http://localhost:5002

# Other services
AIML_API_URL=http://localhost:5003
```

### Ganache GUI Configuration

**Required Settings:**
- Server: HTTP://127.0.0.1:7545
- Network ID: 5777
- Chain ID: 1337
- Gas Limit: 6721975
- Gas Price: 20000000000 (20 Gwei)

**Account Setup:**
- Account 0: Admin Authority (contract deployment)
- Accounts 1-3: Additional authorities (testing)
- Accounts 4-9: Tourist accounts (testing)

## 📚 Development Scripts

### Blockchain Scripts
```bash
# Smart contract development
npm run compile          # Compile contracts
npm run deploy           # Deploy to Ganache
npm run test             # Run contract tests
npm run clean            # Clean artifacts

# Data management
npm run seed             # Create seed data
npm run migrate          # Migrate from mock to real blockchain

# Service management
npm start                # Start blockchain service
npm run dev              # Start with auto-reload
```

### Project Root Scripts
```bash
# Development environment setup
pnpm blockchain:setup           # Setup blockchain environment
pnpm blockchain:deploy          # Deploy contracts
pnpm blockchain:seed            # Create seed data
pnpm blockchain:test            # Run tests

# Service management
pnpm dev:blockchain:real        # Start real blockchain service
pnpm start:all:blockchain       # Start all services with blockchain

# Legacy mock service
pnpm dev:blockchain             # Start mock service
pnpm start:all                  # Start all services with mock
```

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all smart contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/TouristDigitalID.test.js

# Run with gas reporting
GAS_REPORTER=true npx hardhat test
```

### Integration Tests
```bash
# Run integration tests (requires running service)
npx hardhat test test/integration.test.js
```

### Manual Testing

1. **Health Check:**
   ```bash
   curl http://localhost:5002/health
   ```

2. **Create Digital ID:**
   ```bash
   curl -X POST http://localhost:5002/createID \
     -H "Content-Type: application/json" \
     -d '{"userId": "test123", "name": "Test User"}'
   ```

3. **Verify Digital ID:**
   ```bash
   curl "http://localhost:5002/verifyID?blockchainId=1"
   ```

## 🔄 Fallback System

The system includes robust fallback mechanisms:

### Automatic Fallback
- When Ganache is unavailable, the service automatically returns mock responses
- All API endpoints remain functional
- Express backend gracefully handles blockchain service failures

### Manual Fallback
Switch to mock mode by updating `.env`:
```env
BLOCKCHAIN_MODE=mock
```

### Fallback Response Indicators
```json
{
  "blockchainId": "mock_1234567890",
  "onChain": false,
  "fallback": true,
  "error": "blockchain_unavailable"
}
```

## 🚀 Deployment Workflow

### Development Deployment
1. Start Ganache GUI
2. Run setup script: `node scripts/setup.js`
3. Start services: `pnpm start:all:blockchain`
4. Test integration via website

### Migration from Mock
If you have existing data with mock blockchain IDs:
```bash
npx hardhat run scripts/migrate-from-mock.js --network ganache
```

### Production Considerations
- Replace Ganache with a proper blockchain network
- Update RPC URLs and network configuration
- Implement proper key management
- Add monitoring and alerting
- Consider gas optimization

## 🔍 Monitoring and Debugging

### Service Logs
The blockchain service provides detailed logs:
```bash
# Start with verbose logging
DEBUG=* npm start
```

### Health Monitoring
- Service health: `GET /health`
- Contract stats: Available in health response
- Network connectivity: Monitored automatically

### Common Issues

**Contract Deployment Fails:**
- Check Ganache is running
- Verify private key is correct
- Ensure Account 0 has sufficient ETH

**Service Connection Errors:**
- Verify Ganache URL and port
- Check firewall settings
- Confirm contract address is set

**Transaction Failures:**
- Check gas limits
- Verify account permissions
- Review contract state

## 📊 Performance

### Gas Costs (Approximate)
- Deploy Contract: ~2,500,000 gas
- Create Digital ID: ~200,000 gas
- Verify Digital ID: ~30,000 gas (read-only)
- Update Status: ~50,000 gas

### Scaling Considerations
- Contract supports unlimited digital IDs
- Authority management allows distributed creation
- Read operations are highly optimized
- Batch operations available for bulk processing

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Set up development environment
3. Make changes and test thoroughly
4. Submit pull request

### Code Style
- Solidity: Follow standard conventions
- JavaScript: Use ESLint configuration
- Documentation: Update README for new features

### Testing Requirements
- All smart contract functions must have tests
- Integration tests for API endpoints
- Fallback behavior verification

## 📄 License

This project is part of the SIH Tourist Safety Monitoring System and follows the same licensing terms as the main project.

---

**For support and questions, please refer to the main project documentation or create an issue in the repository.**
