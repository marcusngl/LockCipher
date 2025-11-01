import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { LockCipherVault } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("LockCipherVaultSepolia", function () {
  let signer: Signers;
  let vaultContract: LockCipherVault;
  let vaultAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const deployment = await deployments.get("LockCipherVault");
      vaultAddress = deployment.address;
      vaultContract = await ethers.getContractAt("LockCipherVault", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signer = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("locks and unlocks funds with password", async function () {
    steps = 13;

    this.timeout(6 * 40000);

    const depositAmount = ethers.parseEther("0.0001");
    const passwordValue = 4242;

    progress("Encrypting password");
    const encryptedPassword = await fhevm
      .createEncryptedInput(vaultAddress, signer.alice.address)
      .add32(passwordValue)
      .encrypt();

    progress("Sending deposit transaction");
    let tx = await vaultContract
      .connect(signer.alice)
      .deposit(encryptedPassword.handles[0], encryptedPassword.inputProof, { value: depositAmount });
    await tx.wait();

    progress("Reading deposit amount");
    const storedAmount = await vaultContract.getDepositAmount(signer.alice.address);
    expect(storedAmount).to.not.eq(0n);

    progress("Confirming active deposit");
    const hasDeposit = await vaultContract.hasActiveDeposit(signer.alice.address);
    expect(hasDeposit).to.be.true;

    progress("Fetching encrypted password");
    const storedPassword = await vaultContract.getEncryptedPassword(signer.alice.address);
    expect(storedPassword).to.not.eq(ethers.ZeroHash);

    progress("Decrypting stored password");
    const clearPassword = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      storedPassword,
      vaultAddress,
      signer.alice,
    );
    expect(clearPassword).to.eq(passwordValue);

    progress("Submitting withdraw transaction");
    tx = await vaultContract
      .connect(signer.alice)
      .withdraw(encryptedPassword.handles[0], encryptedPassword.inputProof);
    await tx.wait();

    progress("Waiting for oracle confirmation");
    await fhevm.awaitDecryptionOracle();

    progress("Checking deposit cleared");
    const clearedAmount = await vaultContract.getDepositAmount(signer.alice.address);
    expect(clearedAmount).to.eq(0n);

    progress("Confirming inactive deposit");
    const stillHasDeposit = await vaultContract.hasActiveDeposit(signer.alice.address);
    expect(stillHasDeposit).to.be.false;

    progress("Verifying password reset");
    const resetPassword = await vaultContract.getEncryptedPassword(signer.alice.address);
    expect(resetPassword).to.eq(ethers.ZeroHash);
  });
});
