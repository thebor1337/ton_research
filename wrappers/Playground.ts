import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type PlaygroundConfig = {};

export function playgroundConfigToCell(config: PlaygroundConfig): Cell {
    return beginCell().endCell();
}

export class Playground implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Playground(address);
    }

    static createFromConfig(config: PlaygroundConfig, code: Cell, workchain = 0) {
        const data = playgroundConfigToCell(config);
        const init = { code, data };
        return new Playground(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMessage(provider: ContractProvider, via: Sender, value: bigint, sendMode: SendMode) {
        await provider.internal(via, {
            value,
            sendMode,
            body: beginCell().endCell(),
        });
    }

    async getBalance(provider: ContractProvider) {
        const { stack } = await provider.get('balance', []);
        return stack.readBigNumber();
    }
}
