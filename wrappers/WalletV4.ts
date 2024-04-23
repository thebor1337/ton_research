import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type WalletV4Config = {};

export function walletV4ConfigToCell(config: WalletV4Config): Cell {
    return beginCell().endCell();
}

export class WalletV4 implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new WalletV4(address);
    }

    static createFromConfig(config: WalletV4Config, code: Cell, workchain = 0) {
        const data = walletV4ConfigToCell(config);
        const init = { code, data };
        return new WalletV4(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
