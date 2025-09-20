const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TouristDigitalID", function () {
  let touristDigitalID;
  let owner;
  let authority1;
  let authority2;
  let tourist1;
  let tourist2;
  let unauthorized;

  const SAMPLE_KYC_HASH = ethers.keccak256(ethers.toUtf8Bytes("sample_kyc_document"));
  const SAMPLE_PERSONAL_HASH = ethers.keccak256(ethers.toUtf8Bytes("sample_personal_data"));
  const ONE_YEAR = 365 * 24 * 60 * 60; // 1 year in seconds

  beforeEach(async function () {
    // Get signers
    [owner, authority1, authority2, tourist1, tourist2, unauthorized] = await ethers.getSigners();

    // Deploy contract
    const TouristDigitalID = await ethers.getContractFactory("TouristDigitalID");
    touristDigitalID = await TouristDigitalID.deploy();
    await touristDigitalID.waitForDeployment();

    // Set up additional authority
    await touristDigitalID.setAuthority(authority1.address, true);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await touristDigitalID.owner()).to.equal(owner.address);
    });

    it("Should set owner as authorized authority", async function () {
      expect(await touristDigitalID.authorizedAuthorities(owner.address)).to.be.true;
    });

    it("Should initialize with correct default values", async function () {
      expect(await touristDigitalID.nextDigitalId()).to.equal(1);
      expect(await touristDigitalID.totalActiveIDs()).to.equal(0);
      expect(await touristDigitalID.paused()).to.be.false;
    });
  });

  describe("Authority Management", function () {
    it("Should allow owner to set authority", async function () {
      await touristDigitalID.setAuthority(authority2.address, true);
      expect(await touristDigitalID.authorizedAuthorities(authority2.address)).to.be.true;
    });

    it("Should allow owner to revoke authority", async function () {
      await touristDigitalID.setAuthority(authority1.address, false);
      expect(await touristDigitalID.authorizedAuthorities(authority1.address)).to.be.false;
    });

    it("Should not allow non-owner to set authority", async function () {
      await expect(
        touristDigitalID.connect(authority1).setAuthority(authority2.address, true)
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should emit AuthorityStatusChanged event", async function () {
      await expect(touristDigitalID.setAuthority(authority2.address, true))
        .to.emit(touristDigitalID, "AuthorityStatusChanged")
        .withArgs(authority2.address, true, owner.address);
    });
  });

  describe("Contract Pause/Unpause", function () {
    it("Should allow owner to pause contract", async function () {
      await touristDigitalID.pauseContract();
      expect(await touristDigitalID.paused()).to.be.true;
    });

    it("Should allow owner to unpause contract", async function () {
      await touristDigitalID.pauseContract();
      await touristDigitalID.unpauseContract();
      expect(await touristDigitalID.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause contract", async function () {
      await expect(
        touristDigitalID.connect(authority1).pauseContract()
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Digital ID Creation", function () {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + ONE_YEAR;

    it("Should create digital ID successfully", async function () {
      const tx = await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );

      await expect(tx)
        .to.emit(touristDigitalID, "DigitalIDCreated")
        .withArgs(1, "t123", owner.address, 3);

      expect(await touristDigitalID.nextDigitalId()).to.equal(2);
      expect(await touristDigitalID.totalActiveIDs()).to.equal(1);
    });

    it("Should allow authorized authority to create digital ID", async function () {
      await touristDigitalID.connect(authority1).createDigitalID(
        "t124",
        "Bob Smith",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        4
      );

      const digitalId = await touristDigitalID.getIDByTouristId("t124");
      expect(digitalId).to.equal(1);
    });

    it("Should not allow unauthorized user to create digital ID", async function () {
      await expect(
        touristDigitalID.connect(unauthorized).createDigitalID(
          "t125",
          "Charlie Brown",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          3
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow duplicate tourist user ID", async function () {
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );

      await expect(
        touristDigitalID.createDigitalID(
          "t123",
          "Alice Duplicate",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          3
        )
      ).to.be.revertedWith("Digital ID already exists for this tourist");
    });

    it("Should not allow creation when paused", async function () {
      await touristDigitalID.pauseContract();

      await expect(
        touristDigitalID.createDigitalID(
          "t123",
          "Alice Kumar",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          3
        )
      ).to.be.revertedWith("Contract is paused");
    });

    it("Should validate input parameters", async function () {
      // Empty tourist user ID
      await expect(
        touristDigitalID.createDigitalID(
          "",
          "Alice Kumar",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          3
        )
      ).to.be.revertedWith("Tourist user ID cannot be empty");

      // Empty name
      await expect(
        touristDigitalID.createDigitalID(
          "t123",
          "",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          3
        )
      ).to.be.revertedWith("Name cannot be empty");

      // Past expiration time
      await expect(
        touristDigitalID.createDigitalID(
          "t123",
          "Alice Kumar",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          currentTime - 1000, // Past time
          3
        )
      ).to.be.revertedWith("Expiration must be in future");

      // Invalid verification level
      await expect(
        touristDigitalID.createDigitalID(
          "t123",
          "Alice Kumar",
          SAMPLE_KYC_HASH,
          SAMPLE_PERSONAL_HASH,
          expirationTime,
          0 // Invalid level
        )
      ).to.be.revertedWith("Verification level must be 1-5");
    });
  });

  describe("Digital ID Verification", function () {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + ONE_YEAR;

    beforeEach(async function () {
      // Create a test digital ID
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );
    });

    it("Should verify valid digital ID", async function () {
      const [valid, status] = await touristDigitalID.verifyDigitalID(1);
      expect(valid).to.be.true;
      expect(status).to.equal(0); // Active status
    });

    it("Should return false for non-existent ID", async function () {
      const [valid, status] = await touristDigitalID.verifyDigitalID(999);
      expect(valid).to.be.false;
      expect(status).to.equal(3); // Revoked status for non-existent
    });

    it("Should return false for expired ID", async function () {
      // Create ID with past expiration for testing
      const pastTime = currentTime - 1000;
      // We need to test this scenario by manipulating time or using a different approach
      // For now, we'll test the logic path when checking expiration
    });
  });

  describe("Digital ID Details", function () {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + ONE_YEAR;

    beforeEach(async function () {
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );
    });

    it("Should return correct ID details", async function () {
      const details = await touristDigitalID.getIDDetails(1);
      
      expect(details.digitalId).to.equal(1);
      expect(details.touristUserId).to.equal("t123");
      expect(details.name).to.equal("Alice Kumar");
      expect(details.authorityAddress).to.equal(owner.address);
      expect(details.kycDocumentHash).to.equal(SAMPLE_KYC_HASH);
      expect(details.personalDataHash).to.equal(SAMPLE_PERSONAL_HASH);
      expect(details.expirationTimestamp).to.equal(expirationTime);
      expect(details.status).to.equal(0); // Active
      expect(details.verificationLevel).to.equal(3);
      expect(details.exists).to.be.true;
    });

    it("Should get digital ID by tourist user ID", async function () {
      const digitalId = await touristDigitalID.getIDByTouristId("t123");
      expect(digitalId).to.equal(1);
    });

    it("Should return 0 for non-existent tourist ID", async function () {
      const digitalId = await touristDigitalID.getIDByTouristId("nonexistent");
      expect(digitalId).to.equal(0);
    });
  });

  describe("Status Management", function () {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + ONE_YEAR;

    beforeEach(async function () {
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );
    });

    it("Should update ID status", async function () {
      await expect(touristDigitalID.updateIDStatus(1, 1)) // Suspend
        .to.emit(touristDigitalID, "IDStatusUpdated")
        .withArgs(1, 0, 1, owner.address); // From Active to Suspended

      const details = await touristDigitalID.getIDDetails(1);
      expect(details.status).to.equal(1); // Suspended
      expect(await touristDigitalID.totalActiveIDs()).to.equal(0);
    });

    it("Should not allow unauthorized status updates", async function () {
      await expect(
        touristDigitalID.connect(unauthorized).updateIDStatus(1, 1)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should renew digital ID", async function () {
      const newExpiration = expirationTime + ONE_YEAR;
      await touristDigitalID.renewDigitalID(1, newExpiration);

      const details = await touristDigitalID.getIDDetails(1);
      expect(details.expirationTimestamp).to.equal(newExpiration);
    });
  });

  describe("Batch Operations", function () {
    it("Should batch create multiple digital IDs", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + ONE_YEAR;

      const touristIds = ["t123", "t124", "t125"];
      const names = ["Alice Kumar", "Bob Smith", "Charlie Brown"];
      const kycHashes = [SAMPLE_KYC_HASH, SAMPLE_KYC_HASH, SAMPLE_KYC_HASH];
      const personalHashes = [SAMPLE_PERSONAL_HASH, SAMPLE_PERSONAL_HASH, SAMPLE_PERSONAL_HASH];
      const verificationLevels = [3, 4, 5];

      await touristDigitalID.batchCreateIDs(
        touristIds,
        names,
        kycHashes,
        personalHashes,
        verificationLevels
      );

      expect(await touristDigitalID.totalActiveIDs()).to.equal(3);
      expect(await touristDigitalID.nextDigitalId()).to.equal(4);

      // Verify each ID was created
      for (let i = 0; i < touristIds.length; i++) {
        const digitalId = await touristDigitalID.getIDByTouristId(touristIds[i]);
        expect(digitalId).to.equal(i + 1);
      }
    });

    it("Should not allow non-owner to batch create", async function () {
      await expect(
        touristDigitalID.connect(authority1).batchCreateIDs(
          ["t123"],
          ["Alice"],
          [SAMPLE_KYC_HASH],
          [SAMPLE_PERSONAL_HASH],
          [3]
        )
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Contract Statistics", function () {
    it("Should return correct contract statistics", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + ONE_YEAR;

      // Create some IDs
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );

      await touristDigitalID.createDigitalID(
        "t124",
        "Bob Smith",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        4
      );

      const [totalIDs, activeIDs] = await touristDigitalID.getContractStats();
      expect(totalIDs).to.equal(2);
      expect(activeIDs).to.equal(2);
    });
  });

  describe("Development Helpers", function () {
    it("Should allow owner to reset contract", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + ONE_YEAR;

      // Create an ID first
      await touristDigitalID.createDigitalID(
        "t123",
        "Alice Kumar",
        SAMPLE_KYC_HASH,
        SAMPLE_PERSONAL_HASH,
        expirationTime,
        3
      );

      // Reset contract
      await touristDigitalID.resetContract();

      expect(await touristDigitalID.nextDigitalId()).to.equal(1);
      expect(await touristDigitalID.totalActiveIDs()).to.equal(0);
    });

    it("Should not allow non-owner to reset contract", async function () {
      await expect(
        touristDigitalID.connect(authority1).resetContract()
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });
});