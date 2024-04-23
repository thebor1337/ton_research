import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SimpleProxyConfig = {
    owner: Address;
};

export function simpleProxyConfigToCell(config: SimpleProxyConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .endCell();
}

export class SimpleProxy implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SimpleProxy(address);
    }

    static createFromConfig(config: SimpleProxyConfig, code: Cell, workchain = 0) {
        const data = simpleProxyConfigToCell(config);
        const init = { code, data };
        return new SimpleProxy(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMessage(provider: ContractProvider, via: Sender, value: bigint, body: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body
        });
    }
}
