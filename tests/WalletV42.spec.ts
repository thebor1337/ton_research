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
    let walletV4: SandboxContract<WalletContractV4>;
    let keyPair: KeyPair;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const mnemonic = await mnemonicNew();
        keyPair = await mnemonicToPrivateKey(mnemonic);

        walletV4 = blockchain.openContract(
            WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
        );

        const deployer = await blockchain.treasury('deployer');

        await deployer.sendMessages([
            internal({
                value: toNano(1),
                to: walletV4.address,
                body: beginCell().endCell(),
                init: walletV4.init,
            }),
        ]);
    });

    it('should deploy', async () => {
        const walletBalance = await walletV4.getBalance();

        const user = await blockchain.treasury('user');
        const userBalance = await user.getBalance();

        const seqno = await walletV4.getSeqno();

        let transfer = await walletV4.sendTransfer({
            seqno: seqno,
            secretKey: keyPair.secretKey,
            messages: [
                internal({
                    value: toNano('0.25'),
                    to: user.address,
                    body: 'Hello world',
                }),
            ],
        });

        console.log('Deployer diff:', ((await user.getBalance()) - userBalance).toString());
        console.log('Wallet diff:', ((await walletV4.getBalance()) - walletBalance).toString());
    });
});
