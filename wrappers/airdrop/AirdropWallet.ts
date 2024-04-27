import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type AirdropWalletConfig = {
    master: Address,
    proofHash: bigint,
    index: bigint
};

export function airdropWalletConfigToCell(config: AirdropWalletConfig): Cell {
    return beginCell()
        .storeUint(0, 1)
        .storeAddress(config.master)
        .storeUint(config.proofHash, 256)
        .storeUint(config.index, 256)
        .endCell();
}

export class AirdropWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AirdropWallet(address);
    }

    static createFromConfig(config: AirdropWalletConfig, code: Cell, workchain = 0) {
        const data = airdropWalletConfigToCell(config);
        const init = { code, data };
        return new AirdropWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(
        provider: ContractProvider, 
        via: Sender, 
    ) {
        await provider.internal(via, {
            value: 50000000n * 3n
        });
    }

    async sendClaim(
        provider: ContractProvider,
        proof: Cell        
    ) {
        await provider.external(
            beginCell()
            .storeUint(0, 64) // query_id
            .storeRef(proof)
            .endCell()
        );
    }
}
