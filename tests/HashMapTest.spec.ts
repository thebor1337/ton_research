import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { Cell, beginCell, toNano } from "@ton/core";
import { HashMapTest } from "../wrappers/HashMapTest";
import "@ton/test-utils";
import { compile } from "@ton/blueprint";

describe("HashMapTest", () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile("HashMapTest");
    });

    const getKey = async (key: bigint) => {
        const getResult = hashMapTest.getKey(key);
        await expect(getResult).resolves.not.toThrow();
        return await getResult;
    };

    let now: number;
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let hashMapTest: SandboxContract<HashMapTest>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        now = 500;
        blockchain.now = now;

        hashMapTest = blockchain.openContract(HashMapTest.createFromConfig({}, code));

        deployer = await blockchain.treasury("deployer");

        const deployResult = await hashMapTest.sendDeploy(deployer.getSender(), toNano("0.05"));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: hashMapTest.address,
            deploy: true,
        });
    });

    it("should throw if unknown method called", async () => {
        const caller = await blockchain.treasury("caller");
        
        const result = await caller.send({
            to: hashMapTest.address,
            value: toNano("0.05"),
            body: beginCell()
                .storeUint(4, 32)
                .endCell()
        });

        expect(result.transactions).toHaveTransaction({
            from: caller.address,
            to: hashMapTest.address,
            success: false,
            exitCode: 1001
        });
    });

    describe("Add", () => {
        let caller: SandboxContract<TreasuryContract>;
        let key: bigint;

        beforeEach(async () => {
            caller = await blockchain.treasury("caller");
            key = 1234n;
        });

        it("should add", async () => {
            const result = await hashMapTest.sendAddRequest(
                caller.getSender(),
                toNano("0.05"),
                key,
                now + 60,
                caller.address
            );
    
            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: true,
            });

            const getKeyResult = await getKey(key);
            expect(getKeyResult.address.toString()).toEqual(caller.address.toString());
            expect(getKeyResult.validUntil).toEqual(now + 60);
        });

        it("should update if the key already exists", async () => {
            await hashMapTest.sendAddRequest(
                caller.getSender(),
                toNano("0.05"),
                key,
                now + 60,
                caller.address
            );

            const result = await hashMapTest.sendAddRequest(
                caller.getSender(),
                toNano("0.05"),
                key,
                now + 120,
                deployer.address
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: true
            });

            const getKeyResult = await getKey(key);
            expect(getKeyResult.address.toString()).toEqual(deployer.address.toString());
            expect(getKeyResult.validUntil).toEqual(now + 120);
        });

        it("should not add if the key data is already expired", async () => {
            const result = await hashMapTest.sendAddRequest(
                caller.getSender(),
                toNano("0.05"),
                key,
                now - 60,
                deployer.address
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: false,
                exitCode: 1000
            });
        });
    });

    describe("Remove", () => {

        let caller: SandboxContract<TreasuryContract>;
        let key: bigint;

        beforeEach(async () => {
            caller = await blockchain.treasury("caller");
            key = 1234n;
        });

        it("should remove the key", async () => {
            await hashMapTest.sendAddRequest(
                caller.getSender(),
                toNano("0.05"),
                key,
                now + 60,
                caller.address
            )

            const result = await hashMapTest.sendRemoveRequest(
                caller.getSender(),
                toNano("0.05"),
                key
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: true,
            });

            await expect(hashMapTest.getKey(key)).rejects.toThrow();
        });

        it("should throw if key does not exist", async () => {
            const result = await hashMapTest.sendRemoveRequest(
                caller.getSender(),
                toNano("0.05"),
                key
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: false,
                exitCode: 1002
            });
        });

        it("should revert if extra data attached to the request", async () => {
            const result = await caller.send({
                to: hashMapTest.address,
                value: toNano('0.05'),
                body: beginCell()
                    .storeUint(2, 32)
                    .storeUint(0, 64)
                    .endCell()
            });

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: false,
                exitCode: 9
            });
        });
    });

    describe("Clean", () => {

        let caller: SandboxContract<TreasuryContract>;

        beforeEach(async () => {
            caller = await blockchain.treasury("caller");
        });

        it("should not do anything if dict is empty", async () => {
            const result = await hashMapTest.sendCleanRequest(
                caller.getSender(),
                toNano("0.05")
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: true
            });
        });

        it("should remove all expired keys", async () => {
            const data = [
                { key: 1234n, validUntil: now + 60 },
                { key: 4567n, validUntil: now + 120 },
                { key: 8910n, validUntil: now + 180 }
            ];

            for (const { key, validUntil } of data) {
                await hashMapTest.sendAddRequest(
                    caller.getSender(),
                    toNano("0.05"),
                    key,
                    validUntil,
                    caller.address
                );
            }

            blockchain.now = now + 130;

            const result = await hashMapTest.sendCleanRequest(
                caller.getSender(),
                toNano("0.05")
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: true
            });

            await expect(hashMapTest.getKey(data[0].key)).rejects.toThrow();
            await expect(hashMapTest.getKey(data[1].key)).rejects.toThrow();
            await expect(hashMapTest.getKey(data[2].key)).resolves.not.toThrow();
        });

        it("should revert if extra data attached to the request", async () => {
            const result = await caller.send({
                to: hashMapTest.address,
                value: toNano('0.05'),
                body: beginCell()
                    .storeUint(3, 32)
                    .storeUint(0, 64)
                    .endCell()
            });

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: hashMapTest.address,
                success: false,
                exitCode: 9
            });
        });
    });
});
