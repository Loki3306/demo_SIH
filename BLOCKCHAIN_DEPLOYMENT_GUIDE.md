# Tourist Digital ID: Blockchain Migration Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying and operating the Tourist Digital ID system with real Ganache blockchain integration, migrated from the mock blockchain implementation.

## Prerequisites

### Software Requirements
- **Node.js**: Version 18+ 
- **npm/pnpm**: Latest version
- **Ganache GUI**: Download from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
- **Git**: For version control

### Hardware Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 5GB free space
- **Network**: Stable internet connection for dependencies

## Quick Start

### 1. Environment Setup

```bash
# Install dependencies
pnpm install

# Setup blockchain environment
pnpm blockchain:setup
```

### 2. Ganache Configuration

1. **Install and Launch Ganache GUI**
   - Download from Trufflesuite website
   - Create new workspace or use Quickstart
   - Ensure server settings:
     - Server: HTTP://127.0.0.1:7545
     - Network ID: 5777
     - Chain ID: 1337
     - Gas Limit: 6721975

2. **Get Admin Private Key**
   - In Ganache GUI, click key icon next to Account 0
   - Copy the private key
   - Update `blockchain/.env.blockchain`:
     ```
     ADMIN_PRIVATE_KEY=0x[your_private_key_here]
     ```

### 3. Blockchain Deployment

```bash
# Test Ganache connection
pnpm blockchain:connection-test

# Deploy smart contracts
pnpm blockchain:deploy

# Migrate existing data from mock to real blockchain
pnpm blockchain:migrate

# Verify deployment
pnpm blockchain:verify
```

### 4. Start Services

```bash
# Start all services with real blockchain
pnpm start:all:blockchain
```

## Detailed Deployment Steps

### Phase 1: Environment Preparation

#### Step 1.1: Install Dependencies
```bash
# Root project dependencies
pnpm install

# Blockchain-specific dependencies
cd blockchain
npm install
cd ..
```

#### Step 1.2: Environment Configuration
1. Configure main environment:
   ```bash
   # Edit .env file
   BLOCKCHAIN_MODE=ganache
   BLOCKCHAIN_API_URL=http://localhost:5002
   HEALTH_CHECK_ENABLED=true
   FALLBACK_MODE_ENABLED=true
   ```

2. Configure blockchain environment:
   ```bash
   # Edit blockchain/.env.blockchain
   GANACHE_URL=http://127.0.0.1:7545
   CONTRACT_ADDRESS=  # Auto-populated after deployment
   ADMIN_PRIVATE_KEY=  # Set from Ganache Account 0
   BLOCKCHAIN_MODE=ganache
   SERVICE_PORT=5002
   ```

### Phase 2: Ganache Setup

#### Step 2.1: Ganache GUI Installation
1. Download Ganache GUI from official website
2. Install and launch the application
3. Create new workspace:
   - Choose "Ethereum" blockchain
   - Set workspace name: "Tourist-Digital-ID"

#### Step 2.2: Network Configuration
Ensure Ganache settings match required configuration:
- **Server Tab**:
  - Hostname: 127.0.0.1
  - Port Number: 7545
  - Network ID: 5777
- **Accounts & Keys Tab**:
  - Account Default Balance: 100 ETH
  - Total Accounts to Generate: 10
- **Chain Tab**:
  - Gas Limit: 6721975
  - Gas Price: 20000000000 (20 Gwei)

#### Step 2.3: Connection Verification
```bash
# Test connection to Ganache
pnpm blockchain:connection-test

# Expected output:
# ✅ Connected to Ganache successfully
# 📊 Network ID: 5777
# 🔗 Chain ID: 1337
# 👥 Available accounts: 10
```

### Phase 3: Smart Contract Deployment

#### Step 3.1: Contract Compilation
```bash
# Compile smart contracts
cd blockchain
npx hardhat compile

# Verify compilation
ls artifacts/contracts/TouristDigitalID.sol/
```

#### Step 3.2: Contract Deployment
```bash
# Deploy to Ganache network
npx hardhat run scripts/deploy.js --network ganache

# Expected output:
# ✅ TouristDigitalID deployed to: 0x[contract_address]
# 👑 Contract owner: 0x[deployer_address]
# 📊 Total IDs: 0, Active IDs: 0
```

#### Step 3.3: Deployment Verification
```bash
# Verify contract deployment
npx hardhat run scripts/verify-deployment.js --network ganache

# Check deployment files
cat deployment.json
cat .env.blockchain  # Should now contain CONTRACT_ADDRESS
```

### Phase 4: Data Migration

#### Step 4.1: Pre-Migration Check
```bash
# Review tourists to be migrated
cat ../seed_data/tourists.json | grep -A5 -B5 "verified"
```

#### Step 4.2: Execute Migration
```bash
# Migrate verified tourists from mock to real blockchain
npx hardhat run scripts/migrate-from-mock.js --network ganache

# Expected output:
# 🔄 Found X tourists with mock blockchain IDs to migrate
# ✅ Successfully migrated: X tourists
# 📋 Migration report saved to migration-report.json
```

#### Step 4.3: Migration Verification
```bash
# Verify migrated data
cat migration-report.json

# Test verification of migrated IDs
cd ..
curl "http://localhost:5002/verifyID?blockchainId=2"
```

### Phase 5: Service Startup

#### Step 5.1: Start Blockchain Service
```bash
# Start real blockchain service
pnpm dev:blockchain:real

# Service should start on port 5002
# Health check: http://localhost:5002/health
```

#### Step 5.2: Start Complete Application
```bash
# Start all services (frontend, blockchain, AI/ML)
pnpm start:all:blockchain

# Services will be available at:
# - Frontend: http://localhost:5173
# - Blockchain API: http://localhost:5002
# - AI/ML API: http://localhost:5003
```

## Operational Commands

### Service Management
```bash
# Start individual services
pnpm dev                      # Frontend only
pnpm dev:blockchain:real      # Real blockchain service
pnpm dev:aiml                 # AI/ML service

# Start all services
pnpm start:all:blockchain     # All with real blockchain
pnpm start:all                # All with mock blockchain
```

### Blockchain Operations
```bash
# Health checks
pnpm blockchain:health        # Check blockchain service health
pnpm blockchain:connection-test  # Test Ganache connection

# Development operations
pnpm blockchain:clean         # Clean compiled contracts
pnpm blockchain:test          # Run smart contract tests
pnpm blockchain:verify        # Verify contract deployment

# Migration operations
pnpm migration:full           # Full deployment + migration + verification
```

### Monitoring and Debugging
```bash
# Check service status
curl http://localhost:5002/health
curl http://localhost:5173/api/ping

# View blockchain service logs
cd blockchain && npm start  # View real-time logs

# Check contract on Ganache
# Open Ganache GUI → Contracts tab → View deployed contracts
```

## Troubleshooting

### Common Issues

#### 1. Ganache Connection Failed
**Symptoms**: Connection timeout, ECONNREFUSED errors
**Solutions**:
- Ensure Ganache GUI is running
- Verify network settings (127.0.0.1:7545)
- Check firewall settings
- Restart Ganache workspace

#### 2. Contract Deployment Failed
**Symptoms**: Deployment script errors, insufficient gas
**Solutions**:
- Check Account 0 has sufficient ETH (>1 ETH)
- Verify ADMIN_PRIVATE_KEY is correctly set
- Ensure contract compiles without errors
- Check Ganache gas settings

#### 3. Migration Errors
**Symptoms**: Migration script fails, tourists not migrated
**Solutions**:
- Verify contract is deployed and accessible
- Check tourist data format in seed_data/tourists.json
- Ensure deployer account has gas for transactions
- Review migration-report.json for specific errors

#### 4. Service Fallback Mode
**Symptoms**: Services returning "fallback: true" responses
**Solutions**:
- Check ADMIN_PRIVATE_KEY is set in blockchain/.env.blockchain
- Verify blockchain service is running and healthy
- Test blockchain connection with connection-test script
- Review blockchain service logs for errors

### Error Codes and Solutions

| Error Code | Description | Solution |
|------------|-------------|----------|
| `CONNECTION_REFUSED` | Cannot connect to Ganache | Start Ganache GUI, check network settings |
| `CONTRACT_NOT_FOUND` | Smart contract not deployed | Run deployment script |
| `ADMIN_KEY_MISSING` | Admin private key not configured | Set ADMIN_PRIVATE_KEY in .env.blockchain |
| `INSUFFICIENT_GAS` | Transaction gas too low | Check account balance, increase gas limit |
| `MIGRATION_FAILED` | Data migration errors | Review tourist data format, check contract access |

### Logs and Debugging

#### Blockchain Service Logs
```bash
# Start with debug output
cd blockchain
DEBUG=* npm start

# Check health endpoint
curl -v http://localhost:5002/health
```

#### Contract Interaction Logs
```bash
# Test contract calls
cd blockchain
node -e "
const hre = require('hardhat');
hre.ethers.getContractAt('TouristDigitalID', '0x[contract_address]')
  .then(contract => contract.getContractStats())
  .then(stats => console.log('Stats:', stats));
"
```

## Production Considerations

### Security
- **Private Keys**: Use secure key management for production
- **Network Security**: Configure proper firewall rules
- **Access Control**: Implement proper authentication for admin endpoints
- **HTTPS**: Use SSL/TLS for production deployments

### Scalability
- **Database**: Consider external database for tourist data
- **Load Balancing**: Implement load balancing for high traffic
- **Caching**: Add Redis/Memcached for performance
- **Monitoring**: Implement comprehensive monitoring and alerting

### Backup and Recovery
- **Smart Contract**: Maintain contract source code and deployment records
- **Tourist Data**: Regular backups of tourist database
- **Environment Config**: Secure backup of environment configurations
- **Blockchain Data**: Ganache data persistence configuration

## Support and Maintenance

### Regular Tasks
- **Health Monitoring**: Daily health checks of all services
- **Log Review**: Weekly review of error logs and performance metrics
- **Backup Verification**: Monthly backup restore testing
- **Security Updates**: Regular updates of dependencies and tools

### Monitoring Endpoints
- **Application Health**: `GET /api/ping`
- **Blockchain Health**: `GET /api/bridge/blockchain/health`
- **Service Status**: Individual service endpoints for health checks

### Contact Information
For technical support and maintenance:
- **Development Team**: [Contact information]
- **Infrastructure Team**: [Contact information]
- **Emergency Contact**: [24/7 support information]

---

**Last Updated**: September 2025  
**Version**: 1.0.0  
**Documentation**: Complete deployment and operational guide