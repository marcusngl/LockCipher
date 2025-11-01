// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {SepoliaZamaOracleAddress} from "@zama-fhe/oracle-solidity/address/ZamaOracleAddress.sol";

/// @title LockCipherVault
/// @notice Allows users to lock ETH with an encrypted numeric password and withdraw upon correct verification.
contract LockCipherVault is SepoliaConfig {
    struct DepositRecord {
        euint32 password;
        uint256 amount;
        bool exists;
    }

    struct PendingWithdrawal {
        address user;
        uint256 amount;
        bool exists;
    }

    mapping(address => DepositRecord) private deposits;
    mapping(uint256 => PendingWithdrawal) private pendingWithdrawals;
    mapping(address => uint256) private activeWithdrawalRequests; // stores requestId + 1 when pending
    bool private entered;

    event DepositCreated(address indexed user, uint256 amount);
    event DepositExtended(address indexed user, uint256 addedAmount, uint256 newTotal);
    event WithdrawalRequested(address indexed user, uint256 indexed requestId, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event WithdrawalDenied(address indexed user, uint256 indexed requestId);

    modifier nonReentrant() {
        require(!entered, "ReentrancyGuard: reentrant call");
        entered = true;
        _;
        entered = false;
    }

    /// @notice Locks ETH with an encrypted numeric password.
    /// @param passwordInput Encrypted password handle provided by the relayer.
    /// @param inputProof Proof associated with the encrypted input.
    function deposit(externalEuint32 passwordInput, bytes calldata inputProof) external payable nonReentrant {
        require(msg.value > 0, "Deposit must be greater than zero");

        DepositRecord storage record = deposits[msg.sender];
        euint32 password = FHE.fromExternal(passwordInput, inputProof);

        require(!record.exists || record.amount == 0, "Active deposit already exists");

        record.exists = true;
        record.password = password;
        record.amount += msg.value;

        FHE.allowThis(record.password);
        FHE.allow(record.password, msg.sender);

        if (record.amount == msg.value) {
            emit DepositCreated(msg.sender, msg.value);
        } else {
            emit DepositExtended(msg.sender, msg.value, record.amount);
        }
    }

    /// @notice Initiates a withdrawal request. The Zama oracle finalizes the withdrawal via callback once the password is verified.
    /// @param passwordInput Encrypted password handle provided by the relayer.
    /// @param inputProof Proof associated with the encrypted input.
    function withdraw(externalEuint32 passwordInput, bytes calldata inputProof) external nonReentrant {
        DepositRecord storage record = deposits[msg.sender];
        require(record.exists && record.amount > 0, "No deposit available");
        require(activeWithdrawalRequests[msg.sender] == 0, "Withdrawal pending");

        euint32 providedPassword = FHE.fromExternal(passwordInput, inputProof);

        FHE.allowThis(record.password);
        FHE.allow(record.password, msg.sender);
        FHE.allowThis(providedPassword);
        FHE.allow(providedPassword, msg.sender);

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(record.password);
        handles[1] = FHE.toBytes32(providedPassword);

        uint256 requestId = FHE.requestDecryption(handles, this.completeWithdrawal.selector);

        pendingWithdrawals[requestId] = PendingWithdrawal({user: msg.sender, amount: record.amount, exists: true});
        activeWithdrawalRequests[msg.sender] = requestId + 1;

        emit WithdrawalRequested(msg.sender, requestId, record.amount);
    }

    /// @notice Callback executed by the Zama decryption oracle once the password comparison has been decrypted.
    /// @return Whether the withdrawal succeeded.
    function completeWithdrawal(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public returns (bool) {
        PendingWithdrawal storage pending = pendingWithdrawals[requestId];
        require(pending.exists, "Unknown request");

        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        (uint32 storedPassword, uint32 providedPassword) = abi.decode(cleartexts, (uint32, uint32));

        address user = pending.user;
        uint256 amount = pending.amount;

        delete pendingWithdrawals[requestId];
        activeWithdrawalRequests[user] = 0;

        if (storedPassword == providedPassword) {
            delete deposits[user];

            (bool success, ) = user.call{value: amount}("");
            require(success, "Transfer failed");

            emit Withdrawal(user, amount);
            return true;
        }

        emit WithdrawalDenied(user, requestId);
        return false;
    }

    /// @notice Returns the deposited amount for a user.
    /// @param user The address to query.
    function getDepositAmount(address user) external view returns (uint256) {
        return deposits[user].amount;
    }

    /// @notice Returns whether a user currently has locked funds.
    /// @param user The address to query.
    function hasActiveDeposit(address user) external view returns (bool) {
        DepositRecord storage record = deposits[user];
        return record.exists && record.amount > 0;
    }

    /// @notice Returns the encrypted password associated with a user deposit.
    /// @param user The address to query.
    function getEncryptedPassword(address user) external view returns (euint32) {
        return deposits[user].password;
    }

    /// @notice Returns information about an active withdrawal request for a user.
    /// @param user The address to query.
    /// @return hasRequest Whether a withdrawal request is pending.
    /// @return requestId The associated request identifier.
    function getActiveWithdrawalRequest(address user) external view returns (bool hasRequest, uint256 requestId) {
        uint256 stored = activeWithdrawalRequests[user];
        if (stored == 0) {
            return (false, 0);
        }
        return (true, stored - 1);
    }
}
