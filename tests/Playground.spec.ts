import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton/sandbox';
import { Cell, CommonMessageInfoInternal, SendMode, fromNano, toNano } from '@ton/core';
import { Playground } from '../wrappers/Playground';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Playground', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Playground');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let playground: SandboxContract<Playground>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        playground = blockchain.openContract(Playground.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await playground.sendDeploy(deployer.getSender(), toNano('1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: playground.address,
            deploy: true,
        });
    });

    it('mode = 0', async () => {
        const caller = await blockchain.treasury('caller');

        const playgroundBalance = await playground.getBalance();
        const callerBalance = await caller.getBalance();

        const amount = toNano('0.005');
        const result = await playground.sendMessage(
            caller.getSender(), 
            amount, 
            SendMode.PAY_GAS_SEPARATELY
        );

        const newPlaygroundBalance = await playground.getBalance();
        const newCallerBalance = await caller.getBalance();

        console.log('Caller diff:', fromNano(newCallerBalance - callerBalance), 'TON');
        console.log('Playground diff:', fromNano(newPlaygroundBalance - playgroundBalance), 'TON');

        prettyLogTransactions(result.transactions);
        printTransactionFees(result.transactions);
    });
});
