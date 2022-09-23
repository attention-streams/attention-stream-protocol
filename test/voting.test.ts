import { BigNumber } from "ethers";
import helpers from "../scripts/helpers";
import { addChoice, addTopic, deployArena, vote } from "../scripts/deploy";
import { Arena, ERC20 } from "../typechain";
import {
  getValidArenaParams,
  getValidChoiceBParams,
  getValidChoiceParams,
  getValidTopicParams,
} from "./test.creations.data";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";

describe("Test Voting mechanism", async () => {
  let arena: Arena;
  let token: ERC20;
  let arenaFunds: SignerWithAddress;
  let topicFunds: SignerWithAddress;
  let choiceAFunds: SignerWithAddress;
  let choiceBFunds: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  const topic: BigNumber = BigNumber.from(0);
  const choiceA: BigNumber = BigNumber.from(0);
  const choiceB: BigNumber = BigNumber.from(1);

  async function _deployArena() {
    const arenaParams = getValidArenaParams();
    arenaParams.token = token.address;
    arenaParams.funds = arenaFunds.address;
    arena = await deployArena(arenaParams);
    await arena.deployed();
  }

  async function _deployTopic() {
    const topicParams = getValidTopicParams();
    topicParams.funds = topicFunds.address;
    topicParams.startTime = (
      await ethers.provider.getBlock("latest")
    ).timestamp;
    const _topicTx = await addTopic(arena, topicParams);
    await _topicTx.wait(1);
  }

  async function _deployTwoChoices() {
    const choiceAParams = getValidChoiceParams();
    choiceAParams.funds = choiceAFunds.address;

    const choiceBParams = getValidChoiceBParams();
    choiceBParams.funds = choiceBFunds.address;

    const _choiceATx = await addChoice(arena, topic, choiceAParams);
    const _choiceBTx = await addChoice(arena, topic, choiceBParams);

    await _choiceATx.wait(1);
    await _choiceBTx.wait(1);
  }

  async function _setupAttentionStreams() {
    token = await helpers.getTestVoteToken();
    await _deployArena();
    await _deployTopic();
    await _deployTwoChoices();
  }

  async function _fundVoters() {
    const _tx1 = await token.transfer(
      voter1.address,
      ethers.utils.parseEther("100")
    );
    await _tx1.wait(1);
    const _tx2 = await token.transfer(
      voter2.address,
      ethers.utils.parseEther("20")
    );

    await _tx2.wait(1);
    const _tx3 = await token.transfer(
      voter3.address,
      ethers.utils.parseEther("20")
    );
    await _tx3.wait(1);

    // allow arena to spend funds on their behalf
    await token.connect(voter1).approve(arena.address, parseEther("1000"));
    await token.connect(voter2).approve(arena.address, parseEther("1000"));
    await token.connect(voter3).approve(arena.address, parseEther("1000"));
  }

  async function setup() {
    [
      ,
      arenaFunds,
      topicFunds,
      choiceAFunds,
      choiceBFunds,
      voter1,
      voter2,
      voter3,
    ] = await ethers.getSigners();
    await _setupAttentionStreams();
    await _fundVoters();
  }

  async function getTotalFees(
    choiceId: BigNumber,
    amount: BigNumber
  ): Promise<BigNumber> {
    const arenaFeePercentage = (await arena.info()).arenaFeePercentage;
    const topicFeePercentage = (await arena.topics(topic)).topicFeePercentage;
    const contributorFee = (await arena.topics(topic))
      .prevContributorsFeePercentage;
    const choiceFee = (await arena.topicChoices(topic, choiceId)).feePercentage;
    const totalFeePercentage =
      arenaFeePercentage + topicFeePercentage + contributorFee + choiceFee;

    return amount.mul(totalFeePercentage).div(10000);
  }
  async function amountAfterVote(
    choiceId: BigNumber,
    amount: BigNumber
  ): Promise<BigNumber> {
    const totalFees = await getTotalFees(choiceId, amount);
    return amount.sub(totalFees);
  }

  // increase time by once cycle
  async function increaseCycle(cycles: number = 1) {
    const cycleDuration = 100;
    await network.provider.send("evm_increaseTime", [cycleDuration * cycles]);
    await network.provider.send("evm_mine", []);
  }

  describe("Core voting mechanism", async () => {
    let data = [
      {
        cycle: 0,
        positions: [
          [
            {
              voter: voter1,
              tokens: BigNumber.from(750),
              shares: BigNumber.from(0),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(0),
              shares: BigNumber.from(0),
            },
          ],
        ],
      },
      {
        cycle: 1,
        positions: [
          [
            {
              voter: voter1,
              tokens: BigNumber.from(990),
              shares: BigNumber.from(750),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(1260),
              shares: BigNumber.from(0),
            },
          ],
        ],
      },
      {
        cycle: 2,
        positions: [
          [
            {
              voter: voter1,
              tokens: BigNumber.from(990),
              shares: BigNumber.from(1740),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(1260),
              shares: BigNumber.from(1260),
            },
          ],
        ],
      },
      {
        cycle: 3,
        positions: [
          [
            {
              voter: voter1,
              tokens: BigNumber.from(990),
              shares: BigNumber.from(2730),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(1260),
              shares: BigNumber.from(2520),
            },
          ],
        ],
      },
      {
        cycle: 4,
        positions: [
          [
            // epoch - voter 1 puts 3000 more
            {
              voter: voter1,
              tokens: BigNumber.from(3058),
              shares: BigNumber.from(3720),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(1441),
              shares: BigNumber.from(3780),
            },
          ],
          [
            // epoch 2 voter 2  puts 2000 more
            {
              voter: voter1,
              tokens: BigNumber.from(3177),
              shares: BigNumber.from(3720),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(2821),
              shares: BigNumber.from(3780),
            },
          ],
        ],
      },
      {
        cycle: 5,
        positions: [
          [
            {
              voter: voter1,
              tokens: BigNumber.from(3177),
              shares: BigNumber.from(6897),
            },
            {
              voter: voter2,
              tokens: BigNumber.from(2821),
              shares: BigNumber.from(6601),
            },
          ],
        ],
      },
    ];

    async function validateVoter1and2PositionData(
      choice: BigNumber,
      cycle: number,
      epoch: number = 0
    ) {
      let position1Info = await arena.aggregatedVoterPosition(
        topic,
        choice,
        voter1.address
      );
      let position2Info = await arena.aggregatedVoterPosition(
        topic,
        choice,
        voter2.address
      );
      expect(position1Info.tokens).to.equal(
        data[cycle].positions[epoch][0].tokens
      );
      expect(position1Info.shares).to.equal(
        data[cycle].positions[epoch][0].shares
      );
      expect(position2Info.tokens).to.equal(
        data[cycle].positions[epoch][1].tokens
      );
      expect(position2Info.shares).to.equal(
        data[cycle].positions[epoch][1].shares
      );
    }
    it("should setup a clean attention stream", async () => {
      await setup();
    });
    it("should fail to vote with less than min contribution amount", async () => {
      const tx = vote(arena, topic, choiceA, BigNumber.from(5), voter1);
      await expect(tx).to.be.revertedWith("Arena: LOW_AMOUNT");
    });
    it("should retrieve correct position info after voter 1 puts 1000 token on choice A", async () => {
      const tx = await vote(
        arena,
        topic,
        choiceA,
        BigNumber.from(1000),
        voter1
      );
      await tx.wait();
      await validateVoter1and2PositionData(choiceA, 0);
    });
    it("should retrieve correct position info after one cycle and voter 2 vote", async () => {
      // increase evm timestamp by 100 seconds
      await increaseCycle();

      const tx = await vote(
        arena,
        topic,
        choiceA,
        BigNumber.from(2000),
        voter2
      );
      await tx.wait(1);
      await validateVoter1and2PositionData(choiceA, 1);
    });
    it("should retrieve correct info after one more cycle", async () => {
      await increaseCycle();
      await validateVoter1and2PositionData(choiceA, 2);
    });
    it("should retrieve correct info after third cycle", async () => {
      await increaseCycle();
      await validateVoter1and2PositionData(choiceA, 3);
    });
    it("should retrieve correct accumulative choice A info ", async () => {
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.tokens).equal(2250);
    });
    it("should get correct info after voter a votes 3000 tokens on the next cycle", async () => {
      await increaseCycle();
      const tx = await vote(
        arena,
        topic,
        choiceA,
        BigNumber.from(3000),
        voter1
      );
      await tx.wait();
      await validateVoter1and2PositionData(choiceA, 4);
    });
    it("should get correct info after voter 2 puts 2000 tokens in the same cycle", async () => {
      const tx = await vote(
        arena,
        topic,
        choiceA,
        BigNumber.from(2000),
        voter2
      );
      await tx.wait();
      await validateVoter1and2PositionData(choiceA, 4, 1);
    });
    it("voter 1 votes on choice B, this should not affect choice A data", async () => {
      const tx = await vote(
        arena,
        topic,
        choiceB,
        BigNumber.from(1000),
        voter1
      );
      await tx.wait(1);
      await validateVoter1and2PositionData(choiceA, 4, 1); // check that position A not changed

      let positionOnB = await arena.aggregatedVoterPosition(
        topic,
        choiceB,
        voter1.address
      );

      expect(positionOnB.tokens).equal(700);
      expect(positionOnB.shares).equal(0);
    });
    it("should get correct info of both choice A and B on cycle 5", async () => {
      await increaseCycle();
      await validateVoter1and2PositionData(choiceA, 5); // check that position A not changed

      let positionOnB = await arena.aggregatedVoterPosition(
        topic,
        choiceB,
        voter1.address
      );

      expect(positionOnB.tokens).equal(700);
      expect(positionOnB.shares).equal(700);
    });
    it("should retrieve correct accumulative choice A info ", async () => {
      await increaseCycle(2);
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(25494);
      expect(info.tokens).equal(5998);
    });
  });

  async function _snapshotTokenBalance(
    accounts: SignerWithAddress[]
  ): Promise<BigNumber[]> {
    const balances: BigNumber[] = [];
    for (const account of accounts) {
      const balanceActual = await token.balanceOf(account.address);
      const balanceClaimable = await arena.balanceOf(account.address);
      balances.push(balanceActual.add(balanceClaimable));
    }
    return balances;
  }

  function _delta(a: BigNumber[], b: BigNumber[]): BigNumber[] {
    if (a.length !== b.length) throw new Error("Lists must be the same length");
    const result: BigNumber[] = [];
    for (let i = 0; i < a.length; i++) {
      result.push(a[i].sub(b[i]).abs());
    }
    return result;
  }

  async function confirmFeePercentagePaid(
    amount: BigNumber,
    percentage: BigNumber,
    account: SignerWithAddress
  ) {
    const feeAmount = amount.mul(percentage).div(10000);
    const [balance] = await _snapshotTokenBalance([account]);
    expect(balance).equal(feeAmount);
  }

  describe("test voting fee distribution to choice, topic and arena funds", async () => {
    it("should setup a clean attention stream", async () => {
      await setup();
    });
    it("should confirm that no votes are on choice A", async () => {
      const info = await arena.choiceSummery(topic, choiceA);
      expect(info.tokens).equal(0);
    });
    it("should confirm voter 1 votes on choice A", async () => {
      const amount = parseEther("1");
      const balanceBefore = await _snapshotTokenBalance([voter1]);
      const tx = await vote(arena, topic, choiceA, amount, voter1);
      await tx.wait(1);
      const balanceAfter = await _snapshotTokenBalance([voter1]);
      const [balanceDelta] = _delta(balanceAfter, balanceBefore);
      expect(balanceDelta).equal(amount);
    });

    it("should confirm fee distribution from voter 1 to choice A", async () => {
      const feePercentage = (await arena.topicChoices(topic, choiceA))
        .feePercentage;
      await confirmFeePercentagePaid(
        parseEther("1"),
        BigNumber.from(feePercentage),
        choiceAFunds
      );
    });
    it("should confirm fee distribution from voter 1 to topic", async () => {
      const feePercentage = (await arena.topics(topic)).topicFeePercentage;
      await confirmFeePercentagePaid(
        parseEther("1"),
        BigNumber.from(feePercentage),
        topicFunds
      );
    });
    it("should confirm fee distribution from voter 1 to arena", async () => {
      const feePercentage = (await arena.info()).arenaFeePercentage;
      await confirmFeePercentagePaid(
        parseEther("1"),
        BigNumber.from(feePercentage),
        arenaFunds
      );
    });
  });

  describe("test withdrawals", async () => {
    before(async () => {
      await setup();
    });
    it("should print zero share ", async () => {
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(0);
      expect(info.tokens).equal(0);
    });
    it("voter 1 and 2 vote on choice A", async () => {
      // cycle 1
      await arena.connect(voter1).vote(topic, choiceA, 3000);
      await arena.connect(voter2).vote(topic, choiceA, 2000);
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(0);
      expect(info.tokens).equal(3750);
    });
    it("get correct shares after one cycle", async () => {
      // cycle 2
      await increaseCycle();
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(3750);
      expect(info.tokens).equal(3750);
    });
    it("get correct data after voter 3 votes", async () => {
      // cycle 2
      await arena.connect(voter3).vote(topic, choiceA, 1000);
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(3750);
      expect(info.tokens).equal(4500);

      let info1 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter1.address
      );
      expect(info1.tokens).eq(2322);
      expect(info1.shares).eq(2250);
      let info2 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter2.address
      );
      expect(info2.tokens).eq(1548);
      expect(info2.shares).eq(1500);
    });
    it("voter 1 withdraws", async () => {
      // should recieve 2322 tokens
      // cycle 2
      let [before] = await _snapshotTokenBalance([voter1]);
      await arena.connect(voter1).withdrawPosition(topic, choiceA, 0);
      let [after] = await _snapshotTokenBalance([voter1]);
      expect(after.sub(before)).eq(2322);
    });
    it("should retrieve correct choice summery after one cycle", async () => {
      // cycle 3
      await increaseCycle();
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.shares).equal(3678);
      expect(info.tokens).equal(2178);

      let info1 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter1.address
      );
      expect(info1.tokens).eq(0);
      expect(info1.shares).eq(0);

      let info2 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter2.address
      );
      expect(info2.tokens).eq(1548);
      expect(info2.shares).eq(3048);
    });
    it("should retrieve correct position info after voter 1 votes", async () => {
      // cycle 3

      await arena.connect(voter1).vote(topic, choiceA, 1000);

      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.tokens).equal(2927);
      expect(info.shares).equal(3678);

      let info2 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter2.address
      );
      expect(info2.tokens).eq(1647);
      expect(info2.shares).eq(3048);
      let info3 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter3.address
      );
      expect(info3.tokens).eq(650);
      expect(info3.shares).eq(630);

      let info1 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter1.address
      );
      expect(info1.tokens).eq(630);
      expect(info1.shares).eq(0);
    });
    it("should retrive correct info after one other cycle", async () => {
      // cycle 4
      await increaseCycle();
      let info = await arena.choiceSummery(topic, choiceA);
      expect(info.tokens).equal(2927);
      expect(info.shares).equal(6605);

      let info2 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter2.address
      );
      expect(info2.tokens).eq(1647);
      expect(info2.shares).eq(4695);
      let info3 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter3.address
      );
      expect(info3.tokens).eq(650);
      expect(info3.shares).eq(1280);

      let info1 = await arena.aggregatedVoterPosition(
        topic,
        choiceA,
        voter1.address
      );
      expect(info1.tokens).eq(630);
      expect(info1.shares).eq(630);
    });
  });
});
