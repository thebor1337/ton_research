import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, SendMode, beginCell, toNano } from '@ton/core';
import { Counter } from '../wrappers/Counter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Counter', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Counter');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counter: SandboxContract<Counter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        counter = blockchain.openContract(Counter.createFromConfig({ number: 0n }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await counter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counter.address,
            deploy: true
        });
    });

    it('should update the number', async () => {
        const caller = await blockchain.treasury('caller');

        await counter.sendNumber(caller.getSender(), toNano('0.05'), 42n);
        expect(await counter.getTotal()).toBe(42n);

        await counter.sendNumber(caller.getSender(), toNano('0.05'), 100n);
        expect(await counter.getTotal()).toBe(100n + 42n);
    });

    it("should throw if sent slice less than 32 bits", async () => {
        const caller = await blockchain.treasury('caller');

        const result = await counter.sendDeploy(caller.getSender(), toNano('0.05'));

        expect(result.transactions).toHaveTransaction({
            from: caller.address,
            to: counter.address,
            success: false,
            exitCode: 35
        });
    });
});
