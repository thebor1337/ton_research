import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, ContractProvider, beginCell, toNano } from '@ton/core';
import { WalletV4 } from '../wrappers/WalletV4';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { KeyPair, mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

describe('WalletV4', () => {
    // let code: Cell;

    beforeAll(async () => {
        // code = await compile('WalletV4');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let wallet: WalletContractV4;
    let keyPair: KeyPair;
    let provider: ContractProvider;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        let mnemonics = await mnemonicNew();
        
        keyPair = await mnemonicToPrivateKey(mnemonics);

        let workchain = 0;
        wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });

        // walletV4 = blockchain.openContract(wallet);

        deployer = await blockchain.treasury('deployer');

        const result = await deployer.sendMessages([
            internal({
                value: toNano(1),
                to: wallet.address,
                body: beginCell().endCell(),
                init: wallet.init
            })
        ]);

        provider = blockchain.provider(
            wallet.address,
            wallet.init
        );
    });

    it('should deploy', async () => {
        let transfer = await wallet.sendTransfer(provider, {
            seqno: 1,
            secretKey: keyPair.secretKey,
            messages: [
                internal({
                    value: toNano('0.5'),
                    to: deployer.address,
                    body: 'Hello world',
                }),
            ],
        });

        console.log('balance', (await deployer.getBalance()).toString());
    });
});
