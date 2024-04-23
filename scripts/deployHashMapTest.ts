import { toNano } from '@ton/core';
import { HashMapTest } from '../wrappers/HashMapTest';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const hashMapTest = provider.open(HashMapTest.createFromConfig({}, await compile('HashMapTest')));

    await hashMapTest.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(hashMapTest.address);

    // run methods on `hashMapTest`
}
