import "@ton/test-utils";
import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from "@ton/sandbox";
import { Cell, SendMode, beginCell, fromNano, toNano } from "@ton/core";
import { compile } from "@ton/blueprint";
import {
    AirdropEntryKey,
    AirdropEntryValue,
    AirdropMaster,
    AirdropTree,
    generateAirdropTree,
    getAirdropTreeRoot,
} from "../wrappers/airdrop/AirdropMaster";
import { JettonWallet } from "../wrappers/jetton/JettonWallet";
import { JettonMaster } from "../wrappers/jetton/JettonMaster";
import { AirdropWallet } from "../wrappers/airdrop/AirdropWallet";

describe("Airdrop", () => {
    let masterCode: Cell;
    let airdropWalletCode: Cell;

    let jettonMasterCode: Cell;
    let jettonWalletCode: Cell;

    beforeAll(async () => {
        masterCode = await compile("airdrop/AirdropMaster");
        airdropWalletCode = await compile("airdrop/AirdropWallet");
        jettonMasterCode = await compile("jetton/JettonMaster");
        jettonWalletCode = await compile("jetton/JettonWallet");
    });

    let blockchain: Blockchain;
    let airdropMasterContract: SandboxContract<AirdropMaster>;
    let tree: AirdropTree;
    let root: bigint;

    let jettonMasterContract: SandboxContract<JettonMaster>;
    let jettonPoolWallet: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const numEntries = 32;

        const entries = [];
        for (let i = 0; i < numEntries; i++) {
            entries.push({
                address: (await blockchain.treasury(`user${i}`)).address,
                amount: toNano(Math.random() + 1),
            });
        }

        tree = generateAirdropTree(entries);
        root = getAirdropTreeRoot(tree);

        const deployer = await blockchain.treasury("deployer");

        jettonMasterContract = blockchain.openContract(
            JettonMaster.createFromConfig(
                {
                    admin: deployer.address,
                    content: beginCell().endCell(),
                    walletCode: jettonWalletCode,
                },
                jettonMasterCode,
            ),
        );

        const deployJettonMasterResult = await jettonMasterContract.sendDeploy(deployer.getSender(), toNano("0.05"));

        expect(deployJettonMasterResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMasterContract.address,
            deploy: true,
        });

        airdropMasterContract = blockchain.openContract(
            AirdropMaster.createFromConfig(
                {
                    merkleRoot: root,
                    walletCode: airdropWalletCode,
                },
                masterCode,
            ),
        );

        const jettonPoolWalletAddress = await jettonMasterContract.getWalletAddressOf(airdropMasterContract.address);

        const airdropMasterDeployResult = await airdropMasterContract.sendDeploy(
            deployer.getSender(),
            toNano("0.05"),
            jettonPoolWalletAddress,
        );

        expect(airdropMasterDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: airdropMasterContract.address,
            deploy: true,
        });

        const mintResult = await jettonMasterContract.sendMint(
            deployer.getSender(),
            toNano("0.05"),
            toNano("0.05"),
            airdropMasterContract.address,
            toNano("1000"),
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: jettonMasterContract.address,
            to: jettonPoolWalletAddress,
            deploy: true,
        });

        jettonPoolWallet = blockchain.openContract(JettonWallet.createFromAddress(jettonPoolWalletAddress));

        expect(await jettonPoolWallet.getBalance()).toEqual(toNano("1000"));
    });

    it("should deploy", () => {});

    it("should claim", async () => {
        const index = 5n;
        const user = await blockchain.treasury(`user${index}`);
        const jettonUserWalletAddress = await jettonMasterContract.getWalletAddressOf(user.address);

        const entry = tree.get(index);
        expect(entry).not.toBeUndefined();

        const proof = tree.generateMerkleProof(index);

        const airdropWalletContract = blockchain.openContract(
            AirdropWallet.createFromConfig(
                {
                    master: airdropMasterContract.address,
                    proofHash: BigInt("0x" + proof.hash().toString("hex")),
                    index,
                },
                airdropWalletCode,
            ),
        );

        const computedAirdropWalletAddress = await airdropMasterContract.getWalletAddress(
            user.address,
            BigInt("0x" + proof.hash().toString("hex")),
            index,
        );

        expect(airdropWalletContract.address.toString()).toEqual(computedAirdropWalletAddress.toString());

        const deployResult = await airdropWalletContract.sendDeploy(user.getSender());
        expect(deployResult.transactions).toHaveTransaction({
            from: user.address,
            to: airdropWalletContract.address,
            deploy: true,
        });

        const claimResult = await airdropWalletContract.sendClaim(proof);
        expect(claimResult.transactions).toHaveTransaction({
            from: jettonPoolWallet.address,
            to: jettonUserWalletAddress,
            success: true,
        });

        const jettonUserWallet = blockchain.openContract(JettonWallet.createFromAddress(jettonUserWalletAddress));
        expect(await jettonUserWallet.getBalance()).toEqual(entry?.amount);
    });
});
