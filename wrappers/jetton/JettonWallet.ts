import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from "@ton/core";

export type JettonWalletConfig = {
    owner: Address;
    master: Address;
    walletCode: Cell;
};

export type JettonWalletData = JettonWalletConfig & { balance: bigint };

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.owner)
        .storeAddress(config.master)
        .storeRef(config.walletCode)
        .endCell();
}

export class JettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        forwardValue: bigint,
        recipient: Address,
        amount: bigint,
        forwardPayload: Cell,
    ) {
        await provider.internal(via, {
            value: value + forwardValue,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x0f8a7ea5, 32) // op = transfer
                .storeUint(0, 64) // query_id
                .storeCoins(amount) // jetton_amount
                .storeAddress(recipient) // owner_address
                .storeAddress(via.address) // response_address
                .storeUint(0, 1) // custom_payload
                .storeCoins(forwardValue) // forward_value
                .storeUint(1, 1) // ?
                .storeRef(forwardPayload) // either_forward_payload
                .endCell(),
        });
    }

    async getWalletData(provider: ContractProvider): Promise<JettonWalletData> {
        const { stack } = await provider.get("get_wallet_data", []);
        return {
            balance: stack.readBigNumber(),
            owner: stack.readAddress(),
            master: stack.readAddress(),
            walletCode: stack.readCell(),
        };
    }

    async getBalance(provider: ContractProvider) {
        const state = await provider.getState();
        if (state.state.type !== "active") {
            return undefined;
        }

        const { stack } = await provider.get("get_wallet_data", []);
        return stack.readBigNumber();
    }
}
