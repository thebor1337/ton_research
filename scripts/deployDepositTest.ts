import { toNano } from '@ton/core';
import { DepositTest } from '../wrappers/DepositTest';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const depositTest = provider.open(DepositTest.createFromConfig({}, await compile('DepositTest')));

    await depositTest.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(depositTest.address);

    // run methods on `depositTest`
}
