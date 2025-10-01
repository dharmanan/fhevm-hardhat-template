import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { FHECounter } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("FHECounterSepolia", function () {
  it("should revert with invalid proof or handle", async function () {
    steps = 5;
    this.timeout(60000);

  // Invalid handle and proof for increment call
    const fakeHandle = "0x" + "00".repeat(32);
    const fakeProof = "0x";

    await expect(
      fheCounterContract.connect(signers.alice).increment(fakeHandle, fakeProof)
    ).to.be.reverted;
  });
  it("should increment the counter by a large value", async function () {
    steps = 10;
    this.timeout(120000);

  // Read and decrypt the current counter value
    const encryptedCountBefore = await fheCounterContract.getCount();
    const clearCountBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountBefore,
      fheCounterContractAddress,
      signers.alice,
    );

  // Increment by a large value (e.g., 1000)
    const bigValue = 1000;
    const encryptedBig = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(bigValue)
      .encrypt();
    let tx = await fheCounterContract.connect(signers.alice).increment(encryptedBig.handles[0], encryptedBig.inputProof);
    await tx.wait();

  // Read and decrypt the result
    const encryptedCountAfter = await fheCounterContract.getCount();
    const clearCountAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfter,
      fheCounterContractAddress,
      signers.alice,
    );
    expect(clearCountAfter - clearCountBefore).to.eq(bigValue);
  });
  it("should allow a different user to increment and read the counter", async function () {
    steps = 10;
    this.timeout(120000);

    const ethSigners = await ethers.getSigners();
    const alice = ethSigners[0];
    const bob = ethSigners[1];

  // Create encrypted input for Bob
    const encryptedInputBob = await fhevm
      .createEncryptedInput(fheCounterContractAddress, bob.address)
      .add32(5)
      .encrypt();

  // Bob increments the counter
    let tx = await fheCounterContract.connect(bob).increment(encryptedInputBob.handles[0], encryptedInputBob.inputProof);
    await tx.wait();

  // Read and decrypt the counter value (with Bob)
    const encryptedCount = await fheCounterContract.getCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      fheCounterContractAddress,
      bob,
    );
    console.log("Bob ile sayaç değeri:", clearCount);
    expect(clearCount).to.be.a("number");
  });
  it("decrement the counter by 1", async function () {
    steps = 12;
  this.timeout(120000); // 2 minutes

  // Read and decrypt the current counter value
    const encryptedCountBefore = await fheCounterContract.getCount();
    const clearCountBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountBefore,
      fheCounterContractAddress,
      signers.alice,
    );

  // First increment by 1
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(1)
      .encrypt();
    let tx = await fheCounterContract.connect(signers.alice).increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

  // Then decrement by 1
    const encryptedOneDec = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(1)
      .encrypt();
    tx = await fheCounterContract.connect(signers.alice).decrement(encryptedOneDec.handles[0], encryptedOneDec.inputProof);
    await tx.wait();

  // Read and decrypt the result
    const encryptedCountAfter = await fheCounterContract.getCount();
    const clearCountAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfter,
      fheCounterContractAddress,
      signers.alice,
    );
    expect(clearCountAfter).to.eq(clearCountBefore);
  });
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const FHECounterDeployement = await deployments.get("FHECounter");
      fheCounterContractAddress = FHECounterDeployement.address;
      fheCounterContract = await ethers.getContractAt("FHECounter", FHECounterDeployement.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("increment the counter by 1", async function () {
    steps = 10;

    this.timeout(4 * 40000);

    progress("Encrypting '0'...");
    const encryptedZero = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    progress(
      `Call increment(0) FHECounter=${fheCounterContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${signers.alice.address}...`,
    );
    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedZero.handles[0], encryptedZero.inputProof);
    await tx.wait();

    progress(`Call FHECounter.getCount()...`);
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting FHECounter.getCount()=${encryptedCountBeforeInc}...`);
    const clearCountBeforeInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountBeforeInc,
      fheCounterContractAddress,
      signers.alice,
    );
    progress(`Clear FHECounter.getCount()=${clearCountBeforeInc}`);

    progress(`Encrypting '1'...`);
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    progress(
      `Call increment(1) FHECounter=${fheCounterContractAddress} handle=${ethers.hexlify(encryptedOne.handles[0])} signer=${signers.alice.address}...`,
    );
    tx = await fheCounterContract.connect(signers.alice).increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    progress(`Call FHECounter.getCount()...`);
    const encryptedCountAfterInc = await fheCounterContract.getCount();

    progress(`Decrypting FHECounter.getCount()=${encryptedCountAfterInc}...`);
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );
    progress(`Clear FHECounter.getCount()=${clearCountAfterInc}`);

    expect(clearCountAfterInc - clearCountBeforeInc).to.eq(1);
  });
});
