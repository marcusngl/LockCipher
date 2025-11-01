# LockCipher Frontend

This Vite + React application provides the user interface for the **LockCipher Vault**, an ETH staking flow secured by Zama's Fully Homomorphic Encryption (FHE). Users can:

- Connect a Sepolia wallet via RainbowKit/Wagmi.
- Lock ETH together with an encrypted numeric password generated through the Zama relayer SDK.
- Request withdrawals by submitting the same password, which triggers an on-chain decryption cycle handled by the FHE oracle.
- Track encrypted state, active balances, and pending withdrawal requests without ever exposing the clear password on-chain.

## Tech Stack

- **React 19 + TypeScript** bundled with **Vite**
- **Wagmi** for viem-powered contract reads and **ethers v6** for writes
- **RainbowKit** for wallet connectivity (using the injected connector)
- **@zama-fhe/relayer-sdk** to build encrypted inputs client-side

## Available Scripts

```bash
npm install     # Install dependencies
npm run dev     # Start a local dev server
npm run build   # Type-check and bundle the production build
npm run preview # Serve the built assets locally
```

The build output lives in `dist/` and is free of environment variables, local storage access, and Tailwind CSS, matching the project constraints.

## Configuration

- The dapp targets the Sepolia network via the public RPC `https://rpc.sepolia.org`.
- Contract metadata lives in `src/config/contracts.ts`; update `CONTRACT_ADDRESS` after deploying the smart contract and keep the ABI in sync with artifacts under `deployments/sepolia`.
- Writes use the injected wallet signer (Metamask or any browser wallet); reads rely on wagmi/viem, ensuring performant cached queries.

## Folder Highlights

- `src/components/` – UI building blocks such as `VaultApp`, `DepositForm`, `WithdrawForm`, and `VaultOverview`.
- `src/styles/` – Pure CSS modules implementing the project theme (no Tailwind).
- `src/hooks/` – Pre-existing hooks for signer access and Zama SDK initialization (kept untouched as required).

## Running With the Contract

1. Deploy `LockCipherVault.sol` on Sepolia and copy the resulting address into `src/config/contracts.ts`.
2. Ensure the ABI in that file matches the generated JSON inside `deployments/sepolia/LockCipherVault.json`.
3. Start the frontend with `npm run dev` and connect using an injected wallet on the Sepolia network.

With these steps complete, users can privately lock ETH and unlock it only after the Zama oracle confirms the encrypted password match.
