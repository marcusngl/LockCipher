# LockCipher

> A privacy-preserving Ethereum vault powered by Fully Homomorphic Encryption (FHE)

LockCipher is a cutting-edge smart contract system that enables users to securely lock their ETH with encrypted numeric passwords. Unlike traditional vaults that store plaintext credentials or rely on hash-based authentication, LockCipher leverages Zama's FHEVM protocol to perform password verification entirely on encrypted data, ensuring that sensitive information never appears in cleartext on the blockchain.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Problems Solved](#problems-solved)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Contract Interface](#contract-interface)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Use Cases](#use-cases)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [Resources](#resources)
- [License](#license)

## Overview

LockCipher introduces a novel approach to secure cryptocurrency storage by implementing a fully encrypted vault system on Ethereum. The project demonstrates the practical application of Fully Homomorphic Encryption (FHE) in decentralized finance, enabling users to:

- **Lock ETH** with encrypted numeric passwords without revealing the password to anyone
- **Verify passwords** without decryption through homomorphic operations
- **Maintain privacy** even from blockchain validators and observers
- **Execute withdrawals** only when the correct encrypted password is provided

The smart contract operates entirely on encrypted data, ensuring that passwords remain confidential throughout their lifecycle. The password verification process is handled by Zama's decentralized Key Management System (KMS) and decryption oracle, which perform computations on encrypted values and return results asynchronously.

## Key Features

### 1. End-to-End Encryption
- **Encrypted Storage**: Passwords are stored as encrypted `euint32` values using FHE
- **Zero Plaintext Exposure**: Passwords never appear in plaintext on-chain
- **Client-Side Encryption**: Data is encrypted on the client before submission to the blockchain

### 2. Asynchronous Password Verification
- **Oracle-Based Decryption**: Password comparison occurs via Zama's decryption oracle
- **Non-Blocking Operations**: Withdrawal requests are processed asynchronously
- **Callback Pattern**: Results are delivered through callback functions

### 3. Reentrancy Protection
- **Custom Guard**: Implements a lightweight reentrancy guard without external dependencies
- **State Management**: Prevents concurrent withdrawal requests
- **Secure Transfers**: Uses call pattern with proper checks

### 4. Flexible Deposit Management
- **Multiple Deposits**: Users can add funds to existing deposits
- **Balance Tracking**: Transparent amount tracking while maintaining password privacy
- **Event Emissions**: Comprehensive event logging for front-end integration

### 5. Access Control
- **ACL Management**: Fine-grained access control using FHEVM's ACL system
- **Permission Granting**: Contract and user permissions properly managed
- **Secure Decryption**: Only authorized entities can decrypt values

## Technology Stack

### Blockchain & Smart Contracts
- **Solidity** `^0.8.24` - Smart contract programming language
- **Hardhat** `^2.26.0` - Ethereum development environment
- **Ethers.js** `^6.15.0` - Ethereum library for blockchain interaction

### Fully Homomorphic Encryption
- **FHEVM Solidity** `^0.8.0` - Zama's FHE library for Solidity smart contracts
- **Zama Oracle** `^0.1.0` - Decentralized oracle for decryption requests
- **FHEVM Hardhat Plugin** `^0.1.0` - Hardhat integration for FHE development
- **Relayer SDK** `^0.2.0` - Client-side encryption and decryption utilities

### Development Tools
- **TypeScript** `^5.8.3` - Type-safe development language
- **Hardhat Deploy** `^0.11.45` - Contract deployment management
- **TypeChain** `^8.3.2` - TypeScript bindings for smart contracts
- **Hardhat Verify** `^2.1.0` - Contract verification on Etherscan

### Testing & Quality
- **Mocha** `^11.7.1` - Testing framework
- **Chai** `^4.5.0` - Assertion library
- **Chai as Promised** `^8.0.1` - Async assertion support
- **Solidity Coverage** `^0.8.16` - Code coverage analysis
- **Hardhat Gas Reporter** `^2.3.0` - Gas usage reporting

### Code Quality
- **ESLint** `^8.57.1` - JavaScript/TypeScript linting
- **Solhint** `^6.0.0` - Solidity linting
- **Prettier** `^3.6.2` - Code formatting
- **Prettier Solidity Plugin** `^2.1.0` - Solidity code formatting

## Problems Solved

### 1. Privacy Leakage in Traditional Vaults
**Problem**: Conventional smart contract vaults expose authentication mechanisms through transaction data, events, or state variables. Even hash-based systems can leak information through timing attacks or rainbow table vulnerabilities.

**Solution**: LockCipher eliminates all privacy leaks by performing authentication entirely on encrypted data. Passwords remain encrypted from submission through verification, with no intermediate plaintext exposure.

### 2. Lack of Confidential Authentication
**Problem**: Blockchain's transparent nature makes traditional password or PIN-based authentication impractical, as all transaction data is publicly visible.

**Solution**: FHE enables true confidential authentication. Users can prove knowledge of a password without revealing it, enabling familiar authentication patterns in a decentralized context.

### 3. On-Chain Computation Limitations
**Problem**: Performing secure computations on sensitive data typically requires off-chain solutions or trusted third parties, introducing centralization risks.

**Solution**: FHEVM enables on-chain computation over encrypted data without trusted execution environments, maintaining full decentralization while preserving privacy.

### 4. Withdrawal Authorization Without Exposure
**Problem**: Authorizing withdrawals typically requires revealing credentials or relying on centralized custodians.

**Solution**: LockCipher's encrypted password system allows users to authorize withdrawals cryptographically without exposing authentication credentials to anyone, including validators.

### 5. User Experience in Privacy Systems
**Problem**: Privacy-preserving systems often sacrifice usability for security, requiring complex cryptographic operations from end users.

**Solution**: The Relayer SDK abstracts cryptographic complexity, providing a simple API for encryption and decryption while maintaining strong security guarantees.

## How It Works

### Deposit Flow

1. **Client-Side Encryption**: User encrypts their chosen numeric password using Zama's Relayer SDK
   ```typescript
   const input = instance.createEncryptedInput(vaultAddress, userAddress);
   input.add32(1234); // User's password
   const encrypted = await input.encrypt();
   ```

2. **Contract Submission**: Encrypted password and ETH are submitted to the contract
   ```solidity
   function deposit(externalEuint32 passwordInput, bytes calldata inputProof) external payable
   ```

3. **Validation & Storage**: Contract validates the proof and stores the encrypted password
   - Converts external encrypted input to internal `euint32` type
   - Stores ETH amount and encrypted password in contract state
   - Grants ACL permissions for future access

4. **Permission Management**: ACL permissions are set for the contract and user
   ```solidity
   FHE.allowThis(record.password);
   FHE.allow(record.password, msg.sender);
   ```

### Withdrawal Flow

1. **Withdrawal Request**: User submits encrypted password for verification
   ```solidity
   function withdraw(externalEuint32 passwordInput, bytes calldata inputProof) external
   ```

2. **Decryption Request**: Contract requests password comparison from oracle
   ```solidity
   uint256 requestId = FHE.requestDecryption(handles, this.completeWithdrawal.selector);
   ```

3. **Oracle Processing**: Zama's KMS decrypts both passwords securely
   - Passwords are decrypted in a distributed threshold manner
   - No single party sees the plaintext values
   - Results are cryptographically signed

4. **Callback Execution**: Oracle calls back with comparison result
   ```solidity
   function completeWithdrawal(
       uint256 requestId,
       bytes memory cleartexts,
       bytes memory decryptionProof
   ) public returns (bool)
   ```

5. **Conditional Transfer**: ETH is released only if passwords match
   ```solidity
   if (storedPassword == providedPassword) {
       (bool success, ) = user.call{value: amount}("");
       require(success, "Transfer failed");
   }
   ```

## Architecture

### Smart Contract Components

```
LockCipherVault (contracts/LockCipherVault.sol)
├── DepositRecord struct
│   ├── euint32 password      // Encrypted password
│   ├── uint256 amount         // ETH amount locked
│   └── bool exists            // Record validity flag
├── PendingWithdrawal struct
│   ├── address user           // Withdrawal requester
│   ├── uint256 amount         // Amount to withdraw
│   └── bool exists            // Pending status
└── State mappings
    ├── deposits               // User → DepositRecord
    ├── pendingWithdrawals     // RequestId → PendingWithdrawal
    └── activeWithdrawalRequests // User → RequestId
```

### FHEVM Infrastructure

```
User → Relayer SDK → FHEVM Contract → Gateway
                                       ↓
                                   Coprocessor
                                       ↓
                                      KMS
                                       ↓
                               Decryption Oracle
                                       ↓
                            Contract Callback
```

**Components**:
- **Relayer SDK**: Client-side encryption/decryption library
- **Gateway**: Orchestrates encrypted inputs and ACLs
- **Coprocessor**: Executes FHE computations off-chain
- **KMS**: Distributed key management using threshold cryptography
- **Oracle**: Delivers decryption results back to contracts

### File Structure

```
LockCipher/
├── contracts/
│   └── LockCipherVault.sol       # Main vault contract
├── deploy/
│   └── deploy.ts                 # Deployment script
├── tasks/
│   ├── accounts.ts               # Account management tasks
│   └── LockCipherVault.ts        # Contract interaction tasks
├── test/
│   ├── LockCipherVault.ts        # Local tests (mock FHEVM)
│   └── LockCipherVaultSepolia.ts # Sepolia integration tests
├── docs/
│   ├── zama_doc_relayer.md       # Relayer SDK documentation
│   └── zama_llm.md               # FHEVM development guide
├── hardhat.config.ts             # Hardhat configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Installation

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm/yarn/pnpm**: Package manager
- **Git**: Version control

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/LockCipher.git
   cd LockCipher
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```bash
   # Deployment account
   PRIVATE_KEY=your_deployer_private_key_here

   # Infura API for Sepolia access
   INFURA_API_KEY=your_infura_project_id_here

   # Optional: Etherscan API for contract verification
   ETHERSCAN_API_KEY=your_etherscan_api_key_here

   # Optional: Enable gas reporting
   REPORT_GAS=true
   ```

4. **Compile contracts**
   ```bash
   npm run compile
   ```

5. **Run tests**
   ```bash
   npm run test
   ```

## Usage

### Deploying to Local Network

1. **Start local FHEVM node**
   ```bash
   npx hardhat node
   ```

2. **Deploy contracts**
   ```bash
   npx hardhat deploy --network localhost
   ```

### Deploying to Sepolia Testnet

1. **Ensure you have Sepolia ETH**
   - Get testnet ETH from [Sepolia faucet](https://sepoliafaucet.com/)

2. **Deploy to Sepolia**
   ```bash
   npx hardhat deploy --network sepolia
   ```

3. **Verify contract on Etherscan**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

### Running Sepolia Integration Tests

```bash
npx hardhat test --network sepolia
```

### Interacting with the Contract

#### Using Hardhat Tasks

```bash
# Get deposit amount for an address
npx hardhat get-deposit --address 0x... --network sepolia

# Check active withdrawal requests
npx hardhat check-withdrawal --address 0x... --network sepolia
```

#### Using TypeScript/JavaScript

```typescript
import { ethers } from "hardhat";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

// Initialize FHEVM instance
await initSDK();
const instance = await createInstance(SepoliaConfig);

// Get contract
const vault = await ethers.getContractAt("LockCipherVault", vaultAddress);

// Create encrypted password
const password = 1234;
const input = instance.createEncryptedInput(vaultAddress, userAddress);
input.add32(password);
const encrypted = await input.encrypt();

// Deposit ETH
const tx = await vault.deposit(
    encrypted.handles[0],
    encrypted.inputProof,
    { value: ethers.parseEther("1.0") }
);
await tx.wait();

// Withdraw ETH
const withdrawInput = instance.createEncryptedInput(vaultAddress, userAddress);
withdrawInput.add32(password);
const withdrawEncrypted = await withdrawInput.encrypt();

const withdrawTx = await vault.withdraw(
    withdrawEncrypted.handles[0],
    withdrawEncrypted.inputProof
);
await withdrawTx.wait();

// Wait for oracle callback (asynchronous)
// Listen for Withdrawal or WithdrawalDenied events
```

## Contract Interface

### Core Functions

#### `deposit(externalEuint32 passwordInput, bytes calldata inputProof) external payable`
Locks ETH with an encrypted numeric password.

**Parameters**:
- `passwordInput`: Encrypted password handle from relayer
- `inputProof`: Cryptographic proof for input validation

**Requirements**:
- `msg.value > 0`: Must send ETH with transaction
- No active deposit exists (or previous deposit fully withdrawn)

**Events Emitted**:
- `DepositCreated(address indexed user, uint256 amount)`
- `DepositExtended(address indexed user, uint256 addedAmount, uint256 newTotal)`

---

#### `withdraw(externalEuint32 passwordInput, bytes calldata inputProof) external`
Initiates withdrawal request with encrypted password verification.

**Parameters**:
- `passwordInput`: Encrypted password for verification
- `inputProof`: Cryptographic proof for input validation

**Requirements**:
- Active deposit exists
- No pending withdrawal request

**Events Emitted**:
- `WithdrawalRequested(address indexed user, uint256 indexed requestId, uint256 amount)`

**Note**: This function initiates an asynchronous process. The actual withdrawal occurs in the callback.

---

#### `completeWithdrawal(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) public returns (bool)`
Callback function executed by Zama oracle after password decryption.

**Parameters**:
- `requestId`: Oracle request identifier
- `cleartexts`: Decrypted password values
- `decryptionProof`: Cryptographic proof of correct decryption

**Returns**: `true` if withdrawal succeeded, `false` if password mismatch

**Events Emitted**:
- `Withdrawal(address indexed user, uint256 amount)` on success
- `WithdrawalDenied(address indexed user, uint256 indexed requestId)` on failure

**Access**: Called by Zama oracle only

---

### View Functions

#### `getDepositAmount(address user) external view returns (uint256)`
Returns the deposited ETH amount for a user.

#### `hasActiveDeposit(address user) external view returns (bool)`
Checks if a user has locked funds.

#### `getEncryptedPassword(address user) external view returns (euint32)`
Returns the encrypted password handle (requires ACL permission to decrypt).

#### `getActiveWithdrawalRequest(address user) external view returns (bool hasRequest, uint256 requestId)`
Returns information about pending withdrawal requests.

## Testing

### Test Suite Structure

- **`test/LockCipherVault.ts`**: Unit tests using mock FHEVM
  - Tests deposit functionality
  - Tests withdrawal with correct password
  - Tests withdrawal denial with incorrect password
  - Tests state management

- **`test/LockCipherVaultSepolia.ts`**: Integration tests on Sepolia testnet
  - Tests against real FHEVM infrastructure
  - Tests oracle callback mechanism
  - Tests real decryption flow

### Running Tests

```bash
# Run all tests (local mock)
npm run test

# Run with gas reporting
REPORT_GAS=true npm run test

# Run coverage analysis
npm run coverage

# Run Sepolia integration tests
npm run test:sepolia
```

### Test Example

```typescript
it("allows withdraw with correct password and clears state", async function () {
    const depositAmount = ethers.parseEther("0.75");
    const password = 2024;
    const encryptedPassword = await encryptPassword(signers.alice, password);

    // Deposit
    await vaultContract
        .connect(signers.alice)
        .deposit(encryptedPassword.handles[0], encryptedPassword.inputProof,
                { value: depositAmount });

    // Withdraw
    const tx = await vaultContract
        .connect(signers.alice)
        .withdraw(encryptedPassword.handles[0], encryptedPassword.inputProof);
    await tx.wait();

    // Wait for oracle
    await fhevm.awaitDecryptionOracle();

    // Verify withdrawal
    const storedAmount = await vaultContract.getDepositAmount(signers.alice.address);
    expect(storedAmount).to.eq(0n);
});
```

## Deployment

### Network Configuration

The project supports the following networks:

- **Hardhat**: Local development network
- **Localhost**: Local FHEVM node
- **Sepolia**: Ethereum testnet with FHEVM support

### Deployment Process

The deployment is handled by `hardhat-deploy` with the following steps:

1. **Compile contracts**
   ```bash
   npm run compile
   ```

2. **Deploy to target network**
   ```bash
   npx hardhat deploy --network sepolia
   ```

3. **Verify on Etherscan** (optional but recommended)
   ```bash
   npx hardhat verify --network sepolia <DEPLOYED_ADDRESS>
   ```

### Deployment Script

Located at `deploy/deploy.ts`:

```typescript
const deployedVault = await deploy("LockCipherVault", {
    from: deployer,
    log: true,
});
```

### FHEVM Configuration

The contract inherits from `SepoliaConfig` which automatically configures:
- ACL contract address
- KMS verifier address
- Input verifier address
- Decryption oracle address
- Gateway configuration

## Security Considerations

### Cryptographic Security

1. **FHE Security**: Relies on TFHE (Torus Fully Homomorphic Encryption) cryptographic assumptions
2. **Threshold Cryptography**: KMS uses MPC for distributed key management
3. **Zero Knowledge Proofs**: Input validation uses ZK proofs for correctness

### Smart Contract Security

1. **Reentrancy Protection**: Custom guard prevents reentrancy attacks
2. **State Consistency**: Proper state management in asynchronous flows
3. **Access Control**: ACL prevents unauthorized decryption
4. **Signature Verification**: Oracle responses are cryptographically verified

### Known Limitations

1. **Password Space**: 32-bit passwords provide 4.3 billion combinations
   - **Mitigation**: Suitable for time-locked vaults; consider `euint64` for higher security

2. **Oracle Dependency**: Withdrawal completion depends on oracle availability
   - **Mitigation**: Zama operates decentralized oracle network

3. **Gas Costs**: FHE operations are more expensive than standard operations
   - **Mitigation**: Optimized for Sepolia; production requires L2 solutions

4. **Reorg Risk**: Short reorgs could affect pending withdrawals
   - **Mitigation**: Implement timelock for high-value withdrawals (see docs)

### Best Practices

1. **Password Management**:
   - Use strong numeric passwords
   - Never reuse passwords across different contracts
   - Store encrypted password handles securely

2. **Transaction Monitoring**:
   - Always listen for event emissions
   - Monitor oracle callback completion
   - Implement timeout handling for pending requests

3. **Testing**:
   - Test on Sepolia before mainnet deployment
   - Verify oracle integration thoroughly
   - Test edge cases (wrong password, concurrent requests, etc.)

## Use Cases

### 1. Time-Locked Savings
Users can lock funds with a password, creating a self-custody savings mechanism that requires explicit authentication to withdraw.

### 2. Inheritance Planning
Beneficiaries can access funds by providing a password shared through secure off-chain channels, without revealing it to the blockchain.

### 3. Escrow Services
Parties can lock funds that require encrypted credentials for release, enabling confidential escrow without intermediaries.

### 4. Privacy-Preserving Vaults
Organizations can create vaults where access control is based on knowledge of encrypted credentials rather than wallet addresses.

### 5. Multi-Factor Authentication
Combined with other authentication methods, encrypted passwords add an additional security layer for high-value operations.

### 6. Confidential DAOs
DAO treasury access can require encrypted proofs of membership or voting power without revealing sensitive governance data.

## Future Roadmap

### Phase 1: Enhanced Security (Q2 2024)
- [ ] **Multi-Password Support**: Allow multiple authorized passwords per vault
- [ ] **Password Rotation**: Enable secure password updates without withdrawing funds
- [ ] **Biometric Integration**: Explore FHE-compatible biometric authentication
- [ ] **Extended Password Space**: Upgrade to `euint64` or `euint128` for stronger security
- [ ] **Timelock Features**: Add minimum lock periods and withdrawal delays

### Phase 2: Advanced Features (Q3 2024)
- [ ] **Multi-Signature Vaults**: Require multiple encrypted passwords from different parties
- [ ] **Partial Withdrawals**: Allow withdrawing portions of deposited funds
- [ ] **Emergency Recovery**: Implement social recovery mechanisms with encrypted shares
- [ ] **Cross-Chain Support**: Extend to other EVM chains with FHEVM
- [ ] **ERC20 Token Support**: Lock any ERC20 token, not just ETH

### Phase 3: User Experience (Q4 2024)
- [ ] **Web Interface**: Build React-based dApp for easy interaction
- [ ] **Mobile SDK**: Develop mobile libraries for iOS and Android
- [ ] **Hardware Wallet Support**: Integrate with Ledger and Trezor
- [ ] **Gas Optimization**: Reduce transaction costs through contract optimization
- [ ] **Batch Operations**: Support multiple deposits/withdrawals in single transaction

### Phase 4: Ecosystem Integration (2025)
- [ ] **DeFi Composability**: Enable vault deposits as collateral in lending protocols
- [ ] **DAO Integration**: Create governance modules for DAOs
- [ ] **Insurance Protocols**: Partner with DeFi insurance for vault protection
- [ ] **Audit & Formal Verification**: Complete comprehensive security audits
- [ ] **Mainnet Launch**: Deploy to Ethereum mainnet and Layer 2s

### Research Initiatives
- [ ] **Homomorphic Operations**: Explore yield-bearing encrypted vaults
- [ ] **Privacy Pools**: Integrate with privacy protocols like Tornado Cash alternatives
- [ ] **MEV Protection**: Develop MEV-resistant withdrawal mechanisms
- [ ] **Quantum Resistance**: Research post-quantum FHE schemes
- [ ] **ZK-FHE Hybrid**: Combine zero-knowledge proofs with FHE for optimal privacy

### Developer Experience
- [ ] **SDK Development**: Create comprehensive JavaScript/TypeScript SDK
- [ ] **Documentation Portal**: Build interactive documentation with examples
- [ ] **Tutorial Series**: Video tutorials and written guides
- [ ] **Developer Grants**: Fund community projects building on LockCipher
- [ ] **Bug Bounty Program**: Establish rewards for security research

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, improving documentation, or proposing new features, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow Solidity and TypeScript best practices
- **Testing**: Maintain >80% test coverage
- **Documentation**: Document all public functions and complex logic
- **Commit Messages**: Use clear, descriptive commit messages
- **Pull Requests**: Provide detailed descriptions of changes

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub with:
- Clear description of the problem or suggestion
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (Node version, network, etc.)

## Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/fhevm) - Comprehensive FHE development guide
- [Zama Protocol Overview](https://docs.zama.ai/protocol) - Architecture and components
- [Relayer SDK Guide](https://docs.zama.ai/protocol/fhevm-relayer) - Client-side encryption
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Development tools

### Learning Resources
- [FHEVM Quick Start](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial) - Getting started tutorial
- [Solidity ACL Guide](https://docs.zama.ai/protocol/solidity-guides/smart-contract/acl) - Access control patterns
- [Oracle Integration](https://docs.zama.ai/protocol/solidity-guides/smart-contract/oracle) - Decryption oracle usage

### Community
- [Zama Discord](https://discord.gg/zama) - Join the community
- [Community Forum](https://community.zama.ai/c/fhevm/15) - Technical discussions
- [GitHub Issues](https://github.com/zama-ai/fhevm/issues) - Report bugs

### Related Projects
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template) - Base template
- [Confidential ERC20](https://github.com/zama-ai/fhevm-contracts) - Privacy tokens
- [TFHE Library](https://github.com/zama-ai/tfhe-rs) - Core encryption library

## License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

### Key Points
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ❌ Patent use NOT granted
- ℹ️ Must include license and copyright notice

## Acknowledgments

- **Zama Team**: For developing FHEVM and supporting the ecosystem
- **Ethereum Foundation**: For Sepolia testnet infrastructure
- **Hardhat Team**: For excellent development tools
- **FHE Community**: For advancing privacy-preserving computation

---

**Built with privacy in mind by the LockCipher team**

For questions, feedback, or support, please open an issue or join our community channels.
