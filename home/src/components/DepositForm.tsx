import { type FormEvent, useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/VaultForms.css';

interface DepositFormProps {
  instance: any;
  isInstanceLoading: boolean;
  instanceError: string | null;
  hasActiveDeposit: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const CONTRACT_ADDRESS_TYPED = CONTRACT_ADDRESS as `0x${string}`;
const MAX_PASSWORD = 2 ** 32 - 1;

export function DepositForm({
  instance,
  isInstanceLoading,
  instanceError,
  hasActiveDeposit,
  onSuccess,
  onError,
}: DepositFormProps) {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();

  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDisabled = !isConnected || isSubmitting || isInstanceLoading || hasActiveDeposit;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConnected || !address) {
      onError('Connect a wallet before locking ETH');
      return;
    }

    if (!instance) {
      onError('Encryption service is not ready yet');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      onError('Unable to access signer');
      return;
    }

    const trimmedAmount = amount.trim();
    const trimmedPassword = password.trim();

    if (trimmedAmount === '' || trimmedPassword === '') {
      onError('Enter both an amount and a numeric password');
      return;
    }

    const numericPassword = Number(trimmedPassword);
    if (!Number.isInteger(numericPassword) || numericPassword < 0 || numericPassword > MAX_PASSWORD) {
      onError('Password must be an integer between 0 and 4,294,967,295');
      return;
    }

    let parsedAmount;
    try {
      parsedAmount = parseEther(trimmedAmount);
    } catch (error) {
      onError('Enter a valid ETH amount');
      return;
    }

    if (parsedAmount <= 0n) {
      onError('Amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);

    try {
      const inputBuilder = instance.createEncryptedInput(CONTRACT_ADDRESS_TYPED, address as string);
      inputBuilder.add32(numericPassword);
      const encrypted = await inputBuilder.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS_TYPED, CONTRACT_ABI, signer);
      const tx = await contract.deposit(encrypted.handles[0], encrypted.inputProof, { value: parsedAmount });

      await tx.wait();

      setAmount('');
      setPassword('');
      onSuccess(`Locked ${trimmedAmount} ETH with encrypted password`);
    } catch (error) {
      console.error('Deposit failed:', error);
      onError('Failed to lock funds. Check logs for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="vault-card">
      <h2 className="vault-card-title">Lock Funds</h2>
      <p className="vault-card-description">Stake ETH with a confidential numeric password. The password never leaves your device in clear text.</p>

      {instanceError && <div className="inline-alert">{instanceError}</div>}
      {hasActiveDeposit && <div className="inline-alert">Unlock your current deposit before locking additional funds.</div>}

      <form className="vault-form" onSubmit={handleSubmit}>
        <label className="vault-label">
          Amount (ETH)
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.5"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="vault-input"
            disabled={isSubmitting}
          />
        </label>

        <label className="vault-label">
          Numeric Password
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter a number"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="vault-input"
            min={0}
            max={MAX_PASSWORD}
            disabled={isSubmitting}
          />
        </label>

        <button type="submit" className="vault-button primary" disabled={submitDisabled}>
          {isSubmitting ? 'Locking...' : hasActiveDeposit ? 'Deposit Active' : 'Lock ETH'}
        </button>
      </form>

      <p className="vault-helper">
        Encryption powered by Zama Relayer. Only the matching encrypted password can unlock your funds. Unlock existing
        deposits before locking new funds.
      </p>
    </section>
  );
}
