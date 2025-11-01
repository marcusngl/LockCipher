import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from './Header';
import { DepositForm } from './DepositForm';
import { WithdrawForm } from './WithdrawForm';
import { VaultOverview } from './VaultOverview';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/VaultApp.css';

type StatusVariant = 'success' | 'error';

interface StatusMessage {
  variant: StatusVariant;
  message: string;
}

const CONTRACT_ADDRESS_TYPED = CONTRACT_ADDRESS as `0x${string}`;

export function VaultApp() {
  const { address } = useAccount();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const isReady = Boolean(address);

  const depositAmountQuery = useReadContract({
    address: CONTRACT_ADDRESS_TYPED,
    abi: CONTRACT_ABI,
    functionName: 'getDepositAmount',
    args: address ? [address] : undefined,
    query: {
      enabled: isReady,
      refetchInterval: 10000,
    },
  });

  const hasDepositQuery = useReadContract({
    address: CONTRACT_ADDRESS_TYPED,
    abi: CONTRACT_ABI,
    functionName: 'hasActiveDeposit',
    args: address ? [address] : undefined,
    query: {
      enabled: isReady,
      refetchInterval: 10000,
    },
  });

  const encryptedPasswordQuery = useReadContract({
    address: CONTRACT_ADDRESS_TYPED,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedPassword',
    args: address ? [address] : undefined,
    query: {
      enabled: isReady,
      refetchInterval: 15000,
    },
  });

  const activeWithdrawalQuery = useReadContract({
    address: CONTRACT_ADDRESS_TYPED,
    abi: CONTRACT_ABI,
    functionName: 'getActiveWithdrawalRequest',
    args: address ? [address] : undefined,
    query: {
      enabled: isReady,
      refetchInterval: 10000,
    },
  });

  const isFetching =
    depositAmountQuery.isFetching ||
    hasDepositQuery.isFetching ||
    encryptedPasswordQuery.isFetching ||
    activeWithdrawalQuery.isFetching;

  const overviewData = useMemo(
    () => ({
      lockedAmount: (depositAmountQuery.data as bigint | undefined) ?? undefined,
      hasActiveDeposit: (hasDepositQuery.data as boolean | undefined) ?? false,
      encryptedPassword: (encryptedPasswordQuery.data as string | undefined) ?? undefined,
      hasPendingWithdrawal: Boolean((activeWithdrawalQuery.data as readonly [boolean, bigint] | undefined)?.[0] ?? false),
      pendingRequestId: Number((activeWithdrawalQuery.data as readonly [boolean, bigint] | undefined)?.[1] ?? 0n),
    }),
    [
      depositAmountQuery.data,
      hasDepositQuery.data,
      encryptedPasswordQuery.data,
      activeWithdrawalQuery.data,
    ],
  );

  const refreshAll = async () => {
    await Promise.allSettled([
      depositAmountQuery.refetch(),
      hasDepositQuery.refetch(),
      encryptedPasswordQuery.refetch(),
      activeWithdrawalQuery.refetch(),
    ]);
  };

  const handleSuccess = async (message: string) => {
    setStatus({ variant: 'success', message });
    await refreshAll();
  };

  const handleError = (message: string) => {
    setStatus({ variant: 'error', message });
  };

  return (
    <div className="vault-app-wrapper">
      <Header />
      <main className="vault-main">
        <VaultOverview
          isConnected={isReady}
          isFetching={isFetching}
          address={address}
          lockedAmount={overviewData.lockedAmount}
          hasActiveDeposit={overviewData.hasActiveDeposit}
          encryptedPassword={overviewData.encryptedPassword}
          hasPendingWithdrawal={overviewData.hasPendingWithdrawal}
          pendingRequestId={overviewData.pendingRequestId}
          onRefresh={refreshAll}
        />

        {status && (
          <div className={`status-banner ${status.variant}`}>
            <span>{status.message}</span>
            <button type="button" onClick={() => setStatus(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="vault-forms">
          <DepositForm
            instance={instance}
            isInstanceLoading={isZamaLoading}
            instanceError={zamaError}
            hasActiveDeposit={overviewData.hasActiveDeposit}
            onSuccess={handleSuccess}
            onError={handleError}
          />
          <WithdrawForm
            instance={instance}
            isInstanceLoading={isZamaLoading}
            instanceError={zamaError}
            hasActiveDeposit={overviewData.hasActiveDeposit}
            hasPendingWithdrawal={overviewData.hasPendingWithdrawal}
            pendingRequestId={overviewData.pendingRequestId}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </main>
    </div>
  );
}
