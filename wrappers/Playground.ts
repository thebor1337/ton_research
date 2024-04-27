import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from "@ton/core";

export type PlaygroundConfig = {
    owner: Address;
    counter: bigint;
};

export function playgroundConfigToCell(config: PlaygroundConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeUint(config.counter, 64)
        .endCell();
}

export class Playground implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

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

    async sendProxy(provider: ContractProvider, via: Sender, value: bigint, sendMode: SendMode, recipient: Address) {
        await provider.internal(via, {
            value,
            sendMode,
            body: beginCell()
                .storeUint(1, 32)
                .storeAddress(recipient)
                .endCell(),
        });
    }

    async sendMerkleProof(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint, 
        index: bigint,
        merkle_root: bigint,
        merkle_proof: Cell
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(index, 256)
                .storeUint(merkle_root, 256)
                .storeRef(merkle_proof)
                .endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const { stack } = await provider.get("get_storage_data", []);
        return {
            owner: stack.readAddress(),
            counter: stack.readBigNumber(),
        }
    }

    async getBalance(provider: ContractProvider) {
        const { stack } = await provider.get("balance", []);
        return stack.readBigNumber();
    }
}
