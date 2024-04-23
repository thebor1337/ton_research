import { toNano } from '@ton/core';
import { Playground } from '../wrappers/Playground';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const playground = provider.open(Playground.createFromConfig({}, await compile('Playground')));

    await playground.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(playground.address);

    // run methods on `playground`
}
