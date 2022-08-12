import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";

import {
  ArenaParams,
  ChoiceParams,
  getFlatParamsFromDict,
  getValidArenaParams,
  getValidChoiceParams,
  getValidTopicParams,
  TopicParams,
} from "../test/test.creations.data";
import { Arena, IERC20 } from "../typechain";
import { wallets } from "./rinkeby.wallets";

async function deployAttentionToken() {
  const At = await ethers.getContractFactory("Attention");
  return await At.deploy();
}

interface ParamsSigner {
  signer: SignerWithAddress;
  params: any[];
}

async function getSigner(
  _signer: SignerWithAddress | undefined
): Promise<SignerWithAddress> {
  if (_signer === undefined) {
    const [_theSigner] = await ethers.getSigners();
    return _theSigner;
  }
  return _signer;
}

async function getSingerAndParamsArray(
  _params: any,
  _signer?: SignerWithAddress
): Promise<ParamsSigner> {
  const params = getFlatParamsFromDict(_params);
  return {
    signer: await getSigner(_signer),
    params,
  };
}

async function deployArena(
  _params: ArenaParams,
  _signer?: SignerWithAddress
): Promise<Arena> {
  const signer = await getSigner(_signer);
  const factory = await ethers.getContractFactory("Arena", signer);
  const arena = await upgrades.deployProxy(factory, [
    getFlatParamsFromDict(_params),
  ]);
  return arena as Arena;
}

async function addTopic(
  _arena: Arena,
  _params: TopicParams,
  _signer?: SignerWithAddress
) {
  const signer = await getSigner(_signer);

  return _arena.connect(signer).addTopic(_params);
}

async function addChoice(
  _arena: Arena,
  _topicId: BigNumber,
  _params: ChoiceParams,
  _signer?: SignerWithAddress
) {
  const signer = await getSigner(_signer);
  return _arena.connect(signer).addChoice(_topicId, _params);
}

async function vote(
  _arena: Arena,
  _topicId: BigNumber,
  _choiceId: BigNumber,
  _amount: BigNumber,
  _signer?: SignerWithAddress
) {
  return _arena
    .connect(await getSigner(_signer))
    .vote(_topicId, _choiceId, _amount);
}

export {
  deployAttentionToken,
  getSingerAndParamsArray,
  deployArena,
  addTopic,
  addChoice,
  vote,
};

async function deployStandardArena() {
  let params = getValidArenaParams();
  params.funds = "0xaa6cD66cA508F22fe125e83342c7dc3dbE779250";
  let t = await deployArena(params);
  await t.deployed();
  console.log("Deployed at ", t.address);
  return t as Arena;
}

async function addStandardTopic(arena: Arena) {
  let params = getValidTopicParams();
  params.cycleDuration = 2;
  params.funds = "0xaa6cD66cA508F22fe125e83342c7dc3dbE779250";
  params.metaDataUrl = "http://168.119.127.117:6040/topic1.json";
  let t = await addTopic(arena, params);
  await t.wait(1);
  console.log("Topic Added");
}

async function addChoiceA(arena: Arena, topicId: BigNumber) {
  let params = getValidChoiceParams();
  params.funds = "0xaa6cD66cA508F22fe125e83342c7dc3dbE779250";
  params.description = "First Choice";
  params.metaDataUrl = "http://168.119.127.117:6040/choice1.json";
  let t = await addChoice(arena, topicId, params);
  await t.wait(1);
  console.log("Choice Added");
}

async function generate100wallets() {
  let wallets = [];
  for (let i = 0; i < 100; i++) {
    let w = ethers.Wallet.createRandom();
    wallets.push(w.mnemonic.phrase);
  }
  console.log(wallets);
}

async function loadRinkebyWallets() {
  let ethWallets = [];
  let [owner] = await ethers.getSigners();
  for (let phrase of wallets) {
    let _w = ethers.Wallet.fromMnemonic(phrase);
    let w = new ethers.Wallet(_w.privateKey, owner.provider);
    ethWallets.push(w);
  }

  return ethWallets;
}

async function fundRinkebyWallets() {
  let [owner] = await ethers.getSigners();

  let token = await ethers.getContractAt(
    "ERC20",
    "0x93055D4D59CE4866424E1814b84986bFD44920b9"
  );
  let theWallets = await loadRinkebyWallets();
  for (let i = 0; i < theWallets.length; i++) {
    let w = theWallets[i];
    await token.connect(owner).transfer(w.address, parseEther("0.01"));
    console.log(i);
  }
}

async function fundWalletsWithTestEther() {
  let [owner] = await ethers.getSigners();

  let theWallets = await loadRinkebyWallets();
  for (let i = 0; i < theWallets.length; i++) {
    let w = theWallets[i];
    await owner.sendTransaction({
      to: w.address,
      value: parseEther("0.01"),
    });
    console.log(i);
  }
}

async function approveContractToSpendToken() {
  let [owner] = await ethers.getSigners();
  let theWallets = await loadRinkebyWallets();
  let token = await ethers.getContractAt(
    "ERC20",
    "0x93055D4D59CE4866424E1814b84986bFD44920b9"
  );
  for (let i = 0; i < theWallets.length; i++) {
    let w = theWallets[i];
    await token
      .connect(w)
      .approve("0x99b4ba32a258Add555B751C8C8B6a6673a284247", parseEther("1"));

    console.log(i);
  }
}

import hre from "hardhat";

async function main() {
  // let arena = await ethers.getContractAt(
  //   "Arena",
  //   "0x29eB89E03F317B87aB3510bE0ED748CBab916D21"
  // );

  try {
    await hre.run("verify:verify", {
      address: "0xbD8f7a4ADb8dd775Bb8F0746C2A2E177110E00F8",
      constructorArguments: [],
    });
  } catch (e) {
    console.error("[DEPLOY] Failed to verify contract!");
    console.log(e);
  }

  // let uni = await ethers.getContractAt(
  //   "IERC20",
  //   "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
  // );

  // await uni.approve(arena.address, ethers.utils.parseEther("1000000000"));

  // await addStandardTopic(arena);
  // await addChoiceA(arena, BigNumber.from(0));

  // let m = await ethers.getContractFactory("Multicall2");
  // let multicall = await m.deploy();
  // console.log(multicall.address);

  if (network.name == "rinkeby") {
    let [owner] = await ethers.getSigners();
    let arenaAddress = "0x99b4ba32a258Add555B751C8C8B6a6673a284247";
    let arena = await ethers.getContractAt("Arena", arenaAddress);
    let topicId = BigNumber.from(0);
    let choiceId = BigNumber.from(0);
    let theWallets = await loadRinkebyWallets();
    for (let i = 0; i < 100; i += 2) {
      let v1 = await arena
        .connect(theWallets[i])
        .vote(topicId, choiceId, parseEther("0.001"));
      let v2 = await arena
        .connect(theWallets[i + 1])
        .vote(topicId, choiceId, parseEther("0.001"));

      await v2.wait(2);
      console.log(i);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
