import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, SendMode, beginCell, fromNano, toNano } from '@ton/core';
import { DepositTest } from '../wrappers/DepositTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
// import { TonClient, WalletContractV4, internal } from '@ton/ton';
// import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

describe('DepositTest', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('DepositTest');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let depositTest: SandboxContract<DepositTest>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        depositTest = blockchain.openContract(DepositTest.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await depositTest.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: depositTest.address,
            deploy: true,
            success: true,
        });
    });

    // it('test', async () => {
    //     let mnemonics = await mnemonicNew();
    //     let keyPair = await mnemonicToPrivateKey(mnemonics);

    //     let workchain = 0;
    //     let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });

    //     const walletContract = blockchain.openContract(wallet);

    //     let transfer = wallet.createTransfer({
    //         seqno: 1,
    //         secretKey: keyPair.secretKey,
    //         messages: [
    //             internal({
    //                 value: '1.5',
    //                 to: depositTest.address,
    //                 body: 'Hello world',
    //             }),
    //         ],
    //     });
    // });

    it('should deploy', async () => {
        const sender = await blockchain.treasury('sender');

        sender.createTransfer({
            messages: [],
        });

        const balance1 = await depositTest.getBalance();

        const depositResult = await depositTest.sendDeposit(
            sender.getSender(),
            toNano('1'),
            SendMode.PAY_GAS_SEPARATELY,
        );

        // 0 - 0.998683
        // 1 - 0.999683
        // 64 - 0.996746

        expect(depositResult.transactions).toHaveTransaction({
            from: sender.address,
            to: depositTest.address,
            success: false,
        });

        const balance2 = await depositTest.getBalance();

        console.log('Diff:', fromNano(balance2 - balance1), 'TON');
    });
});
