import { toNano } from '@ton/core';
import { SimpleProxy } from '../wrappers/SimpleProxy';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const simpleProxy = provider.open(SimpleProxy.createFromConfig({}, await compile('SimpleProxy')));

    await simpleProxy.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(simpleProxy.address);

    // run methods on `simpleProxy`
}
