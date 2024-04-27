import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, SendMode, beginCell, toNano } from '@ton/core';
import { Usdt } from '../wrappers/Usdt';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('USDT', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Usdt');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    // let counter: SandboxContract<Counter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // counter = blockchain.openContract(Counter.createFromConfig({ number: 0n }, code));

        deployer = await blockchain.treasury('deployer');

        // const deployResult = await counter.sendDeploy(deployer.getSender(), toNano('0.05'));

        // expect(deployResult.transactions).toHaveTransaction({
        //     from: deployer.address,
        //     to: counter.address,
        //     deploy: true
        // });
    });
});
