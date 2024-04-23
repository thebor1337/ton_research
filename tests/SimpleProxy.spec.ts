import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, CommonMessageInfoInternal, beginCell, fromNano, toNano } from '@ton/core';
import { SimpleProxy } from '../wrappers/SimpleProxy';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('SimpleProxy', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SimpleProxy');
    });

    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let simpleProxy: SandboxContract<SimpleProxy>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        owner = await blockchain.treasury('deployer');

        simpleProxy = blockchain.openContract(
            SimpleProxy.createFromConfig(
                {
                    owner: owner.address,
                },
                code,
            ),
        );

        const deployResult = await simpleProxy.sendDeploy(owner.getSender(), toNano('0.01'));

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: simpleProxy.address,
            deploy: true,
            success: true,
        });
    });

    it('should forward to the owner', async () => {
        const caller = await blockchain.treasury('caller');

        const value = toNano('0.5');
        const delta = toNano('0.01');

        const body = beginCell()
            .storeStringTail('Hello, world!')
            .endCell();

        const result = await simpleProxy.sendMessage(
            caller.getSender(), 
            value, 
            body
        );

        expect(result.transactions).toHaveTransaction({
            from: simpleProxy.address,
            to: owner.address,
            success: true,
            body: beginCell()
                .storeAddress(caller.address)
                .storeRef(body)
                .endCell(),
            value: (x) => (x ? x >= value - delta && x <= value : false)
        });
    });

    it('should not forward from the owner to the owner', async () => {
        const result = await simpleProxy.sendMessage(
            owner.getSender(), 
            toNano('0.05'), 
            beginCell().endCell()
        );

        expect(result.transactions).not.toHaveTransaction({
            from: simpleProxy.address,
            to: owner.address,
            success: true,
        });
    });
});
