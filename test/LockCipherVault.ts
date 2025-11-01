import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { LockCipherVault, LockCipherVault__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("LockCipherVault")) as LockCipherVault__factory;
  const vaultContract = (await factory.deploy()) as LockCipherVault;
  const vaultAddress = await vaultContract.getAddress();

  return { vaultContract, vaultAddress };
}

describe("LockCipherVault", function () {
  let signers: Signers;
  let vaultContract: LockCipherVault;
  let vaultAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ vaultContract, vaultAddress } = await deployFixture());
  });

  async function encryptPassword(user: HardhatEthersSigner, password: number) {
    return fhevm
      .createEncryptedInput(vaultAddress, user.address)
      .add32(password)
      .encrypt();
  }

  it("initially has no deposits", async function () {
    const amount = await vaultContract.getDepositAmount(signers.alice.address);
    expect(amount).to.eq(0n);

    const hasDeposit = await vaultContract.hasActiveDeposit(signers.alice.address);
    expect(hasDeposit).to.be.false;
  });

  it("locks funds and stores encrypted password", async function () {
    const depositAmount = ethers.parseEther("1");
    const password = 1234;
    const encrypted = await encryptPassword(signers.alice, password);

    await vaultContract
      .connect(signers.alice)
      .deposit(encrypted.handles[0], encrypted.inputProof, { value: depositAmount });

    await expect(
      vaultContract
        .connect(signers.alice)
        .deposit(encrypted.handles[0], encrypted.inputProof, { value: ethers.parseEther("0.1") }),
    ).to.be.revertedWith("Active deposit already exists");

    const storedAmount = await vaultContract.getDepositAmount(signers.alice.address);
    expect(storedAmount).to.eq(depositAmount);

    const hasDeposit = await vaultContract.hasActiveDeposit(signers.alice.address);
    expect(hasDeposit).to.be.true;

    const encryptedPassword = await vaultContract.getEncryptedPassword(signers.alice.address);
    expect(encryptedPassword).to.not.eq(ethers.ZeroHash);

    const clearPassword = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPassword,
      vaultAddress,
      signers.alice,
    );

    expect(clearPassword).to.eq(password);
  });

  it("reverts withdraw with incorrect password", async function () {
    const depositAmount = ethers.parseEther("0.5");
    const storedPassword = 9999;
    const encryptedStored = await encryptPassword(signers.alice, storedPassword);

    await vaultContract
      .connect(signers.alice)
      .deposit(encryptedStored.handles[0], encryptedStored.inputProof, { value: depositAmount });

    const wrongPassword = await encryptPassword(signers.alice, 1000);

    const tx = await vaultContract.connect(signers.alice).withdraw(wrongPassword.handles[0], wrongPassword.inputProof);
    await tx.wait();

    await fhevm.awaitDecryptionOracle();

    const storedAmount = await vaultContract.getDepositAmount(signers.alice.address);
    expect(storedAmount).to.eq(depositAmount);

    const hasDeposit = await vaultContract.hasActiveDeposit(signers.alice.address);
    expect(hasDeposit).to.be.true;
  });

  it("allows withdraw with correct password and clears state", async function () {
    const depositAmount = ethers.parseEther("0.75");
    const password = 2024;
    const encryptedStored = await encryptPassword(signers.alice, password);

    await vaultContract
      .connect(signers.alice)
      .deposit(encryptedStored.handles[0], encryptedStored.inputProof, { value: depositAmount });

    const tx = await vaultContract
      .connect(signers.alice)
      .withdraw(encryptedStored.handles[0], encryptedStored.inputProof);
    await tx.wait();

    await fhevm.awaitDecryptionOracle();

    const storedAmount = await vaultContract.getDepositAmount(signers.alice.address);
    expect(storedAmount).to.eq(0n);

    const hasDeposit = await vaultContract.hasActiveDeposit(signers.alice.address);
    expect(hasDeposit).to.be.false;

    const encryptedPassword = await vaultContract.getEncryptedPassword(signers.alice.address);
    expect(encryptedPassword).to.eq(ethers.ZeroHash);
  });
});
