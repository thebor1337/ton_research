import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryKey, generateMerkleProof, Sender, SendMode, Slice } from '@ton/core';

export type AirdropMasterConfig = {
    merkleRoot: bigint,
    walletCode: Cell
};

export function airdropMasterConfigToCell(config: AirdropMasterConfig): Cell {
    return beginCell()
        .storeUint(0, 2) // null jetton_wallet
        .storeUint(config.merkleRoot, 256) // merkle_root
        .storeRef(config.walletCode) // wallet_code
        .endCell();
}

export type AirdropEntry = {
    address: Address;
    amount: bigint;
}

export type AirdropTree = Dictionary<bigint, AirdropEntry>;

export const AirdropEntryKey = Dictionary.Keys.BigUint(256);
export const AirdropEntryValue = {
    serialize: (value: AirdropEntry, builder: Builder) => {
        builder
            .storeAddress(value.address)
            .storeCoins(value.amount);
    },
    parse: (cs: Slice) => {
        return {
            address: cs.loadAddress(),
            amount: cs.loadCoins()
        };        
    }
};

export const generateAirdropTree = (entries: AirdropEntry[]): AirdropTree => {
    const dict = Dictionary.empty(AirdropEntryKey, AirdropEntryValue);
    for (let i = 0; i < entries.length; i++) {
        dict.set(BigInt(i), entries[i]);
    }
    return dict;
};

export const getAirdropTreeRoot = (tree: Dictionary<bigint, AirdropEntry>) => {
    const cell = beginCell()
        .storeDictDirect(tree)
        .endCell();
    return BigInt("0x" + cell.hash().toString('hex'));
};

export class AirdropMaster implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AirdropMaster(address);
    }

    static createFromConfig(config: AirdropMasterConfig, code: Cell, workchain = 0) {
        const data = airdropMasterConfigToCell(config);
        const init = { code, data };
        return new AirdropMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint,
        jettonWallet: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x610ca46c, 32)
                .storeUint(0, 64)
                .storeAddress(jettonWallet)
                .endCell(),
        });
    }

    async getWalletAddress(
        provider: ContractProvider,
        owner: Address,
        proofHash: bigint,
        index: bigint
    ) {
        const { stack } = await provider.get("get_wallet_address", [
            {
                type: "slice",
                cell: beginCell().storeAddress(owner).endCell()
            },
            {
                type: "int",
                value: proofHash
            },
            {
                type: "int",
                value: index
            }
        ]);

        return stack.readAddress();
    }
}
