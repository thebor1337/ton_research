import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DepositTestConfig = {};

export function depositTestConfigToCell(config: DepositTestConfig): Cell {
    return beginCell().endCell();
}

export class DepositTest implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new DepositTest(address);
    }

    static createFromConfig(config: DepositTestConfig, code: Cell, workchain = 0) {
        const data = depositTestConfigToCell(config);
        const init = { code, data };
        return new DepositTest(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        mode: SendMode | undefined = SendMode.PAY_GAS_SEPARATELY,
    ) {
        await provider.internal(via, {
            value,
            sendMode: mode,
            body: beginCell().endCell(),
        });
    }

    async getBalance(provider: ContractProvider) {
        const { stack } = await provider.get('my_balance', []);
        return stack.readNumber();
    }
}
