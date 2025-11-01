import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the LockCipherVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const vault = await deployments.get("LockCipherVault");

  console.log("LockCipherVault address is " + vault.address);
});

task("task:lock", "Locks ETH with an encrypted password")
  .addParam("password", "Numeric password to encrypt")
  .addParam("amount", "Amount of ETH to lock")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const password = parseInt(taskArguments.password, 10);
    if (!Number.isInteger(password) || password < 0) {
      throw new Error("Password must be a non-negative integer");
    }

    const amountWei = ethers.parseEther(taskArguments.amount);
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("LockCipherVault");
    console.log(`LockCipherVault: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const vaultContract = await ethers.getContractAt("LockCipherVault", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(password)
      .encrypt();

    const tx = await vaultContract
      .connect(signer)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof, { value: amountWei });
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const lockedBalance = await vaultContract.getDepositAmount(signer.address);
    console.log(`Locked balance: ${ethers.formatEther(lockedBalance)} ETH`);
  });

task("task:unlock", "Withdraws locked ETH with the correct password")
  .addParam("password", "Numeric password to verify")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const password = parseInt(taskArguments.password, 10);
    if (!Number.isInteger(password) || password < 0) {
      throw new Error("Password must be a non-negative integer");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("LockCipherVault");
    console.log(`LockCipherVault: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const vaultContract = await ethers.getContractAt("LockCipherVault", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(password)
      .encrypt();

    const tx = await vaultContract
      .connect(signer)
      .withdraw(encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log("Awaiting oracle confirmation...");
    await fhevm.awaitDecryptionOracle();

    const remainingBalance = await vaultContract.getDepositAmount(signer.address);
    console.log(`Locked balance after attempt: ${ethers.formatEther(remainingBalance)} ETH`);
  });

task("task:decrypt-password", "Decrypts the stored password for the first signer")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("LockCipherVault");
    console.log(`LockCipherVault: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const vaultContract = await ethers.getContractAt("LockCipherVault", deployment.address);

    const encryptedPassword = await vaultContract.getEncryptedPassword(signer.address);
    if (encryptedPassword === ethers.ZeroHash) {
      console.log("No password stored for signer");
      return;
    }

    const clearPassword = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPassword,
      deployment.address,
      signer,
    );

    console.log(`Decrypted password: ${clearPassword}`);
  });

task("task:balance", "Prints the locked balance for the first signer")
  .addOptionalParam("address", "Override the deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("LockCipherVault");
    console.log(`LockCipherVault: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const vaultContract = await ethers.getContractAt("LockCipherVault", deployment.address);

    const balance = await vaultContract.getDepositAmount(signer.address);
    console.log(`Locked balance: ${ethers.formatEther(balance)} ETH`);
  });
