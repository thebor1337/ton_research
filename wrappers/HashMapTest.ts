import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleItemInt } from '@ton/core';

export type HashMapTestConfig = {};

export function hashMapTestConfigToCell(config: HashMapTestConfig): Cell {
    return beginCell().endCell();
}

export class HashMapTest implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new HashMapTest(address);
    }

    static createFromConfig(config: HashMapTestConfig, code: Cell, workchain = 0) {
        const data = hashMapTestConfigToCell(config);
        const init = { code, data };
        return new HashMapTest(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendAddRequest(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        key: bigint,
        valid_until: number,
        address: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(key, 256)
                .storeUint(valid_until, 64)
                .storeAddress(address)
                .endCell()
        });
    }

    async sendRemoveRequest(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        key: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(key, 256)
                .endCell()
        });
    }

    async sendCleanRequest(
        provider: ContractProvider,
        via: Sender,
        value: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .endCell()
        });
    }

    async getKey(
        provider: ContractProvider,
        key: bigint
    ) {
        const huy = await provider.get('get_key', [{
            type: 'int',
            value: key
        }]);
        const { stack } = await provider.get('get_key', [{
            type: 'int',
            value: key
        }])
        return {
            validUntil: stack.readNumber(), 
            address: stack.readAddress()
        };
    }
}
