import { ethers, network } from "hardhat";
import { TNFT, TriMarket, TriToken } from "../typechain-types";
import { expect } from "chai";

describe("Marketplace", function () {
  async function setup() {
    const [owner, ...accounts] = await ethers.getSigners();
    const buyer = accounts[1];
    const seller = accounts[2];
    const user = accounts[3];

    const Token = await ethers.getContractFactory("TriToken");
    const token: TriToken = (await Token.deploy()) as TriToken;

    const TNFT = await ethers.getContractFactory("TNFT");
    const tNFT: TNFT = (await TNFT.deploy()) as TNFT;

    const Market = await ethers.getContractFactory("TriMarket");
    const market: TriMarket = (await Market.deploy(
      token.address,
      tNFT.address
    )) as TriMarket;

    // buyer get some triToken
    await token
      .connect(buyer)
      .getToken({ value: ethers.utils.parseEther("1") });

    // seller receives tNFT
    await tNFT.safeMint(seller.address);

    return { owner, buyer, seller, market, tNFT, user, token };
  }

  describe("List NFT for selling", () => {
    it("Should fail to list - Seller does not own or did not approve the NFT", async () => {
      const { market } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      await expect(
        market.listToken(1, ethers.utils.parseEther("0.1"), now + 3600)
      ).to.be.revertedWith("TriMarket: NFT not approved");
    });

    it("Should fail to list - Expiry time below 1 hour", async () => {
      const { buyer, market, seller, owner, tNFT } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      await tNFT.connect(seller).approve(market.address, 1);

      await expect(
        market
          .connect(seller)
          .listToken(1, ethers.utils.parseEther("0.1"), now + 1800)
      ).to.be.revertedWith("TriMarket: expiry below range");
    });

    it("Should list the NFT for sale", async () => {
      const { market, seller, tNFT } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const tokenId = 1;
      const hour = 3600;

      await tNFT.connect(seller).approve(market.address, tokenId);

      const tx = await market
        .connect(seller)
        .listToken(tokenId, ethers.utils.parseEther("0.1"), now + 2 * hour);

      await expect(tx)
        .to.emit(market, "TokenListed")
        .withArgs(seller.address, tokenId);
    });
  });

  describe("Buy the NFT", () => {
    it("Should fail to buy - NFT not listed", async () => {
      const { market, seller, tNFT, buyer } = await setup();

      await expect(market.connect(buyer).buyToken(1)).to.be.revertedWith(
        "TriMarket: No listing found"
      );
    });

    it("Should fail to buy - Seller does not own the NFT", async () => {
      const { buyer, market, seller, tNFT, user } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const tokenId = 1;
      const hour = 3600;

      await tNFT.connect(seller).approve(market.address, tokenId);

      const tx = await market
        .connect(seller)
        .listToken(tokenId, ethers.utils.parseEther("0.1"), now + 2 * hour);

      await expect(tx)
        .to.emit(market, "TokenListed")
        .withArgs(seller.address, tokenId);

      await tNFT.connect(seller).transferFrom(seller.address, user.address, 1);

      await expect(market.connect(buyer).buyToken(1)).to.be.revertedWith(
        "TriMarket: No listing found"
      );
    });

    it("Should fail to buy - Listing expired", async () => {
      const { buyer, market, seller, tNFT, user } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const tokenId = 1;
      const hour = 3600;

      await tNFT.connect(seller).approve(market.address, tokenId);

      const tx = await market
        .connect(seller)
        .listToken(tokenId, ethers.utils.parseEther("0.1"), now + 2 * hour);

      await expect(tx)
        .to.emit(market, "TokenListed")
        .withArgs(seller.address, tokenId);

      await network.provider.send("evm_increaseTime", [3 * hour]);
      await network.provider.send("evm_mine");

      await expect(market.connect(buyer).buyToken(1)).to.be.revertedWith(
        "TriMarket: Listing expired"
      );
    });

    it("Should fail to buy - Buyer does not approve funds", async () => {
      const { buyer, market, seller, tNFT, user } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const tokenId = 1;
      const hour = 3600;

      await tNFT.connect(seller).approve(market.address, tokenId);

      const tx = await market
        .connect(seller)
        .listToken(tokenId, ethers.utils.parseEther("0.1"), now + 2 * hour);

      await expect(tx)
        .to.emit(market, "TokenListed")
        .withArgs(seller.address, tokenId);

      await expect(market.connect(buyer).buyToken(1)).to.be.revertedWith(
        "TriMarket: Insufficient allowance"
      );
    });

    it("Should be able to buy", async () => {
      const { buyer, market, seller, tNFT, user, token } = await setup();

      const now = (await ethers.provider.getBlock("latest")).timestamp;

      const tokenId = 1;
      const hour = 3600;

      await tNFT.connect(seller).approve(market.address, tokenId);

      let tx = await market
        .connect(seller)
        .listToken(tokenId, ethers.utils.parseEther("0.1"), now + 2 * hour);

      await expect(tx)
        .to.emit(market, "TokenListed")
        .withArgs(seller.address, tokenId);

      await token
        .connect(buyer)
        .approve(market.address, ethers.constants.MaxUint256);

      tx = await market.connect(buyer).buyToken(tokenId);

      await expect(tx)
        .to.emit(market, "TokenBought")
        .withArgs(buyer.address, tokenId);
    });
  });
});
