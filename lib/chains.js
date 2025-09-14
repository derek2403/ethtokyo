import { defineChain } from 'viem';

export const jscKaiganTestnet = defineChain({
  id: 5278000,
  name: 'JSC Kaigan Testnet',
  network: 'jsc-kaigan-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'JSC Testnet Ether',
    symbol: 'JETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.kaigan.jsc.dev/rpc?token=8O6QnGw0yT6Nxjp-wskWZ1FX7PBPVjJ65aarF_ebDNo',
      ],
      // webSocket: ['wss://rpc.kaigan.jsc.dev/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'JSC Explorer',
      url: 'https://explorer.kaigan.jsc.dev',
    },
  },
});
