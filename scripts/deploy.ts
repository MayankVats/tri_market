import { ethers } from "hardhat";
import { TNFT, TriMarket, TriToken } from "../typechain-types";

async function main() {
  const Token = await ethers.getContractFactory("TriToken");
  const token: TriToken = (await Token.deploy()) as TriToken;

  console.log("TriToken deployed at: ", token.address);

  const TNFT = await ethers.getContractFactory("TNFT");
  const tNFT: TNFT = (await TNFT.deploy()) as TNFT;

  console.log("TNFT deployed at: ", tNFT.address);

  const Market = await ethers.getContractFactory("TriMarket");
  const market: TriMarket = (await Market.deploy(
    token.address,
    tNFT.address
  )) as TriMarket;

  console.log("Market deployed at: ", market.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
