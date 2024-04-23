import { toNano } from '@ton/core';
import { WalletV4 } from '../wrappers/WalletV4';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const walletV4 = provider.open(WalletV4.createFromConfig({}, await compile('WalletV4')));

    await walletV4.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(walletV4.address);

    // run methods on `walletV4`
}
