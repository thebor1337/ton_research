import { toNano } from '@ton/core';
import { TonTest } from '../wrappers/TonTest';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonTest = provider.open(
        TonTest.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('TonTest')
        )
    );

    await tonTest.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tonTest.address);

    console.log('ID', await tonTest.getID());
}
