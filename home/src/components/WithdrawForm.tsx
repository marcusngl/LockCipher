import { type FormEvent, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/VaultForms.css';

interface WithdrawFormProps {
  instance: any;
  isInstanceLoading: boolean;
  instanceError: string | null;
  hasActiveDeposit: boolean;
  hasPendingWithdrawal: boolean;
  pendingRequestId: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const CONTRACT_ADDRESS_TYPED = CONTRACT_ADDRESS as `0x${string}`;
const MAX_PASSWORD = 2 ** 32 - 1;

export function WithdrawForm({
  instance,
  isInstanceLoading,
  instanceError,
  hasActiveDeposit,
  hasPendingWithdrawal,
  pendingRequestId,
  onSuccess,
  onError,
}: WithdrawFormProps) {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();

  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDisabled =
    !isConnected ||
    !hasActiveDeposit ||
    hasPendingWithdrawal ||
    isSubmitting ||
    isInstanceLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConnected || !address) {
      onError('Connect a wallet to unlock funds');
      return;
    }

    if (!hasActiveDeposit) {
      onError('No active deposit found for this wallet');
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

    const trimmedPassword = password.trim();
    if (trimmedPassword === '') {
      onError('Enter the numeric password you used to lock funds');
      return;
    }

    const numericPassword = Number(trimmedPassword);
    if (!Number.isInteger(numericPassword) || numericPassword < 0 || numericPassword > MAX_PASSWORD) {
      onError('Password must be an integer between 0 and 4,294,967,295');
      return;
    }

    setIsSubmitting(true);

    try {
      const inputBuilder = instance.createEncryptedInput(CONTRACT_ADDRESS_TYPED, address as string);
      inputBuilder.add32(numericPassword);
      const encrypted = await inputBuilder.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS_TYPED, CONTRACT_ABI, signer);
      const tx = await contract.withdraw(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      setPassword('');
      onSuccess('Withdrawal request sent. Await oracle confirmation.');
    } catch (error) {
      console.error('Withdraw failed:', error);
      onError('Failed to unlock funds. Double-check the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="vault-card">
      <h2 className="vault-card-title">Unlock Funds</h2>
      <p className="vault-card-description">Provide the original numeric password. Only the correct encrypted input can release your ETH.</p>

      {instanceError && <div className="inline-alert">{instanceError}</div>}
      {hasPendingWithdrawal && (
        <div className="inline-alert">
          Withdrawal request #{pendingRequestId} is awaiting oracle confirmation. You will be able to submit another request once it completes.
        </div>
      )}

      <form className="vault-form" onSubmit={handleSubmit}>
        <label className="vault-label">
          Numeric Password
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="vault-input"
            min={0}
            max={MAX_PASSWORD}
            disabled={isSubmitting || hasPendingWithdrawal}
          />
        </label>

        <button type="submit" className="vault-button secondary" disabled={submitDisabled}>
          {isSubmitting ? 'Unlocking...' : hasPendingWithdrawal ? 'Pending...' : 'Unlock ETH'}
        </button>
      </form>

      {!hasActiveDeposit && <p className="vault-helper">Lock funds first to activate this form.</p>}
    </section>
  );
}
