import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: ['contracts/usdt/jetton-minter.fc', 'contracts/usdt/jetton-wallet.fc'],
};
