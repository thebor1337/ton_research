import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SimpleProxy2Config = {
    manager: Address
};

export function simpleProxy2ConfigToCell(config: SimpleProxy2Config): Cell {
    return beginCell()
        .storeAddress(config.manager)
        .storeUint(0, 2)
        .endCell();
}

export class SimpleProxy2 implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SimpleProxy2(address);
    }

    static createFromConfig(config: SimpleProxy2Config, code: Cell, workchain = 0) {
        const data = simpleProxy2ConfigToCell(config);
        const init = { code, data };
        return new SimpleProxy2(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendChangeAddress(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint, 
        queryId: bigint,
        newAddress: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(queryId, 64)
                .storeAddress(newAddress)
                .endCell(),
        });
    }

    async sendRequestAddress(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint, 
        queryId: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(queryId, 64)
                .endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const { stack } = await provider.get('get_storage_data', []);
        return {
            manager: stack.readAddress(),
            memorized: stack.readAddressOpt()
        }
    }
}
