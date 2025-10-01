import { ethers } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

async function main() {
  const contractAddress = "0x43743cf81345D6406583F9dbb622d01d5A445d9E";
  const [signer] = await ethers.getSigners();
  const FHECounter = await ethers.getContractAt("FHECounter", contractAddress);

  // Şifreli input oluştur (örneğin 1 için)
  const hre = require("hardhat");
  const encryptedInput = await hre.fhevm.createEncryptedInput(contractAddress, signer.address).add32(1).encrypt();

  // increment fonksiyonunu çağır
  const tx = await FHECounter.increment(encryptedInput.handles[0], encryptedInput.inputProof);
  await tx.wait();
  console.log("increment(1) işlemi gönderildi ve onaylandı.");

  // Sonucu oku ve deşifre et
  const encryptedCount = await FHECounter.getCount();
  const clearCount = await hre.fhevm.userDecryptEuint(
    FhevmType.euint32,
    encryptedCount,
    contractAddress,
    signer
  );
  console.log("Sayaç değeri:", clearCount);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
