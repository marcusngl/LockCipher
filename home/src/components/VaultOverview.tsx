import { formatEther } from 'viem';
import '../styles/VaultOverview.css';

interface VaultOverviewProps {
  isConnected: boolean;
  isFetching: boolean;
  address?: `0x${string}` | undefined;
  lockedAmount?: bigint;
  hasActiveDeposit: boolean;
  hasPendingWithdrawal: boolean;
  pendingRequestId: number;
  encryptedPassword?: string;
  onRefresh: () => Promise<void>;
}

function shortenCiphertext(ciphertext?: string) {
  if (!ciphertext) {
    return '—';
  }

  if (ciphertext === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return 'Not set';
  }

  return `${ciphertext.slice(0, 10)}…${ciphertext.slice(-6)}`;
}

export function VaultOverview({
  isConnected,
  isFetching,
  address,
  lockedAmount,
  hasActiveDeposit,
  hasPendingWithdrawal,
  pendingRequestId,
  encryptedPassword,
  onRefresh,
}: VaultOverviewProps) {
  const formattedAmount = lockedAmount && lockedAmount > 0n ? formatEther(lockedAmount) : '0';

  return (
    <section className="overview-card">
      <div className="overview-header">
        <div className="overview-text">
          <h2>Vault status</h2>
          <p>Monitor your encrypted position and refresh on-chain data anytime.</p>
        </div>
        <button type="button" className="vault-button ghost" onClick={onRefresh} disabled={!isConnected || isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!isConnected ? (
        <div className="overview-placeholder">Connect a wallet to inspect your vault.</div>
      ) : (
        <div className="overview-grid">
          <div className="overview-item">
            <span className="overview-label">Wallet</span>
            <span className="overview-value">{address}</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Locked Amount</span>
            <span className="overview-value">{formattedAmount} ETH</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Deposit Status</span>
            <span className={`overview-value ${hasActiveDeposit ? 'active' : 'inactive'}`}>
              {hasActiveDeposit ? 'Active' : 'No deposit'}
            </span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Withdrawal Request</span>
            <span className={`overview-value ${hasPendingWithdrawal ? 'active' : 'inactive'}`}>
              {hasPendingWithdrawal ? `Pending (#${pendingRequestId})` : 'None'}
            </span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Password Ciphertext</span>
            <span className="overview-value monospace">{shortenCiphertext(encryptedPassword)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
