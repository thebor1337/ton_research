import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, address, beginCell, toNano } from '@ton/core';
import { SimpleProxy2 } from '../wrappers/SimpleProxy2';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('SimpleProxy2', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SimpleProxy2');
    });

    let blockchain: Blockchain;
    let simpleProxy2: SandboxContract<SimpleProxy2>;
    let manager: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        manager = await blockchain.treasury('manager');

        simpleProxy2 = blockchain.openContract(SimpleProxy2.createFromConfig({
            manager: manager.address
        }, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await simpleProxy2.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: simpleProxy2.address,
            deploy: true
        });
    });

    it('should change address', async () => {
        const newAddress = (await blockchain.treasury('newAddress')).address;

        const changeResult = await simpleProxy2.sendChangeAddress(
            manager.getSender(),
            toNano('0.05'),
            42n,
            newAddress
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: manager.address,
            to: simpleProxy2.address,
            success: true
        });

        const data = await simpleProxy2.getData();

        expect(data.manager.toString()).toEqual(manager.address.toString());
        expect(data.memorized?.toString()).toEqual(newAddress.toString());
    });

    it("should throw if not manager calls change address", async () => {
        const newAddress = (await blockchain.treasury('newAddress')).address;
        const user = await blockchain.treasury('user');

        const changeResult = await simpleProxy2.sendChangeAddress(
            user.getSender(),
            toNano('0.05'),
            42n,
            newAddress
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: user.address,
            to: simpleProxy2.address,
            success: false,
            exitCode: 1001
        });
    });

    it("should request address", async () => {
        const newAddress = (await blockchain.treasury('newAddress')).address;
        const caller = await blockchain.treasury('caller');

        await simpleProxy2.sendChangeAddress(
            manager.getSender(),
            toNano('0.05'),
            42n,
            newAddress
        );

        const queryId = 101n;
        const value = toNano('1');
        const delta = toNano('0.01');

        const requestResult = await simpleProxy2.sendRequestAddress(
            caller.getSender(),
            value,
            queryId
        );

        expect(requestResult.transactions).toHaveTransaction({
            from: simpleProxy2.address,
            to: caller.address,
            success: true,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(queryId, 64)
                .storeAddress(manager.address)
                .storeAddress(newAddress)
                .endCell(),
            value: (x) => (x ? x >= value - delta && x <= value : false)
        });
    });

    it("should revert for other ops", async () => {
        const caller = await blockchain.treasury('caller');

        const result = await caller.send({
            to: simpleProxy2.address,
            value: toNano('1'),
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(42, 64)
                .endCell()
        });

        expect(result.transactions).toHaveTransaction({
            from: caller.address,
            to: simpleProxy2.address,
            success: false,
            exitCode: 3
        });
    });
});
