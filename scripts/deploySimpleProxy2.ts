import { toNano } from '@ton/core';
import { SimpleProxy2 } from '../wrappers/SimpleProxy2';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const simpleProxy2 = provider.open(SimpleProxy2.createFromConfig({}, await compile('SimpleProxy2')));

    await simpleProxy2.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(simpleProxy2.address);

    // run methods on `simpleProxy2`
}
