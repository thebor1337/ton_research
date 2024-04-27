import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JettonMasterConfig = {
    admin: Address;
    content: Cell;
    walletCode: Cell
};

export function jettonMasterConfigToCell(config: JettonMasterConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.admin)
        .storeRef(config.content)
        .storeRef(config.walletCode)
        .endCell();
}

export class JettonMaster implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonMaster(address);
    }

    static createFromConfig(config: JettonMasterConfig, code: Cell, workchain = 0) {
        const data = jettonMasterConfigToCell(config);
        const init = { code, data };
        return new JettonMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        forwardValue: bigint,
        recipient: Address,
        amount: bigint
    ) {
        await provider.internal(via, {
            value: value + forwardValue,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(21, 32) // op
                .storeUint(0, 64) // query_id
                .storeAddress(recipient) // to_address
                .storeCoins(forwardValue) // forward_value
                .storeRef( // master_msg
                    beginCell()
                    .storeUint(0x178d4519, 32) // internal_transfer
                    .storeUint(0, 64) // op
                    .storeCoins(amount) // jetton_amount
                    .storeAddress(this.address) // from_address
                    .storeAddress(this.address) // response_address
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell()
                )
                .endCell()
        });
    }

    async getWalletAddressOf(provider: ContractProvider, account: Address) {
        const { stack } = await provider.get('get_wallet_address', [{
            type: 'slice',
            cell: beginCell().storeAddress(account).endCell(),
        }]);

        return stack.readAddress();
    }
}
