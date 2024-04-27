import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton/sandbox';
import { Cell, CommonMessageInfoInternal, Dictionary, DictionaryKey, DictionaryKeyTypes, DictionaryValue, SendMode, beginCell, fromNano, generateMerkleProof, toNano } from '@ton/core';
import { Playground } from '../wrappers/Playground';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Playground', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Playground');
    });

    let blockchain: Blockchain;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
    });

    // it("counter", async () => {
    //     const user1 = await blockchain.treasury('user1');
    //     const user2 = await blockchain.treasury('user2');

    //     const contract1 = blockchain.openContract(Playground.createFromConfig({
    //         owner: user1.address,
    //         counter: 0n
    //     }, code));

    //     const contract2 = blockchain.openContract(Playground.createFromConfig({
    //         owner: user2.address,
    //         counter: 0n
    //     }, code));

    //     // console.log("U1:", user1.address.toString());
    //     // console.log("U2:", user2.address.toString());

    //     // console.log("C1:", contract1.address.toString());
    //     // console.log("C2:", contract2.address.toString());

    //     const deployResult1 = await contract1.sendDeploy(user1.getSender(), toNano('1'));

    //     expect(deployResult1.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: contract1.address,
    //         deploy: true,
    //     });

    //     const deployResult2 = await contract2.sendDeploy(user2.getSender(), toNano('1'));

    //     expect(deployResult2.transactions).toHaveTransaction({
    //         from: user2.address,
    //         to: contract2.address,
    //         deploy: true,
    //     });

    //     const result = await contract1.sendProxy(
    //         user1.getSender(),
    //         toNano('1.0'),
    //         SendMode.PAY_GAS_SEPARATELY,
    //         contract2.address
    //     );

    //     console.log(await contract1.getData());
    //     console.log(await contract2.getData());

    //     printTransactionFees(result.transactions);
    // });

    describe("Merkle Tree", () => {
        let keyObject: DictionaryKey<bigint>;
        let valueObject: DictionaryValue<bigint>;
        let dict: Dictionary<bigint, bigint>;
        
        beforeEach(async () => {
            keyObject = Dictionary.Keys.BigUint(256);
            valueObject = Dictionary.Values.BigInt(32);
    
            dict = Dictionary.empty(keyObject, valueObject);
            for (let i = 0; i < 32; i++) {
                dict.set(BigInt(i), BigInt(i * 3));
            }
        });

        it("concept", async () => {
            const dictCell = beginCell()
                .storeDictDirect(dict)
                .endCell();

            const key = 1n;

            const merkleRoot = BigInt("0x" + dictCell.hash().toString('hex'));
            const merkleProof = generateMerkleProof(dict, key, keyObject);

            const merkleProofSlice = merkleProof.beginParse(true);

            const cellType = merkleProofSlice.loadUint(8);
            expect(cellType).toEqual(3);

            const calculatedMerkleRoot = merkleProofSlice.loadUintBig(256);
            expect(merkleRoot).toEqual(calculatedMerkleRoot);

            const merkleProofRef = merkleProofSlice.loadRef();
            const merkleProofDict = merkleProofRef.beginParse().loadDictDirect(keyObject, valueObject);

            expect(merkleProofDict.get(key)).not.toBeUndefined();
        });

        it("func", async () => {
            const key = 5n;

            const dictCell = beginCell()
                .storeDictDirect(dict)
                .endCell();

            const merkleProof = generateMerkleProof(dict, key, keyObject);
            const merkleRoot = BigInt("0x" + dictCell.hash().toString('hex'));

            const caller = await blockchain.treasury('caller');

            const contract = blockchain.openContract(Playground.createFromConfig({
                owner: caller.address,
                counter: 0n
            }, code));

            const result = await contract.sendMerkleProof(
                caller.getSender(),
                toNano('1.0'),
                key,
                merkleRoot,
                merkleProof
            );

            expect(result.transactions).toHaveTransaction({
                from: caller.address,
                to: contract.address,
                deploy: true,
                success: true
            });
        });
    });
});
