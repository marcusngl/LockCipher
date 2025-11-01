import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">LockCipher Vault</h1>
            <p className="header-subtitle">Lock ETH with confidential numeric passwords secured by FHE</p>
          </div>
          <ConnectButton showBalance={false} label="Connect Wallet" chainStatus="icon" />
        </div>
      </div>
    </header>
  );
}
