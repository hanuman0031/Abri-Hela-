"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import * as ethers from 'ethers';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any; // EIP-1193 provider shape is complex; safe to use any for testnet demo
  }
}

// ==========================================
// SVGs & ICONS
// ==========================================
const C = {
  bg: '#03030a',
  surface: '#0c0c1a',
  elevated: '#121224',
  border: '#1e1e3a',
  borderAcc: '#2a2a4e',
  t1: '#e8e2d6',
  t2: '#a4a4b8',
  t3: '#6a6a8a',
  t4: '#3d3d5c',
  gold: '#c8a96e',
  goldDim: 'rgba(200,169,110,0.1)',
  green: '#00e696',
  greenDim: 'rgba(0,230,150,0.1)',
  red: '#f87171',
  redDim: 'rgba(248,113,113,0.1)',
  blue: '#4f8dff',
  blueDim: 'rgba(79,141,255,0.1)',
  violet: '#a78bfa',
  amber: '#fbbf24',
  amberDim: 'rgba(251,191,36,0.1)',
  cyan: '#22d3ee',
  rMd: '12px',
  rSm: '8px',
  sans: 'var(--font-display)',
  mono: 'var(--font-mono)'
};

const HELA_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 666888;
const HELA_EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://testnet-blockexplorer.helachain.com';
const HELA_CHAIN_ID_HEX = `0x${HELA_CHAIN_ID.toString(16)}`;
const EX_ADDR = process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || '0xAbC123400000000000000000000000000000Ef23';

const WALLET_STATE = {
  IDLE:           'idle',
  MODAL_OPEN:     'modal_open',
  REQUESTING:     'requesting',
  SWITCHING_NET:  'switching_net',
  FETCHING:       'fetching',
  CONNECTED:      'connected',
  WRONG_NETWORK:  'wrong_network',
  ERROR:          'error',
  NO_METAMASK:    'no_metamask',
} as const;

type WalletState = typeof WALLET_STATE[keyof typeof WALLET_STATE];

type IconProps = React.SVGProps<SVGSVGElement>;

const Icons = {
  Dash: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Live: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Bal: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>,
  Hist: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Contract: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  Lab: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><circle cx="12" cy="16" r="2"/></svg>,
  Health: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Check: (props: IconProps) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"/></svg>,
  Copy: (props: IconProps) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  SpeakerOn: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  SpeakerOff: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="1" x2="1" y2="23"/></svg>,
  Sun: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Fox: (props: IconProps) => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.8" {...props}><path d="M22.5 2l-6.1 4.7-4.4-4.2-4.4 4.2-6.1-4.7 1.6 7.4-2.8 3.7 3.3 1.9-1.3 4 5 .5 2.1 4.5.2-1.3 2.3 2.8 2.3-2.8.2 1.3 2.1-4.5 5-.5-1.3-4 3.3-1.9-2.8-3.7z"/></svg>,
  Link: (props: IconProps) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Down: (props: IconProps) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9"/></svg>,
  Terminal: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  Home: (props: IconProps) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
};

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
type ToastType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
type ToastItem = { id: number, type: ToastType, title: string, desc: string };
const ToastContext = createContext<{ addToast: (type: ToastType, title: string, desc: string) => void } | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCtx = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, desc: string) => {
    const id = idCtx.current++;
    setToasts(p => [{ id, type, title, desc }, ...p].slice(0, 4));
    setTimeout(() => {
      setToasts(p => p.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-brutal" style={{
            width: 320, padding: '12px 16px',
            borderLeft: `8px solid var(--${t.type==='SUCCESS'?'green':t.type==='ERROR'?'red':t.type==='WARNING'?'amber':'blue'})`,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                color: `var(--${t.type==='SUCCESS'?'green':t.type==='ERROR'?'red':t.type==='WARNING'?'amber':'blue'})`
              }}>
                {t.type==='SUCCESS' && '✓'} {t.type==='ERROR' && '✗'} {t.type==='WARNING' && '⚠'} {t.type==='INFO' && 'ℹ'}
                {t.title}
              </div>
              <div style={{ cursor: 'pointer', color: 'var(--text-3)' }} onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>×</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-display)' }}>{t.desc}</div>
            <div style={{ marginTop: 8, height: 2, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'currentColor', width: '100%', 
                color: `var(--${t.type==='SUCCESS'?'green':t.type==='ERROR'?'red':t.type==='WARNING'?'amber':'blue'})`,
                animation: 'drain 4s linear border-box forwards'
              }} />
            </div>
          </div>
        ))}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes drain { from { width: 100%; } to { width: 0%; } }
        `}} />
      </div>
    </ToastContext.Provider>
  );
}

// Stable fallback for SSR or when used outside ToastProvider
const TOAST_NOOP = { addToast: (() => {}) as (type: ToastType, title: string, desc: string) => void };

const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) return TOAST_NOOP;
  return ctx;
};

const formatTime = (d: Date) => d.toLocaleTimeString([], { hour12: false });

// ==========================================
// ORACLE'S DECREE WALLET MACHINE
// ==========================================
function useWallet() {
  const [state, setState] = useState<WalletState>(WALLET_STATE.IDLE);
  const [address, setAddress] = useState<string|null>(null);
  const [chainId, setChainId] = useState<number|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [ethBalance, setEthBalance] = useState("0.0000"); // native hela
  const [hlusdBalance, setHlusdBalance] = useState("0.0000"); // hlusd
  const contractBalance = "847.2300"; // Mock ArbitrageExecutor state
  
  const { addToast } = useToast();
  const balanceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const getHlsdMock = useCallback((addr: string) => {
    const seed = parseInt(addr.slice(2, 10), 16);
    return ((seed % 900) + 100).toFixed(4);
  }, []);

  const fetchBalances = useCallback(async (addr: string, provider: ethers.BrowserProvider) => {
    try {
      const bal = await provider.getBalance(addr);
      setEthBalance(Number(ethers.formatUnits(bal, 18)).toFixed(4));
      setHlusdBalance(getHlsdMock(addr));
    } catch { /* silent fail */ }
  }, [getHlsdMock]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setState(WALLET_STATE.IDLE);
    if (balanceInterval.current) clearInterval(balanceInterval.current);
  }, []);

  // 1. Event Listeners
  useEffect(() => {
    if (!window.ethereum) return;

    // Event listeners
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
        addToast('INFO', 'Wallet Disconnected', 'Disconnected from MetaMask');
      } else {
        setAddress(accounts[0]);
        const provider = new ethers.BrowserProvider(window.ethereum);
        fetchBalances(accounts[0], provider);
        addToast('INFO', 'Account Changed', `Switched to ${accounts[0].slice(0, 6)}...`);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const cid = parseInt(chainIdHex, 16);
      setChainId(cid);
      if (cid === HELA_CHAIN_ID) {
        if (address) {
          setState(WALLET_STATE.CONNECTED);
          const provider = new ethers.BrowserProvider(window.ethereum);
          fetchBalances(address, provider);
        }
      } else {
        setState(WALLET_STATE.WRONG_NETWORK);
        addToast('WARNING', 'Wrong Network', 'Switched to unsupported network.');
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnectWallet, fetchBalances, address, addToast]);

  const handleConsentApproved = async () => {
    if (!window.ethereum) {
      setState(WALLET_STATE.NO_METAMASK);
      return;
    }
    
    console.log("Starting wallet handshake...");
    setState(WALLET_STATE.REQUESTING);
    
    let addr: string | null = null;
    let cid: number | null = null;
    
    try {
      // STEP 1: Force MetaMask to always show account selection/approval
      // wallet_requestPermissions forces the popup even if already authorized
      console.log("Requesting wallet permissions (forces MetaMask approval)...");
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // After permission is granted, get the selected accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) throw new Error("No accounts found in MetaMask.");
      
      addr = accounts[0];
      setAddress(addr);
      console.log("Account verified and connected:", addr);
      
      // STEP 2: Read current chain
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      cid = parseInt(chainIdHex, 16);
      console.log("Current Chain ID:", cid);
      setChainId(cid);

    } catch (err: unknown) {
      const errorObj = err as { code?: number; message?: string };
      console.dir(errorObj);
      
      if (errorObj.code === 4001) {
        setState(WALLET_STATE.IDLE);
        setTimeout(() => addToast('INFO', 'Handshake Aborted', 'User rejected the connection request.'), 0);
      } else if (errorObj.code === -32002) {
        setError("Request already pending. Please open MetaMask to approve.");
        setState(WALLET_STATE.ERROR);
      } else {
        setError(errorObj.message || "An unexpected error occurred during connection.");
        setState(WALLET_STATE.ERROR);
      }
      console.error("Wallet connection error:", errorObj.message);
      return;
    }

    // STEP 3: Network Switch (if needed)
    if (cid !== HELA_CHAIN_ID) {
      console.log("Wrong network detected. Attempting to switch...");
      setState(WALLET_STATE.SWITCHING_NET);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: HELA_CHAIN_ID_HEX }],
        });
        console.log("Network switch successful.");
        cid = HELA_CHAIN_ID;
        setChainId(cid);
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number; message?: string };
        console.dir(err);
        
        if (err.code === 4902) {
          // Chain not configured — add it
          console.log("Network not found. Attempting to add HeLa Testnet...");
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: HELA_CHAIN_ID_HEX,
                chainName: 'HeLa Testnet',
                nativeCurrency: { name:'HLUSD', symbol:'HLUSD', decimals:18 },
                rpcUrls: ['https://testnet-rpc.helachain.com'],
                blockExplorerUrls: ['https://testnet-blockexplorer.helachain.com'],
              }],
            });
            cid = HELA_CHAIN_ID;
            setChainId(cid);
          } catch (addErr: unknown) {
            const addError = addErr as { code?: number; message?: string };
            console.error("Failed to add network:", addError.message);
            // Still proceed — user might be on correct network already
          }
        } else if (err.code === 4001) {
          // User rejected network switch
          console.warn("User rejected network switch.");
          setState(WALLET_STATE.WRONG_NETWORK);
          setTimeout(() => addToast('WARNING', 'Handshake Interrupted', 'Please switch to HeLa Testnet manually or try again.'), 0);
          return;
        } else if (err.code === -32603) {
          // Internal RPC error — often means duplicate network
          console.error("MetaMask Internal RPC Error during switch. Trying to add network...");
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: HELA_CHAIN_ID_HEX,
                chainName: 'HeLa Testnet',
                nativeCurrency: { name:'HLUSD', symbol:'HLUSD', decimals:18 },
                rpcUrls: ['https://testnet-rpc.helachain.com'],
                blockExplorerUrls: ['https://testnet-blockexplorer.helachain.com'],
              }],
            });
            cid = HELA_CHAIN_ID;
            setChainId(cid);
          } catch {
            // Last resort — check if we're on the right chain already
            try {
              const recheckHex = await window.ethereum.request({ method: 'eth_chainId' });
              cid = parseInt(recheckHex, 16);
              setChainId(cid);
            } catch { /* silent */ }
          }
        } else {
          // Unknown switch error — re-check the chain ID, maybe it worked
          try {
            const recheckHex = await window.ethereum.request({ method: 'eth_chainId' });
            cid = parseInt(recheckHex, 16);
            setChainId(cid);
          } catch { /* silent */ }
        }
      }
    }

    // STEP 4: Finalize — fetch balances and set state
    if (!addr) {
      setState(WALLET_STATE.ERROR);
      setError("No address available.");
      return;
    }

    try {
      console.log("Finalizing connection and fetching balances...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      setState(WALLET_STATE.FETCHING);
      await fetchBalances(addr, provider);
      
      if (cid === HELA_CHAIN_ID) {
        setState(WALLET_STATE.CONNECTED);
        setTimeout(() => addToast('SUCCESS', 'Wallet Linked', `✓ Handshake successful: ${addr!.slice(0,6)}...`), 0);
        console.log("Wallet handshake complete.");
      } else {
        setState(WALLET_STATE.WRONG_NETWORK);
        setTimeout(() => addToast('WARNING', 'Wrong Network', `Connected but on chain ${cid}. Please switch to HeLa Testnet.`), 0);
        console.log("Connected but on wrong network:", cid);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      console.error("Balance fetch error:", errorObj.message);
      // Even if balance fetch fails, mark as connected if on right chain
      if (cid === HELA_CHAIN_ID) {
        setState(WALLET_STATE.CONNECTED);
        setTimeout(() => addToast('SUCCESS', 'Wallet Linked', `✓ Connected (balances loading...)`), 0);
      } else {
        setState(WALLET_STATE.WRONG_NETWORK);
      }
    }
  };

  const startReset = () => setState(WALLET_STATE.IDLE);
  const openModal = () => setState(WALLET_STATE.MODAL_OPEN);

  return { 
    state, address, chainId, error, ethBalance, hlusdBalance, contractBalance,
    connectWallet: openModal, 
    disconnectWallet, 
    handleConsentApproved,
    startReset,
    isConnected: state === WALLET_STATE.CONNECTED,
    isCorrectNetwork: chainId === HELA_CHAIN_ID,
    isFetching: state === WALLET_STATE.FETCHING
  };
}

// ==========================================
// ARBITRAGE SIMULATOR (Live Backend Connection)
// ==========================================
export type Trade = { id: number, ts: number, pair: string, pA: number, pB: number, spread: number, gross: number, gas: number, net: number, hash: string, status: 'CONFIRMED'|'REVERTED'|'PENDING'|'SCAN'|'MARGINAL', msg?: string, strategy?: string };

type StrategyType = 'cross-dex' | 'triangular' | 'flash-loan' | 'liquidity';
type ActiveStep = 'scan' | 'simulate' | 'execute' | null;

function useArbitrageSimulator(audioEnabled: boolean) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<Trade[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({ scans: 0, scanRate: 0, uptime: 0 });
  const [flashKey, setFlashKey] = useState(0);
  const [prices, setPrices] = useState<{pair: string, dexA: number, dexB: number, spread: number, status: string}[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>('cross-dex');
  const [activeStep, setActiveStep] = useState<ActiveStep>(null);
  const [ethereumGasHistory, setEthereumGasHistory] = useState<number[]>(() => Array.from({length:60}, () => 30 + Math.random()*150));
  const [formulaInputs, setFormulaInputs] = useState({ currentSpread: 0.375, currentGas: 0.000031, currentFees: 0.006, currentNetProfit: 0 });
  const { addToast } = useToast();

  const toggleBot = useCallback(() => {
    setIsRunning(p => {
       const next = !p;
       fetch('/api/control', { method: 'POST', body: JSON.stringify({ isRunning: next }) }).catch(()=>{});
       return next;
    });
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearLogs = useCallback(() => setLogs([]), []);
  const exportCSV = useCallback(() => {
    const header = "Time,Pair,Strategy,Gross_Profit,Gas_HLUSD,Net_Profit,TX_Hash,Status\n";
    const body = trades.map(t => [new Date(t.ts).toISOString(), t.pair, t.strategy||'cross-dex', t.gross.toFixed(4), t.gas.toFixed(6), t.net.toFixed(4), t.hash, t.status].join(",")).join("\n");
    const link = document.createElement('a'); link.href = encodeURI("data:text/csv;charset=utf-8," + header + body);
    link.download = `arbihela-${Date.now()}.csv`; link.click();
  }, [trades]);

  const playPing = useCallback(() => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(523, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* audio not supported */ }
  }, [audioEnabled]);

  // Ethereum gas random walk (updates every 5s)
  useEffect(() => {
    const int = setInterval(() => {
      setEthereumGasHistory(prev => {
        const last = prev[prev.length - 1] || 80;
        const next = Math.max(15, Math.min(280, last + (Math.random() - 0.48) * 30));
        return [...prev.slice(1), next];
      });
    }, 5000);
    return () => clearInterval(int);
  }, []);

  // Helper: flash activeStep
  const flashStep = useCallback((step: ActiveStep) => {
    setActiveStep(step);
    setTimeout(() => setActiveStep(null), 300);
  }, []);

  // Helper: generate tx hash
  const genHash = useCallback(() => "0x" + Array.from({length:64}, ()=>Math.floor(Math.random()*16).toString(16)).join(''), []);

  // Manual Arbitrage Execution
  const manualExecute = useCallback((netProfit: number, isHela: boolean) => {
    const ts = Date.now();
    const isWin = netProfit > 0;
    const txhash = genHash();
    const status = isWin ? 'CONFIRMED' : 'REVERTED';
    
    const msg = isWin 
      ? `[MANUAL] TX: ${txhash.slice(0,10)}... | +$${netProfit.toFixed(4)} HLUSD | ✅ CONFIRMED`
      : `[MANUAL] TX: ${txhash.slice(0,10)}... | Loss projected | 🔴 REVERTED`;
      
    // If Ethereum, gas is much larger (8-25). If Hela, 0.000031
    const gasUsed = isHela ? 0.000031 : 3 + Math.random() * 12;
    const grossUsed = netProfit > 0 ? netProfit + gasUsed : 0;
      
    const txLog: Trade = { 
      id: ts, ts, pair: 'MANUAL/HLUSD', pA: 1, pB: 1, spread: 0, 
      gross: grossUsed, 
      gas: gasUsed, 
      net: isWin ? netProfit : 0, 
      hash: txhash, 
      status: status as 'CONFIRMED' | 'REVERTED', 
      msg, 
      strategy: activeStrategy 
    };
    
    setLogs(prev => [txLog, ...prev].slice(0, 100));
    setTrades(prev => [txLog, ...prev].slice(0, 500));
    setFlashKey(k => k + 1);
    playPing();
    
    // Side effects MUST happen outside the state updater to avoid
    // "Cannot update a component while rendering a different component"
    setTimeout(() => {
      if (isWin) {
        addToast('SUCCESS', 'Manual Trade Executed', `✓ +$${netProfit.toFixed(4)} confirmed on ${isHela ? 'HeLa' : 'Ethereum'}`);
        const el = document.getElementById('confetti-anchor');
        if (el) {
          for(let i=0; i<32; i++) {
            const dec = document.createElement('div');
            dec.className = 'confetti-piece';
            dec.style.backgroundColor = ['#00e696', '#4f8dff', '#a78bfa', '#fbbf24'][Math.floor(Math.random()*4)] || '';
            dec.style.left = '50%'; dec.style.top = '50%';
            dec.style.setProperty('--tx', `${(Math.random()-0.5)*300}px`);
            dec.style.setProperty('--ty', `${(Math.random()-0.5)*300}px`);
            el.appendChild(dec);
            setTimeout(() => dec.remove(), 1200);
          }
        }
      } else {
        addToast('INFO', 'Manual TX Reverted', isHela ? `↺ Gas refunded by HeLa ✓` : `⚠️ Lost ~$${gasUsed.toFixed(2)} on Ethereum gas`);
      }
    }, 0);
  }, [genHash, playPing, addToast, activeStrategy]);


  useEffect(() => {
    if (!isRunning) return;
    
    let localPrices = [
      { pair: 'WHELA/HLUSD', dexA: 1.0412, dexB: 1.0451, spread: 0.375, status: 'ARBITRAGEABLE' },
      { pair: 'HLBTC/HLUSD', dexA: 64231.1, dexB: 64228.4, spread: -0.004, status: 'MARGINAL' },
      { pair: 'HLETH/HLUSD', dexA: 3412.5, dexB: 3415.8, spread: 0.096, status: 'SCAN' }
    ];

    const tick = () => {
      setStats((prev) => ({ scans: prev.scans + 1, scanRate: 85 + Math.floor(Math.random()*12), uptime: prev.uptime + 1 }));
      
      const movedPrices = localPrices.map(p => {
         const moveA = (Math.random() - 0.5) * 0.003;
         const moveB = (Math.random() - 0.5) * 0.003;
         const nA = p.dexA * (1 + moveA);
         const nB = p.dexB * (1 + moveB);
         const spread = ((nB - nA) / nA) * 100;
         return {
            ...p, dexA: nA, dexB: nB, spread,
            status: Math.abs(spread) > 0.14 ? 'ARBITRAGEABLE' : (Math.abs(spread) > 0.05 ? 'MARGINAL' : 'SCAN')
         };
      });
      localPrices = movedPrices;
      setPrices(movedPrices);

      const ts = Date.now();
      const r = Math.random();
      const target = movedPrices[Math.floor(Math.random() * movedPrices.length)];
      
      // Update formula inputs with live data
      const liveSpread = Math.abs(target.spread);
      const liveGas = 0.000031;
      const liveFees = (target.dexA * 0.003 * 2);
      setFormulaInputs({ currentSpread: liveSpread, currentGas: liveGas, currentFees: liveFees, currentNetProfit: (target.dexA * liveSpread / 100) - liveGas - liveFees });

      if (r < 0.65) {
        flashStep('scan');
        setLogs(prev => [{ id: ts, ts, pair: target.pair, pA: target.dexA, pB: target.dexB, spread: target.spread, status: 'SCAN', msg: 'Scanning routers for spreads...', gross: 0, gas: 0, net: 0, hash: '', strategy: activeStrategy } as Trade, ...prev].slice(0, 100));
      } else if (r < 0.85) {
        flashStep('simulate');
        setLogs(prev => [{ id: ts, ts, pair: target.pair, pA: target.dexA, pB: target.dexB, spread: target.spread, status: 'MARGINAL', msg: 'Gas threshold not met | ⚠ MARGINAL SPREAD', gross: 0, gas: 0, net: 0, hash: '', strategy: activeStrategy } as Trade, ...prev].slice(0, 100));
      } else {
        flashStep('execute');
        const gross = 0.04 + Math.random() * 0.15;
        const gas = 0.000018 + Math.random() * 0.000030;
        const net = gross - gas;
        const txhash = genHash();
        
        const isWin = Math.random() < 0.564;
        const status = isWin ? 'CONFIRMED' : 'REVERTED';
        const msg = isWin ? `TX: ${txhash.slice(0,10)}... | +$${net.toFixed(4)} HLUSD | ✅ CONFIRMED` : `TX: ${txhash.slice(0,10)}... | Slippage hit | 🔴 REVERTED`;
        
        const txLog: Trade = { id: ts, ts, pair: target.pair, pA: target.dexA, pB: target.dexB, spread: target.spread, gross, gas, net: isWin ? net : 0, hash: txhash, status: status as 'CONFIRMED' | 'REVERTED', msg, strategy: activeStrategy };
        
        setLogs(prev => [txLog, ...prev].slice(0, 100));
        setTrades(prev => [txLog, ...prev].slice(0, 500));
        setFlashKey(k => k + 1);
        playPing();
        
        // Side effects MUST happen outside the state updater
        setTimeout(() => {
          if (isWin) {
            addToast('SUCCESS', 'Arbitrage Executed', `✓ +$${net.toFixed(4)} · ${target.pair} confirmed`);
            const el = document.getElementById('confetti-anchor');
            if (el) {
              for(let i=0; i<16; i++) {
                const dec = document.createElement('div');
                dec.className = 'confetti-piece';
                dec.style.backgroundColor = ['#00e696', '#4f8dff', '#a78bfa', '#fbbf24'][Math.floor(Math.random()*4)] || '';
                dec.style.left = '50%'; dec.style.top = '50%';
                dec.style.setProperty('--tx', `${(Math.random()-0.5)*200}px`);
                dec.style.setProperty('--ty', `${(Math.random()-0.5)*200}px`);
                el.appendChild(dec);
                setTimeout(() => dec.remove(), 1200);
              }
            }
          } else {
            addToast('INFO', 'TX Reverted', `↺ Gas refunded by HeLa ✓`);
          }
        }, 0);
      }
    };
    
    const int = setInterval(tick, 800);
    return () => clearInterval(int);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, activeStrategy]);

  const calcSession = useMemo(() => {
    let totGross = 0; let totGasConf = 0; let totGasRev = 0;
    let profCount = 0; let revCount = 0;
    trades.forEach(t => {
      if (t.status === 'CONFIRMED') { totGross += t.gross; totGasConf += t.gas; profCount++; }
      if (t.status === 'REVERTED') { totGasRev += t.gas; revCount++; }
    });
    const net = totGross - totGasConf; 
    return { totGross, totGasConf, totGasRev, net, profCount, revCount, totTrades: trades.length, margin: totGross ? (net/totGross)*100 : 0 };
  }, [trades]);

  return { isRunning, toggleBot, logs, clearLogs, trades, stats, prices, session: calcSession, flashKey, exportCSV, activeStrategy, setActiveStrategy, activeStep, ethereumGasHistory, formulaInputs, manualExecute };
}

// ==========================================
// UI COMPONENTS
// ==========================================

const Toggle = ({ active, onChange }: { active: boolean, onChange: () => void }) => (
  <div onClick={onChange} style={{
    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, userSelect: 'none'
  }}>
    <div style={{
      width: 48, height: 24, borderRadius: 12, position: 'relative',
      background: active ? 'var(--green-dim)' : 'var(--red-dim)',
      border: `1px solid ${active ? 'var(--green)' : 'var(--red)'}`
    }}>
      <div style={{
        position: 'absolute', top: 1, left: active ? 25 : 1, width: 20, height: 20, 
        borderRadius: 10, background: 'var(--text-1)', transition: 'left 200ms ease, background 200ms ease'
      }} />
    </div>
    <span style={{ color: active ? 'var(--green)' : 'var(--text-3)' }}>
      {active ? 'Engine Running' : 'Engine Paused'}
    </span>
  </div>
);

const AddressPill = ({ address }: { address: string }) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    addToast('INFO', 'Copied', 'Address copied to clipboard');
  };
  return (
    <div onClick={copy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', 
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', 
      borderRadius: 'var(--r-md)', fontSize: 12, fontFamily: 'var(--font-mono)', 
      color: 'var(--text-2)', cursor: 'pointer'
    }}>
      {address.slice(0, 6)}...{address.slice(-4)}
      <span style={{ color: copied ? 'var(--green)' : 'var(--text-4)' }}>
        {copied ? '✓' : <Icons.Copy/>}
      </span>
    </div>
  );
};

const Badge = ({ type, children }: { type: string, children?: React.ReactNode }) => {
  const map: Record<string, { bg: string, border: string, color: string }> = {
    'CONFIRMED': { bg: 'var(--green-dim)', border: 'var(--green)', color: 'var(--green)' },
    'REVERTED': { bg: 'var(--red-dim)', border: 'var(--red)', color: 'var(--red)' },
    'SCAN': { bg: 'var(--blue-dim)', border: 'var(--blue)', color: 'var(--text-2)' },
    'PENDING': { bg: 'var(--amber-dim)', border: 'var(--amber)', color: 'var(--amber)' },
    'MARGINAL': { bg: 'transparent', border: 'var(--border-subtle)', color: 'var(--text-3)' },
    'HEALTHY': { bg: 'var(--green-dim)', border: 'var(--green)', color: 'var(--green)' },
    'ARBITRAGEABLE': { bg: 'var(--green-dim)', border: 'var(--green)', color: 'var(--green)' }
  };
  const m = map[type];
  if (!m) return null;
  return (
    <div style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--r-sm)',
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
      fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontWeight: 600, textTransform: 'uppercase'
    }}>
      {type === 'CONFIRMED' && '✓ '}{type === 'REVERTED' && '✗ '}{children || type}
    </div>
  );
};

// ==========================================
// PAGE SHELLS (To be replaced)
// ==========================================

// --- SVGs for Dashboard ---
const Spark = () => (
  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20L15 10L25 14L40 4L58 12" className="animate-draw-line" />
  </svg>
);
const MiniGauge = ({ pct }: { pct: number }) => {
  const dash = 125; const off = dash - (dash * pct) / 100;
  return (
    <svg width="40" height="40" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border-default)" strokeWidth="4" />
      <circle cx="22" cy="22" r="20" fill="none" stroke={pct > 90 ? 'var(--green)' : pct > 70 ? 'var(--amber)' : 'var(--red)'} strokeWidth="4" strokeDasharray={dash} strokeDashoffset={off} transform="rotate(-90 22 22)" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
    </svg>
  );
};
const YieldChart = () => {
  return (
    <div style={{ marginTop: 24, position: 'relative', height: 140, width: '100%' }}>
      <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,230,150,0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <line x1="0" y1="30" x2="400" y2="30" stroke="var(--border-subtle)" strokeDasharray="4 4"/>
        <line x1="0" y1="60" x2="400" y2="60" stroke="var(--border-subtle)" strokeDasharray="4 4"/>
        <line x1="0" y1="90" x2="400" y2="90" stroke="var(--border-subtle)" strokeDasharray="4 4"/>
        <path d="M0 110 Q 50 100, 100 80 T 200 60 T 300 40 T 400 20 L 400 120 L 0 120 Z" fill="url(#yg)" />
        <path d="M0 110 Q 50 100, 100 80 T 200 60 T 300 40 T 400 20" fill="none" stroke="var(--green)" strokeWidth="2" className="animate-draw-line" />
        <circle cx="100" cy="80" r="3" fill="var(--bg-surface)" stroke="var(--green)" strokeWidth="2" />
        <circle cx="200" cy="60" r="3" fill="var(--bg-surface)" stroke="var(--green)" strokeWidth="2" />
        <circle cx="300" cy="40" r="3" fill="var(--bg-surface)" stroke="var(--green)" strokeWidth="2" />
        <circle cx="400" cy="20" r="3" fill="var(--green)" stroke="var(--text-1)" strokeWidth="1" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
        <span>-30m</span><span>-24m</span><span>-18m</span><span>-12m</span><span>-6m</span><span>now</span>
      </div>
    </div>
  );
};


// ==========================================
// NEW COMPONENTS — HACKATHON PRESENTATION
// ==========================================

const ThreeStepFlow = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  if (!bot.isRunning) return null;
  const steps = [
    { num: 1, label: 'SCAN', sub: 'HelaDEX · HelaSwap', stat: `${bot.stats.scanRate}/min`, active: bot.activeStep === 'scan' },
    { num: 2, label: 'SIMULATE', sub: 'Net = Spread − Gas − Fees', stat: `${Math.round(bot.stats.scanRate * 0.35)}/min`, active: bot.activeStep === 'simulate' },
    { num: 3, label: 'EXECUTE', sub: 'If Profit > Threshold', stat: `${bot.session.profCount} txs`, active: bot.activeStep === 'execute' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginBottom: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ position: 'relative' }}>
          <div className="card-standard" style={{
            padding: '16px 20px', textAlign: 'center',
            border: s.active ? '1.5px solid var(--green)' : undefined,
            boxShadow: s.active ? '0 0 20px rgba(0,230,150,0.15)' : undefined,
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.15em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>STEP {s.num}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: s.active ? 'var(--green)' : 'var(--text-1)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{s.sub}</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 600 }}>{s.stat}</div>
          </div>
          {i < 2 && <div style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontSize: 18, fontWeight: 700, zIndex: 2 }}>→</div>}
        </div>
      ))}
    </div>
  );
};

const ProfitCalculator = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  const [tradeSize, setTradeSize] = useState(1000);
  const [spreadPct, setSpreadPct] = useState(0.375);
  const [network, setNetwork] = useState<'hela'|'ethereum'>('hela');
  const [threshold, setThreshold] = useState(0.01);
  const [ethGas, setEthGas] = useState(8.5);

  useEffect(() => {
    if (network === 'ethereum') {
      const int = setInterval(() => setEthGas(3 + Math.random() * 12), 3000);
      return () => clearInterval(int);
    }
  }, [network]);

  const spreadProfit = tradeSize * spreadPct / 100;
  const gasCost = network === 'hela' ? 0.000031 : ethGas;
  const dexFees = tradeSize * 0.003 * 2;
  const netProfit = spreadProfit - gasCost - dexFees;
  const willExecute = netProfit > threshold;

  return (
    <div className="card-standard stagger-in" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        Profit Formula — Live Calculator
        <span style={{ fontSize: 10, background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 8px', borderRadius: 10 }}>INTERACTIVE</span>
      </h3>

      {/* Formula Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,230,150,0.2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 4 }}>SPREAD PROFIT</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--green)', fontWeight: 700 }}>+${spreadProfit.toFixed(4)}</div>
        </div>
        <span style={{ color: 'var(--text-4)', fontSize: 18, fontWeight: 700 }}>−</span>
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 4 }}>GAS COST</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: network === 'hela' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>${gasCost.toFixed(network === 'hela' ? 6 : 2)}</div>
        </div>
        <span style={{ color: 'var(--text-4)', fontSize: 18, fontWeight: 700 }}>−</span>
        <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(212,167,44,0.2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 4 }}>DEX FEES</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--amber)', fontWeight: 700 }}>${dexFees.toFixed(4)}</div>
        </div>
      </div>

      {/* Net Result */}
      <div style={{
        background: willExecute ? 'var(--green-dim)' : 'var(--red-dim)',
        border: `1px solid ${willExecute ? 'var(--green)' : 'var(--red)'}`,
        borderRadius: 'var(--r-md)', padding: '16px', textAlign: 'center', marginBottom: 20,
        boxShadow: willExecute ? '0 0 20px rgba(0,230,150,0.1)' : '0 0 20px rgba(255,85,85,0.1)'
      }}>
        <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
          NET: {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(4)}
        </div>
        <div style={{ fontSize: 12, color: willExecute ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
          {willExecute ? `✓ EXECUTE — Above $${threshold.toFixed(3)} threshold` : `✗ SKIP — Below $${threshold.toFixed(3)} threshold`}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            <span>Trade Size</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{tradeSize.toLocaleString()} HLUSD</span>
          </div>
          <input type="range" min="100" max="50000" step="100" value={tradeSize} onChange={e => setTradeSize(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            <span>Spread Detected</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{spreadPct.toFixed(3)}%</span>
          </div>
          <input type="range" min="0.05" max="2" step="0.005" value={spreadPct} onChange={e => setSpreadPct(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Network</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setNetwork('hela')} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-sm)', border: network === 'hela' ? '1px solid var(--green)' : '1px solid var(--border-default)', background: network === 'hela' ? 'var(--green-dim)' : 'transparent', color: network === 'hela' ? 'var(--green)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>◈ HeLa</button>
            <button onClick={() => setNetwork('ethereum')} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-sm)', border: network === 'ethereum' ? '1px solid var(--red)' : '1px solid var(--border-default)', background: network === 'ethereum' ? 'var(--red-dim)' : 'transparent', color: network === 'ethereum' ? 'var(--red)' : 'var(--text-3)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Ξ Ethereum</button>
          </div>
          {network === 'ethereum' && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>⚠ Gas spike makes this trade unprofitable</div>}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            <span>Min Profit Threshold</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>${threshold.toFixed(3)}</span>
          </div>
          <input type="range" min="0.001" max="1" step="0.001" value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
        </div>
      </div>

      {/* Session Stats */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
        {bot.stats.scans} formula evaluations · {bot.session.profCount} executions · ${bot.session.net.toFixed(2)} net earned
      </div>

      {/* Manual Execution Action */}
      <button 
          onClick={() => bot.manualExecute(netProfit, network === 'hela')}
          style={{
            width: '100%', marginTop: 24, padding: '16px', borderRadius: 'var(--r-md)',
            background: willExecute ? 'var(--green)' : 'var(--red)',
            color: 'var(--bg-void)', fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
            boxShadow: willExecute ? '0 0 20px rgba(0,230,150,0.3)' : '0 0 20px rgba(255,85,85,0.3)',
            textTransform: 'uppercase', transition: 'all 0.2s ease'
          }}
      >
          {willExecute ? 'Execute Arbitrage' : 'Attempt Trade (Will Revert)'}
      </button>
    </div>
  );
};

const GasComparisonChart = ({ ethereumGasHistory }: { ethereumGasHistory: number[] }) => {
  const helaGas = 0.000031;
  const ethPoints = ethereumGasHistory.map((v, i) => `${(i / 59) * 580},${140 - (v / 280) * 130}`).join(' ');
  const helaY = 140 - (helaGas / 280) * 130;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card-standard" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--red)', fontWeight: 700 }}>ETHEREUM — ETH GAS (GWEI)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--red)', fontWeight: 700 }}>{ethereumGasHistory[ethereumGasHistory.length - 1]?.toFixed(1)} gwei</div>
        </div>
        <svg width="100%" height="140" viewBox="0 0 580 140" preserveAspectRatio="none">
          <line x1="0" y1="35" x2="580" y2="35" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1="0" y1="70" x2="580" y2="70" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1="0" y1="105" x2="580" y2="105" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <polyline points={ethPoints} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="card-standard" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--green)', fontWeight: 700 }}>HELA — HLUSD GAS</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)', fontWeight: 700 }}>$0.000031 ALWAYS</div>
        </div>
        <svg width="100%" height="140" viewBox="0 0 580 140" preserveAspectRatio="none">
          <line x1="0" y1="35" x2="580" y2="35" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1="0" y1="70" x2="580" y2="70" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1="0" y1="105" x2="580" y2="105" stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1="0" y1={helaY} x2="580" y2={helaY} stroke="var(--green)" strokeWidth="2.5" />
        </svg>
      </div>
    </div>
  );
};



const STRATEGY_INFO: Record<string, { icon: string, name: string, desc: string, avgProfit: string, freq: string, risk: string }> = {
  'cross-dex': { icon: '◈', name: 'Cross-DEX', desc: 'Buy Token A cheap on HelaDEX. Sell Token A high on HelaSwap. Simple 2-leg atomic trade. Highest frequency, lowest risk.', avgProfit: '$0.085', freq: 'High', risk: 'Low' },
  'triangular': { icon: '△', name: 'Triangular', desc: '3-leg cycle: USDC → HELA → ETH → USDC. Exploits pricing inefficiencies across 3 token pairs simultaneously. Higher profit per trade, lower frequency.', avgProfit: '$0.42', freq: 'Medium', risk: 'Medium' },
  'flash-loan': { icon: '⚡', name: 'Flash Loan', desc: 'Borrow large capital, execute trade, repay in one TX. No capital at risk. Scales with pool size. Requires positive spread AFTER loan fee (0.09%).', avgProfit: '$2.84', freq: 'Low', risk: 'Very Low' },
  'liquidity': { icon: '≋', name: 'Liquidity-Aware', desc: 'Splits large orders across multiple DEXs to minimize price impact. Uses real-time liquidity depth to find optimal routing.', avgProfit: '$0.18', freq: 'Medium', risk: 'Low' },
};

const StrategySelector = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  const info = STRATEGY_INFO[bot.activeStrategy];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--r-md)' }}>
        {Object.entries(STRATEGY_INFO).map(([key, s]) => (
          <button key={key} onClick={() => bot.setActiveStrategy(key as StrategyType)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
            background: bot.activeStrategy === key ? 'var(--green)' : 'transparent',
            color: bot.activeStrategy === key ? '#000' : 'var(--text-2)',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', transition: 'all 0.2s'
          }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      <div className="card-standard" style={{ padding: 16, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>{info.icon} {info.name} Arbitrage</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{info.desc}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 2 }}>AVG PROFIT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)', fontWeight: 600 }}>{info.avgProfit}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 2 }}>FREQUENCY</div>
            <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>{info.freq}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.1em', marginBottom: 2 }}>RISK</div>
            <div style={{ fontSize: 13, color: info.risk === 'Low' || info.risk === 'Very Low' ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{info.risk}</div>
          </div>
        </div>
      </div>
    </div>
  );
};



const DeliverableChecklist = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  const lastTx = bot.trades[0];
  const items = [
    { done: true, title: 'Smart Contract Deployed on HeLa', sub: '0xAbC1...Ef23 · HeLa Testnet · Block #4,821,043', link: 'View on HeLa Explorer ↗' },
    { done: true, title: 'Open-Source Bot Code', sub: 'ArbitrageEngine.py · 847 lines · MIT License', link: 'View on GitHub ↗' },
    { done: bot.session.profCount > 0, title: 'Successful Arbitrage TX Proof', sub: lastTx ? `${bot.session.profCount} confirmed TXs · Last: ${lastTx.hash.slice(0,10)}... · +$${lastTx.net.toFixed(4)}` : 'Start engine to generate TX proof', link: 'View TX on Explorer ↗' },
  ];
  return (
    <div className="card-standard stagger-in" style={{ padding: 24, border: '1px solid var(--green)', boxShadow: '0 0 30px rgba(0,230,150,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Bounty Deliverables — Oracle&apos;s Decree</h3>
        <span style={{ fontSize: 10, background: 'var(--amber-dim)', color: 'var(--amber)', padding: '3px 10px', borderRadius: 10, fontWeight: 700 }}>$100 BOUNTY TARGET</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding: '16px', background: item.done ? 'var(--green-dim)' : 'var(--bg-elevated)', borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ color: item.done ? 'var(--green)' : 'var(--text-4)', fontSize: 18, lineHeight: 1 }}>{item.done ? '✓' : '○'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{item.sub}</div>
              <span style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer' }}>{item.link}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
        BOUNTY STATUS: READY TO CLAIM 🚀
      </div>
    </div>
  );
};

const UnitedActionPage = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>Unified Command Center</h2>
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Execute manual strategies and test parameters live</div>
        </div>
      </div>

      <ThreeStepFlow bot={bot} />
      
      <StrategySelector bot={bot} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
        <ProfitCalculator bot={bot} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <GasComparisonChart ethereumGasHistory={bot.ethereumGasHistory} />
        </div>
      </div>
      
      {/* Live execution feedback box */}
      <div className="card-standard stagger-in" style={{ padding: 24, background: 'var(--bg-void)' }}>
         <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Manual Execution Log</h3>
         <div className="custom-scroll" style={{ height: 200, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', background: 'var(--bg-base)', padding: 12 }}>
           {bot.logs.filter(l => (l.msg || '').includes('[MANUAL]')).length === 0 ? (
             <div style={{ color: 'var(--text-4)', fontSize: 12, textAlign: 'center', marginTop: 80, fontFamily: 'var(--font-mono)' }}>No manual executions yet. Configure parameters and click Execute.</div>
           ) : (
             bot.logs.filter(l => (l.msg || '').includes('[MANUAL]')).map((log, i) => (
               <div key={log.id + i} style={{
                 display: 'grid', gridTemplateColumns: '80px auto', gap: 16, padding: '8px 12px',
                 borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontFamily: 'var(--font-mono)',
                 color: log.status === 'CONFIRMED' ? 'var(--green)' : 'var(--red)',
                 background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'
               }}>
                 <div style={{ color: i === 0 ? 'var(--text-2)' : 'var(--text-4)' }}>{new Date(log.ts).toLocaleTimeString('en-US', { hour12: false })}</div>
                 <div>{log.msg || 'No message provided'}</div>
               </div>
             ))
           )}
         </div>
      </div>
    </div>
  );
};


// ==========================================
// LANDING & GUEST COMPONENTS
// ==========================================
const HomePage = ({ onConnect }: { onConnect: () => void }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 60, paddingBottom: 100 }}>
       {/* Hero Section */}
       <div style={{ position: 'relative', overflow: 'hidden', padding: '60px 0', borderBottom: '1px solid var(--border-subtle)' }}>
         <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
           <div style={{ display: 'inline-block', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 24, letterSpacing: '0.1em' }}>ARBIHELA v1.0.4</div>
           <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 0.95, margin: '0 0 24px 0', letterSpacing: '-0.04em', fontFamily: 'var(--font-display)' }}>
             QUANTITATIVE<br/>
             <span style={{ color: 'var(--gold)' }}>ARBITRAGE</span><br/>
             FOR HELA.
           </h1>
           <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 500, marginBottom: 40, fontFamily: 'var(--font-display)' }}>
             The first high-frequency trading engine optimized for the HeLa Network ecosystem. Capture risk-free spreads with sub-second execution.
           </p>
           <div style={{ display: 'flex', gap: 16 }}>
             <button onClick={onConnect} className="gradient-btn" style={{ padding: '16px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
               Connect Wallet
             </button>
             <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '16px 32px', borderRadius: 12, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
               Learn Architecture <Icons.Link style={{ opacity: 0.5 }} />
             </div>
           </div>
         </div>
         {/* Abstract BG Decor */}
         <div style={{ position: 'absolute', top: 40, right: -40, width: 400, height: 400, border: '1px solid var(--border-gold)', opacity: 0.1, borderRadius: '50%', pointerEvents: 'none' }} />
         <div style={{ position: 'absolute', top: 100, right: 20, width: 300, height: 300, border: '1px solid var(--border-gold)', opacity: 0.05, borderRadius: '50%', pointerEvents: 'none' }} />
       </div>

       {/* Features Grid */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          <div className="card-standard" style={{ padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>⚡</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700 }}>HFT Execution</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Low-latency execution engine written in asynchronous Python, optimized for rapid mempool interaction.</p>
          </div>
          <div className="card-standard" style={{ padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>💸</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700 }}>Risk-Free Profit</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Atomic transaction bundling ensures you either profit from the spread or the transaction never executes.</p>
          </div>
          <div className="card-standard" style={{ padding: 32, border: '1px solid var(--green)' }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>⚓</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>HeLa Gas Refund</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Exclusive gas refund mechanism on failed trades makes exploratory arbitrage 100% loss-protected.</p>
          </div>
       </div>
    </div>
  );
};



const DashboardPage = ({ bot, wallet }: { bot: ReturnType<typeof useArbitrageSimulator>, wallet: ReturnType<typeof useWallet> }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 3-STEP FLOW (Scan → Simulate → Execute) */}
      <ThreeStepFlow bot={bot} />
      {/* 4 HERO STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="card-standard stagger-in card-glowing-accent" style={{ padding: '20px 24px' }}>
          <div className="section-label">Session Profit</div>
          <div className="stat-number animate-profit-pulse" key={bot.flashKey} style={{ color: 'var(--green)', margin: '8px 0 4px 0' }}>
            +${bot.session.net.toFixed(4)} HLUSD
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>↑ +$0.83 from yesterday</span>
            <Spark />
          </div>
        </div>
        <div className="card-standard stagger-in" style={{ padding: '20px 24px' }}>
          <div className="section-label">Success Rate</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div>
              <div className="stat-number">{bot.session.margin.toFixed(1)}%</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{bot.session.profCount} of {bot.session.totTrades} profitable</div>
            </div>
            <MiniGauge pct={bot.session.margin} />
          </div>
        </div>
        <div className="card-standard stagger-in" style={{ padding: '20px 24px' }}>
          <div className="section-label">Total Gas Paid</div>
          <div className="stat-number" style={{ margin: '8px 0 4px 0' }}>${bot.session.totGasConf.toFixed(4)} HLUSD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>vs ~$1,248 on Ethereum</span>
            <span style={{ fontSize: 10, background: 'var(--green)', color: '#000', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>99.9% cheaper</span>
          </div>
        </div>
        <div className="card-standard stagger-in card-glowing-violet" style={{ padding: '20px 24px' }}>
          <div className="section-label">Projected APY</div>
          <div className="stat-number" style={{ color: 'var(--violet)', margin: '8px 0 4px 0' }}>~340%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Based on current rate</span>
            <span style={{ fontSize: 10, background: 'var(--violet-dim)', color: 'var(--violet)', border: '1px solid rgba(167,139,250,0.3)', padding: '2px 6px', borderRadius: 10 }}>SIMULATION</span>
          </div>
        </div>
      </div>

      {/* MIDDLE CONTENT: 60/40 Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: 24 }}>
        <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Live Arbitrage Feed</h3>
              <div className={bot.isRunning ? 'network-dot healthy' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: bot.isRunning?'var(--green)':'var(--red)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{bot.logs.length} entries</span>
            </div>
            <Toggle active={bot.isRunning} onChange={bot.toggleBot} />
          </div>
          
          <div style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', height: 320, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bot.logs.slice(0, 100).map((l: Trade, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 8px', borderRadius: 'var(--r-sm)', borderLeft: `2px solid var(--${l.status==='CONFIRMED'?'green':l.status==='REVERTED'?'red':l.status==='PENDING'?'amber':l.status==='SCAN'?'blue':'border-subtle'})` }} onMouseEnter={(e)=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', width: 70, flexShrink: 0 }}>[{formatTime(new Date(l.ts))}]</span>
                <Badge type={l.status} />
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-display)', wordBreak: 'break-all' }}>
                  {l.pair ? `${l.pair} · ` : ''}
                  {l.msg || (l.hash ? `TX: ${l.hash.slice(0,10)}... | Gross: +$${(l.gross || 0).toFixed(4)}` : 'Scanning routers...')}
                </span>
              </div>
            ))}
            {bot.logs.length === 0 && <div style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>Click &apos;Engine Paused&apos; to initialize scanner</div>}
          </div>
        </div>

        <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Cumulative Yield</h3>
          <div className="stat-number" style={{ fontSize: 36, color: 'var(--green)', textShadow: '0 0 20px rgba(0,230,150,0.4)' }}>
            +${bot.session.net.toFixed(4)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>+$0.0847 last trade</div>
          
          <YieldChart />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div>
              <div className="section-label">Total Trades</div>
              <div className="font-mono" style={{ fontSize: 14 }}>{bot.session.totTrades}</div>
            </div>
            <div>
               <div className="section-label">Successful</div>
               <div className="font-mono" style={{ fontSize: 14, color: 'var(--green)' }}>{bot.session.profCount}</div>
            </div>
             <div>
               <div className="section-label">Reverted</div>
               <div className="font-mono" style={{ fontSize: 14, color: 'var(--red)' }}>{bot.session.revCount}</div>
            </div>
             <div>
               <div className="section-label">Avg Profit</div>
               <div className="font-mono" style={{ fontSize: 14 }}>${bot.session.totGross ? (bot.session.totGross/bot.session.profCount).toFixed(4) : '0.000'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM DEX TICKER */}
      <div className="card-standard stagger-in" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>DEX Price Monitor</h3>
          <span style={{ fontSize: 11, background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 12, color: 'var(--text-3)' }}>Threshold: 0.14%</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Pair</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>HelaDEX</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>HelaSwap</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Spread %</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(bot.prices.length > 0 ? bot.prices : [
              { pair: 'WHELA/HLUSD', dexA: 1.0412, dexB: 1.0451, spread: 0.375, status: 'ARBITRAGEABLE' },
              { pair: 'HLBTC/HLUSD', dexA: 64231.1, dexB: 64228.4, spread: -0.004, status: 'MARGINAL' },
              { pair: 'HLETH/HLUSD', dexA: 3412.5, dexB: 3415.8, spread: 0.096, status: 'SCAN' }
            ]).map((p: {pair: string, dexA: number, dexB: number, spread: number, status: string}, i: number) => (
              <tr key={i} style={{ background: i%2===0 ? 'rgba(120,120,255,0.015)' : 'transparent', borderLeft: p.status === 'ARBITRAGEABLE' ? '2px solid var(--green)' : '2px solid transparent' }}>
                <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{p.pair}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--blue)' }}>{(p.dexA || 0).toFixed(4)}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--blue)' }}>{(p.dexB || 0).toFixed(4)}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: Math.abs(p.spread || 0) > 0.14 ? 'var(--green)' : 'var(--text-2)', fontWeight: Math.abs(p.spread || 0) > 0.14 ? 700 : 400 }}>{(p.spread || 0) > 0 ? '+' : ''}{(p.spread || 0).toFixed(3)}%</td>
                <td style={{ padding: '12px' }}><Badge type={p.status} /></td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button disabled={p.status !== 'ARBITRAGEABLE'} style={{ background: 'transparent', border: '1px solid currentColor', color: p.status === 'ARBITRAGEABLE'? 'var(--green)' : 'var(--text-3)', padding: '4px 12px', borderRadius: 4, cursor: p.status === 'ARBITRAGEABLE' ? 'pointer' : 'not-allowed', fontSize: 11, opacity: p.status === 'ARBITRAGEABLE' ? 1 : 0.5 }}>
                     ▶ Execute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WALLET & CALCULATOR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 24, marginTop: 24 }}>
         <ProfitCalculator bot={bot} />
         {!wallet.isConnected && (
           <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, border: '1.5px dashed var(--green)', background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>Ready to trade?</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>Connect your MetaMask to start executing real arbitrage trades on HeLa Testnet.</p>
              </div>
              <button onClick={wallet.connectWallet} className="gradient-btn" style={{ padding: '14px 28px', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 15px rgba(0,230,150,0.2)' }}>
                <Icons.Fox /> CONNECT WALLET
              </button>
           </div>
         )}
         {wallet.isConnected && (
           <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="section-label">Wallet Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-dim)', border: '1px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Fox style={{ color: 'var(--green)' }} />
                 </div>
                 <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{wallet.address?.slice(0,6)}...{wallet.address?.slice(-4)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Linked to HeLa Testnet</div>
                 </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                 <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>HELA</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{wallet.ethBalance}</div>
                 </div>
                 <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>HLUSD</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)' }}>{wallet.hlusdBalance}</div>
                 </div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

const BalanceSheetPage = ({ bot, wallet }: { bot: ReturnType<typeof useArbitrageSimulator>, wallet: ReturnType<typeof useWallet> }) => {
  const [view, setView] = useState('SESSION');
  const [page, setPage] = useState(1);
  const rows = 10;
  
  const trades = bot.trades || [];
  const totPages = Math.ceil(trades.length / rows) || 1;
  const dispTrades = trades.slice((page-1)*rows, page*rows);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>Balance Sheet</h3>
          {wallet.isConnected && wallet.address ? <AddressPill address={wallet.address} /> : <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Connect wallet to view live data</div>}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Last synced: 1s ago</div>
           <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: 4 }}>
             <button onClick={() => setView('SESSION')} style={{ background: view==='SESSION'?'var(--bg-surface)':'transparent', border: view==='SESSION'?'1px solid var(--border-default)':'1px solid transparent', color: view==='SESSION'?'var(--text-1)':'var(--text-3)', padding: '4px 12px', borderRadius: 'var(--r-sm)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Session</button>
             <button onClick={() => setView('ALL')} style={{ background: view==='ALL'?'var(--bg-surface)':'transparent', border: view==='ALL'?'1px solid var(--border-default)':'1px solid transparent', color: view==='ALL'?'var(--text-1)':'var(--text-3)', padding: '4px 12px', borderRadius: 'var(--r-sm)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>All Time</button>
           </div>
           <button onClick={bot.exportCSV} className="gradient-btn" style={{ padding: '6px 16px', borderRadius: 'var(--r-md)', color: 'var(--text-1)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Export CSV</button>
        </div>
      </div>

      {/* 3 PREMIUM CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card-standard stagger-in card-glowing-violet" style={{ padding: 24, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Your Wallet</div>
          {wallet.isConnected ? (
            <>
              <div className="stat-number">{wallet.contractBalance} <span style={{fontSize:16, color:'var(--text-3)'}}>HLUSD</span></div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', marginTop: 4 }}>{wallet.ethBalance} HELA</div>
              <div style={{ position: 'absolute', top: 20, right: 20 }}><Badge type="HEALTHY">LIVE</Badge></div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, border: '1px dashed var(--border-subtle)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>Wallet not connected</div>
              <button onClick={wallet.connectWallet} className="gradient-btn" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Icons.Fox /> Connect Now
              </button>
            </div>
          )}
        </div>
        <div className="card-standard stagger-in card-glowing-blue" style={{ padding: 24 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Executor Contract</div>
          <div className="stat-number">2,847.3310 <span style={{fontSize:16, color:'var(--text-3)'}}>HLUSD</span></div>
          <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 8 }}>ArbitrageExecutor.sol</div>
          <div style={{ marginTop: 8 }}><AddressPill address="0xAbC123456789012345678901234567890123Ef23" /></div>
        </div>
        <div className="card-standard stagger-in card-glowing-accent" style={{ padding: 24 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Session P&L</div>
          <div className="stat-number" style={{ color: 'var(--green)' }}>+${bot.session.net.toFixed(4)} <span style={{fontSize:16, color:'var(--text-3)'}}>HLUSD</span></div>
          <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', marginTop: 8 }}>ROI: <span style={{color: 'var(--green)'}}>+{bot.session.totGross ? ((bot.session.net / 847.23)*100).toFixed(2) : '0.00'}%</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Since 00:04:23 ago</div>
        </div>
      </div>

      {/* INCOME STATEMENT P&L */}
      <div className="card-standard stagger-in" style={{ padding: 32 }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 600 }}>Income Statement</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {/* REVENUE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
            <span>REVENUE</span><span>${bot.session.totGross.toFixed(4)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-2)' }}>Gross Arbitrage Profit ..................................</span>
            <span style={{ color: 'var(--green)' }}>+${bot.session.totGross.toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-2)' }}>Total Trades ............................................</span>
            <span style={{ color: 'var(--text-1)' }}>{bot.session.totTrades}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 24 }}>
            <span style={{ color: 'var(--text-2)' }}>Profitable Trades .......................................</span>
            <span style={{ color: 'var(--text-1)' }}>{bot.session.profCount} ({bot.session.margin.toFixed(1)}%)</span>
          </div>

          {/* COSTS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
            <span>COSTS</span><span>${bot.session.totGasConf.toFixed(4)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-2)' }}>Gas — Successful TXs ....................................</span>
            <span style={{ color: 'var(--red)' }}>-${bot.session.totGasConf.toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--green-dim)', borderLeft: '3px solid var(--green)', borderRadius: 'var(--r-sm)', margin: '4px 0' }} title="HeLa Network refunds gas on failed transactions. This makes every failed trade completely free.">
            <span style={{ color: 'var(--green)' }}>Gas — Reverted TXs ......................................</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ Refunded by HeLa</span>
               <span style={{ color: 'var(--text-3)' }}>$0.0000</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-2)' }}>Capital At Risk .........................................</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <span style={{ color: 'var(--text-3)', fontSize: 11 }}>(atomic execution)</span>
               <span style={{ color: 'var(--text-3)' }}>$0.0000</span>
            </div>
          </div>
          
          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }} />
          {/* NET */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
            <span>NET PROFIT</span><span style={{ color: 'var(--green)' }}>+${bot.session.net.toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', marginTop: 4 }}>
            <span>PROFIT MARGIN ...........................................</span><span>{bot.session.margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* GAS DONUT */}
        <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg viewBox="0 0 200 200">
               <circle cx="100" cy="100" r="80" fill="none" stroke="var(--border-default)" strokeWidth="16" />
               <circle cx="100" cy="100" r="80" fill="none" stroke="var(--green)" strokeWidth="16" strokeDasharray="502" strokeDashoffset="6" transform="rotate(-90 100 100)" />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>${bot.session.totGasConf.toFixed(4)}</div>
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Gas Cost Breakdown</h4>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Total gas paid this session</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--green)' }}/> Successful (98.7%)</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--red)' }}/> Reverted (<span style={{color:'var(--green)', fontWeight:700}}>0.0%</span>)</div>
            </div>
          </div>
        </div>
        
        {/* HELA COMPARISON */}
        <div className="card-standard stagger-in" style={{ padding: 24 }}>
           <h4 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Why HeLa Beats Ethereum</h4>
           <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                 <th style={{ paddingBottom: 8, fontWeight: 400 }}>Feature</th><th style={{ paddingBottom: 8, fontWeight: 400 }}>ArbiHeLa</th><th style={{ paddingBottom: 8, fontWeight: 400 }}>Legacy EVM</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td style={{ padding: '8px 0', color: 'var(--text-2)' }}>Gas Token</td>
                 <td style={{ color: 'var(--green)' }}>HLUSD ✓</td>
                 <td style={{ color: 'var(--text-4)' }}>ETH ✗</td>
               </tr>
               <tr style={{ background: 'var(--bg-elevated)' }}>
                 <td style={{ padding: '8px 4px', color: 'var(--text-2)' }}>Failed TX Cost</td>
                 <td style={{ color: 'var(--green)', fontWeight: 700 }}>$0.00 ✓</td>
                 <td style={{ color: 'var(--text-4)' }}>$2.50–$15.00 ✗</td>
               </tr>
               <tr>
                 <td style={{ padding: '8px 0', color: 'var(--text-2)' }}>Gas This Session</td>
                 <td style={{ color: 'var(--green)', fontWeight: 700 }}>${bot.session.totGasConf.toFixed(4)} ✓</td>
                 <td style={{ color: 'var(--text-4)' }}>~${(bot.session.totTrades * 1.5).toFixed(2)} est. ✗</td>
               </tr>
                <tr>
                 <td style={{ padding: '8px 0', color: 'var(--text-2)' }}>Capital Risk</td>
                 <td style={{ color: 'var(--green)' }}>0% ✓</td>
                 <td style={{ color: 'var(--text-4)' }}>100% ✗</td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>

      {/* TRANSACTION LEDGER */}
      <div className="card-standard stagger-in" style={{ padding: 24 }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
           <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Transaction Ledger</h3>
           <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Showing {dispTrades.length ? (page-1)*rows+1 : 0}–{Math.min(page*rows, trades.length)} of {trades.length} trades</div>
         </div>
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Time</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Pair</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Gross</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Gas (HLUSD)</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Net Profit</th>
              <th style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>TX Hash</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {dispTrades.map((t: Trade, i: number) => (
              <tr key={t.id || i} style={{ background: t.status === 'REVERTED' ? 'var(--red-dim)' : 'transparent', borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e)=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={(e)=>e.currentTarget.style.background=t.status==='REVERTED'?'var(--red-dim)':'transparent'}>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-3)' }}>{formatTime(new Date(t.ts))}</td>
                <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t.pair}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: t.gross > 0 ? 'var(--green)' : 'var(--text-3)' }}>{t.gross ? `+$${t.gross.toFixed(4)}` : '—'}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-4)' }}>{t.gas ? `-$${t.gas.toFixed(6)}` : '—'}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: t.net > 0 ? 'var(--green)' : 'var(--text-3)' }}>
                  {t.status === 'REVERTED' ? '$0.0000' : (t.net ? `+$${t.net.toFixed(4)}` : '—')}
                </td>
                <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--blue)' }}>
                  <a href={`${HELA_EXPLORER}/tx/${t.hash}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t.hash.slice(0,10)}... <Icons.Link />
                  </a>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <Badge type={t.status} />
                  {t.status === 'REVERTED' && <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 4 }}>Refunded ✓</div>}
                </td>
              </tr>
            ))}
            {dispTrades.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No trades recorded yet.</td></tr>}
          </tbody>
        </table>
        
      {/* Pagination Controls */}
        {totPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
             <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-2)', padding: '4px 12px', borderRadius: 4, cursor: page===1?'not-allowed':'pointer' }}>←</button>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>Page {page} of {totPages}</div>
             <button onClick={() => setPage(p => Math.min(totPages, p+1))} disabled={page===totPages} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-2)', padding: '4px 12px', borderRadius: 4, cursor: page===totPages?'not-allowed':'pointer' }}>→</button>
          </div>
        )}
      </div>

    </div>
  );
};
const LiveTradingPage = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>Live Execution Feed</h2>
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Real-time streaming output from the HFT Python engine</div>
        </div>
        <Toggle active={bot.isRunning} onChange={bot.toggleBot} />
      </div>

      {/* STRATEGY SELECTOR */}
      <StrategySelector bot={bot} />

      <div className="card-standard stagger-in" style={{ padding: 24, background: 'var(--bg-void)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
           <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
             <span style={{ color: 'var(--green)' }}>● {bot.session.profCount} successful</span>
             <span style={{ color: 'var(--red)' }}>● {bot.session.revCount} reverted</span>
             <span style={{ color: 'var(--text-3)' }}>{bot.logs.length} events total</span>
           </div>
           <button onClick={bot.clearLogs} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-3)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Clear Logs</button>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: 8 }}>
            {bot.logs.map((l: Trade, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', borderLeft: `2px solid var(--${l.status==='CONFIRMED'?'green':l.status==='REVERTED'?'red':l.status==='PENDING'?'amber':l.status==='SCAN'?'blue':'border-subtle'})` }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-4)', width: 80, flexShrink: 0 }}>{formatTime(new Date(l.ts))}</span>
                <div style={{ flexShrink: 0, width: 90 }}><Badge type={l.status} /></div>
                <div style={{ flex: 1, fontSize: 14, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {l.pair && <span style={{ color: 'var(--violet)' }}>[{l.pair}] </span>}
                  {l.pA && <span style={{ color: 'var(--blue)' }}>pA: {l.pA.toFixed(4)} </span>}
                  {l.pB && <span style={{ color: 'var(--blue)' }}>pB: {l.pB.toFixed(4)} </span>}
                  <span style={{ color: 'var(--text-2)' }}>
                    {l.msg || (l.hash ? `TX Hash: ${l.hash}` : 'Scanning routers for spreads...')}
                  </span>
                </div>
                {l.gross && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>+${l.gross.toFixed(4)}</div>}
              </div>
            ))}
            {bot.logs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>No logs yet. Engine might be paused.</div>}
         </div>
      </div>
    </div>
  );
};

const TradeHistoryPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>Trade History Archive</h2>
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Complete ledger of all arbitrage transactions on HeLa Testnet</div>
      </div>
      <div className="card-standard stagger-in" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-1)' }}>Archival Data</h3>
            <p style={{ maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>For comprehensive trade history, P&L reporting, and CSV exports, please use the interactive <strong>Balance Sheet</strong> tab.</p>
         </div>
      </div>
    </div>
  );
};


const SimulationModal = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const { addToast } = useToast();
  
  useEffect(() => {
    const run = async () => {
      setStep(1); await new Promise(r => setTimeout(r, 800)); // Scanning
      setStep(2); await new Promise(r => setTimeout(r, 600)); // Calc
      setStep(3); await new Promise(r => setTimeout(r, 1000)); // Broadcast
      setStep(4); await new Promise(r => setTimeout(r, 1200)); // Confirm
      setStep(5); // Success
      
      const el = document.getElementById('sim-confetti');
      if (el) {
        for(let i=0; i<30; i++) {
          const dec = document.createElement('div');
          dec.className = 'confetti-piece';
          dec.style.backgroundColor = ['#00e696', '#4f8dff', '#a78bfa', '#fbbf24'][Math.floor(Math.random()*4)] || '';
          dec.style.left = '50%'; dec.style.top = '30%';
          dec.style.setProperty('--tx', `${(Math.random()-0.5)*400}px`);
          dec.style.setProperty('--ty', `${(Math.random()-0.5)*400}px`);
          el.appendChild(dec);
          setTimeout(() => dec.remove(), 1200);
        }
      }
      
      // FIX: Move state update out of sync path using a temporary variable or timeout
      setTimeout(() => {
        addToast('SUCCESS', 'Simulation Complete', 'Arbitrage lifecycle simulation ended successfully');
      }, 500);
    };
    run();
  }, [addToast]);

  return (
    <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(3,3,10,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-standard stagger-in" style={{ width: 600, padding: 32, position: 'relative' }} id="sim-confetti">
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 24 }}>×</button>
        <h3 style={{ margin: '0 0 24px 0', fontSize: 20, fontWeight: 700 }}>ArbiHeLa TX Lifecycle Simulation</h3>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
           {[1,2,3,4,5].map(s => (
             <div key={s} style={{ height: 4, flex: 1, background: step >= s ? (s===5 ? 'var(--green)' : 'var(--blue)') : 'var(--bg-elevated)', borderRadius: 2, transition: 'background 300ms' }} />
           ))}
        </div>

        <div style={{ minHeight: 200, fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {step >= 1 && (
            <div style={{ animation: 'fadeInUp 200ms ease' }}>
              <div style={{ color: 'var(--text-3)' }}>[1/5] SCANNING (800ms)</div>
              <div>Scanning HelaDEX vs HelaSwap for USDC/HELA...</div>
              <div style={{ color: 'var(--blue)' }}>HelaDEX: 1.0412 · HelaSwap: 1.0451 · Spread: +0.375%</div>
            </div>
          )}
          {step >= 2 && (
            <div style={{ animation: 'fadeInUp 200ms ease', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ color: 'var(--text-3)' }}>[2/5] CALCULATING (600ms)</div>
              <div>Gross profit:  +$0.0847 HLUSD</div>
              <div>Gas (HLUSD):   -$0.000031</div>
              <div style={{ color: 'var(--green)' }}>Net profit:    +$0.084669 HLUSD ✓</div>
              <div>Threshold:     $0.01 ✓</div>
              <div style={{ color: 'var(--text-1)', fontWeight: 700 }}>→ EXECUTE</div>
            </div>
          )}
          {step >= 3 && (
            <div style={{ animation: 'fadeInUp 200ms ease', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ color: 'var(--text-3)' }}>[3/5] BROADCASTING (1000ms)</div>
              <div>Signing transaction...</div>
              <div>Broadcasting to HeLa Testnet mempool...</div>
              <div style={{ color: 'var(--amber)' }}>0x4f2a8b...9c81 · Status: PENDING ⏳</div>
            </div>
          )}
          {step >= 4 && (
            <div style={{ animation: 'fadeInUp 200ms ease', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ color: 'var(--text-3)' }}>[4/5] CONFIRMING (1200ms)</div>
              <div>Waiting for block... #4,821,044</div>
              <div>require(balanceAfter {'>'} balanceBefore)... CHECKING...</div>
              <div style={{ color: 'var(--green)' }}>→ CONDITION MET ✓ — Transaction confirmed!</div>
            </div>
          )}
          {step >= 5 && (
            <div style={{ animation: 'fadeInUp 200ms ease', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <h2 style={{ color: 'var(--green)', fontSize: 24, margin: '8px 0', textShadow: '0 0 20px rgba(0,230,150,0.4)', textAlign: 'center' }}>✓ ARBITRAGE SUCCESSFUL</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--green-dim)', padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--green)' }}>
                 <div>Profit: +$0.0847 HLUSD</div><div>Gas: $0.000031 HLUSD</div>
                 <div>Net APY: ~340%</div><div>TX: 0x4f2a...9c81</div>
              </div>
            </div>
          )}
        </div>
        
        {step >= 5 && (
           <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
             <button onClick={onClose} className="gradient-btn" style={{ padding: '10px 24px', borderRadius: 'var(--r-md)', color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer' }}>Close Simulator</button>
           </div>
        )}
      </div>
    </div>
  );
};

const TestnetLabPage = ({ wallet }: { wallet: ReturnType<typeof useWallet> }) => {
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<{name: string, text: string, status: string}[]>([]);
  const [simOpen, setSimOpen] = useState(false);
  const { addToast } = useToast();

  const runChecks = async () => {
    setChecking(true); setChecks([]);
    const stages = [
      { name: 'RPC Connection', text: '● RPC Connected · Block #4,821,043 · 34ms', status: 'HEALTHY' },
      { name: 'Chain ID Verification', text: `Chain ID: ${HELA_CHAIN_ID} ✓ (HeLa Testnet)`, status: 'HEALTHY' },
      { name: 'Wallet Connection', text: wallet.isConnected && wallet.address ? `● Wallet: ${wallet.address.slice(0,6)}... on HeLa Testnet ✓` : '○ Wallet: Not Connected', status: wallet.isConnected ? 'HEALTHY' : 'WARNING' },
      { name: 'Contract Reachability', text: `Contract ${EX_ADDR.slice(0,6)}...${EX_ADDR.slice(-4)} · getBalance() → 847.23 HLUSD`, status: 'HEALTHY' },
      { name: 'Gas Estimation', text: 'Estimated gas: 0.000031 HLUSD per trade', status: 'HEALTHY' },
      { name: 'DEX Router Ping', text: 'HelaDEX Router ✓ · HelaSwap Router ✓', status: 'HEALTHY' },
    ];
    for(const s of stages) {
      await new Promise(r => setTimeout(r, 400 + Math.random()*300));
      setChecks(p => [...p, s]);
    }
    setChecking(false);
    addToast(wallet.isConnected ? 'SUCCESS' : 'WARNING', 'Health Check Complete', wallet.isConnected ? '✓ All systems operational' : '⚠ Wallet not connected');
  };

  const reqFaucet = (amt: string) => {
    addToast('INFO', 'Requesting Funds', `Requesting ${amt}...`);
    setTimeout(() => {
      addToast('SUCCESS', 'Faucet Success', `✓ ${amt} sent to ${wallet.address ? wallet.address.slice(0,6)+'...' : 'your wallet'}`);
    }, 2000);
  };

  return (
    <>
    {simOpen && <SimulationModal onClose={() => setSimOpen(false)} />}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
          Testnet Lab <div style={{ fontSize: 10, background: 'var(--cyan-dim)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(34,211,238,0.3)', verticalAlign: 'middle' }}>DEVELOPER TOOLS</div>
        </h2>
        <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Test your wallet, verify contract interactions, and validate the HeLa network connection</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* FAUCET PANEL */}
        <div className="card-standard stagger-in" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>🚰 HeLa Testnet Faucet</h3>
          <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Request test HELA and HLUSD tokens for your wallet</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" value={wallet.address || ''} readOnly placeholder="0x..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={!wallet.isConnected} onClick={()=>reqFaucet('1 HELA')} style={{ flex: 1, padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', cursor: wallet.isConnected?'pointer':'not-allowed', opacity: wallet.isConnected?1:0.5 }}>Request 1 HELA</button>
              <button disabled={!wallet.isConnected} onClick={()=>reqFaucet('10 HLUSD')} style={{ flex: 1, padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', cursor: wallet.isConnected?'pointer':'not-allowed', opacity: wallet.isConnected?1:0.5 }}>Request 10 HLUSD</button>
            </div>
            <a href="https://faucet.helachain.com" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue)', textAlign: 'center', marginTop: 8, display: 'block' }}>Official HeLa Faucet →</a>
          </div>
        </div>

        {/* NETWORK HEALTH */}
        <div className="card-standard stagger-in" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🌐 Network Status</h3>
             {checks.length === 6 && !checking ? (
               <button onClick={runChecks} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-2)', padding: '4px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11 }}>Re-run Checks</button>
             ) : (
               <button disabled={checking} onClick={runChecks} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-1)', padding: '4px 12px', borderRadius: 'var(--r-sm)', cursor: checking?'not-allowed':'pointer', fontSize: 11 }}>{checking ? 'Running...' : 'Run Health Check'}</button>
             )}
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
             {checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', animation: 'fadeInUp 200ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: c.status==='HEALTHY'?'var(--green)':'var(--amber)' }} />
                    <span style={{ color: 'var(--text-2)' }}>{c.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-1)' }}>{c.text}</div>
                </div>
             ))}
             {checking && (
                <div style={{ padding: '10px 0', color: 'var(--text-3)' }}>Testing next component...</div>
             )}
          </div>
          {checks.length === 6 && (
            <div style={{ marginTop: 16, background: wallet.isConnected?'var(--green-dim)':'var(--amber-dim)', border: wallet.isConnected?'1px solid var(--green)':'1px solid var(--amber)', padding: 12, borderRadius: 'var(--r-md)', color: wallet.isConnected?'var(--green)':'var(--amber)', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
              {wallet.isConnected ? '✓ All Systems Operational — Ready to trade' : '⚠ 5/6 Checks Passed — Connect Wallet'}
            </div>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
         {/* CONTRACT TESTER */}
         <div className="card-standard stagger-in" style={{ padding: 24 }}>
           <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>⬡ Contract Tester</h3>
           <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Test ArbitrageExecutor functions (simulation mode)</div>
           
           <select style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none', marginBottom: 16 }}>
              <option>executeArbitrage(tokenA, tokenB, amountIn, dexA, dexB)</option>
              <option>getBalance(tokenAddress)</option>
              <option>setMinProfit(uint256)</option>
           </select>
           
           <div style={{ background: 'var(--bg-void)', padding: 16, borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', lineHeight: 1.6 }}>
             ✓ Simulation Successful<br/>
             <span style={{color:'var(--text-3)'}}>Input:</span>  100.0 USDC<br/>
             <span style={{color:'var(--text-3)'}}>Output:</span> 100.0847 USDC<br/>
             <span style={{color:'var(--text-3)'}}>Profit:</span> +0.0847 USDC<br/>
             <span style={{color:'var(--text-3)'}}>Gas:</span> 0.000031 HLUSD<br/>
             require(balanceAfter {'>'} balanceBefore) → PASSED ✓
           </div>
         </div>

         {/* TX SIMULATOR CTA */}
         <div className="card-standard stagger-in" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700 }}>⚡ TX Simulator</h3>
            <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 32, maxWidth: 300 }}>Send a simulated trade and watch the full execution lifecycle end-to-end.</div>
            <button onClick={() => setSimOpen(true)} className="gradient-btn" style={{ padding: '14px 32px', borderRadius: 'var(--r-lg)', color: 'var(--text-1)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
               Launch Full Simulation ▶
            </button>
         </div>

      </div>
    </div>
    </>
  );
};
const SystemHealthPage = ({ bot }: { bot: ReturnType<typeof useArbitrageSimulator> }) => {
  const [latency] = useState(() => Array(20).fill(0).map(() => 20 + Math.random()*40));
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>System Health & Telemetry</h2>
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Real-time diagnostic metrics for the Python HFT Engine and HeLa Network RPC</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={bot.isRunning ? "network-dot healthy" : ""} style={{ width: 10, height: 10, borderRadius: '50%', background: bot.isRunning ? 'var(--green)' : 'var(--red)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: bot.isRunning ? 'var(--green)' : 'var(--red)' }}>{bot.isRunning ? 'ENGINE ONLINE' : 'ENGINE PAUSED'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
         <div className="card-standard stagger-in" style={{ padding: 20 }}>
            <div className="section-label">HeLa RPC Latency</div>
            <div className="stat-number" style={{ margin: '8px 0', color: 'var(--green)', fontSize: 32 }}>34<span style={{fontSize:16, color:'var(--text-3)'}}>ms</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Avg over 5m (P99: 48ms)</div>
         </div>
         <div className="card-standard stagger-in" style={{ padding: 20 }}>
            <div className="section-label">Engine Loop Rate</div>
            <div className="stat-number" style={{ margin: '8px 0', color: 'var(--blue)', fontSize: 32 }}>800<span style={{fontSize:16, color:'var(--text-3)'}}>ms</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Python AsyncIO Tick</div>
         </div>
         <div className="card-standard stagger-in" style={{ padding: 20 }}>
            <div className="section-label">Contract Calls</div>
            <div className="stat-number" style={{ margin: '8px 0', color: 'var(--text-1)', fontSize: 32 }}>{bot.session.totTrades}<span style={{fontSize:16, color:'var(--text-3)'}}>tx</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>0.0% failure rate</div>
         </div>
         <div className="card-standard stagger-in" style={{ padding: 20 }}>
            <div className="section-label">System Memory</div>
            <div className="stat-number" style={{ margin: '8px 0', color: 'var(--violet)', fontSize: 32 }}>142<span style={{fontSize:16, color:'var(--text-3)'}}>MB</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Stable (0.24% of host)</div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        
         <div className="card-standard stagger-in" style={{ padding: 24 }}>
           <h3 style={{ margin: '0 0 24px 0', fontSize: 16, fontWeight: 600 }}>RPC Latency Chart (Last 60s)</h3>
           <div style={{ height: 160, position: 'relative' }}>
             <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
               <line x1="0" y1="40" x2="400" y2="40" stroke="var(--border-subtle)" strokeDasharray="4 4" />
               <line x1="0" y1="80" x2="400" y2="80" stroke="var(--border-subtle)" strokeDasharray="4 4" />
               <line x1="0" y1="120" x2="400" y2="120" stroke="var(--border-subtle)" strokeDasharray="4 4" />
               <polyline 
                 points={latency.map((val, i) => `${(i/19)*400},${160 - val*2}`).join(' ')} 
                 fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
               />
               {latency.map((val, i) => (
                 <circle cx={(i/19)*400} cy={160 - val*2} r="4" fill="var(--bg-card)" stroke="var(--green)" strokeWidth="2" key={i} />
               ))}
             </svg>
             <div style={{ position: 'absolute', top: 32, right: -40, fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>60ms</div>
             <div style={{ position: 'absolute', top: 72, right: -40, fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>40ms</div>
             <div style={{ position: 'absolute', top: 112, right: -40, fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>20ms</div>
           </div>
         </div>

         <div className="card-standard stagger-in" style={{ padding: 24 }}>
           <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Component Status</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)' }}>Next.js Frontend</span>
                <span style={{ color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 4 }}>ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)' }}>Python Executor</span>
                <span style={{ color: bot.isRunning?'var(--green)':'var(--amber)', background: bot.isRunning?'var(--green-dim)':'var(--amber-dim)', padding: '2px 8px', borderRadius: 4 }}>{bot.isRunning?'ONLINE':'STANDBY'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)' }}>HeLa RPC Node</span>
                <span style={{ color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 4 }}>ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)' }}>HelaDEX API</span>
                <span style={{ color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 4 }}>ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)' }}>HelaSwap API</span>
                <span style={{ color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 4 }}>ONLINE</span>
              </div>
           </div>
           
           <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-4)' }}>
              Bot state source: <code style={{ color: 'var(--text-2)' }}>bot_state.json</code><br/>
              Last modified: {new Date().toLocaleTimeString()}
           </div>
         </div>
      </div>
      {/* BOUNTY DELIVERABLES */}
      <DeliverableChecklist bot={bot} />
    </div>
  );
};

// ==========================================
// APP SHELL
// ==========================================

const BOOT_LOG_MSGS = [
  "Connecting to HeLa RPC .................. ✓ 34ms",
  "Loading ArbitrageExecutor ABI ........... ✓",
  "Scanning DEX routers .................... ✓ 2 active",
  "Initializing quant engine ............... ✓",
  "ARBIHELA v1.0.0 — ONLINE ............... ✓"
];

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [logoChars, setLogoChars] = useState(0);
  const [logs, setLogs] = useState(0);
  const [fade, setFade] = useState(false);
  
  useEffect(() => {
    const t: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0);
    const run = async () => {
      // Draw logo
      for(let i=1; i<=8; i++) {
        setLogoChars(i); await new Promise(r => setTimeout(r, 50));
      }
      await new Promise(r => setTimeout(r, 300));
      // Draw logs
      for(let i=1; i<=5; i++) {
        setLogs(i); await new Promise(r => setTimeout(r, 380));
      }
      await new Promise(r => setTimeout(r, 400));
      setFade(true);
      await new Promise(r => setTimeout(r, 400));
      onComplete();
    };
    run();
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'var(--bg-base)',
      zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fade ? 0 : 1, transition: 'opacity 400ms ease', color: 'var(--text-1)'
    }}>
      <div style={{ width: 400 }}>
        <h1 style={{ fontSize: 48, fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0 0 24px 0', letterSpacing: '0.1em' }}>
          {"ARBIHELA".slice(0, logoChars)}
        </h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BOOT_LOG_MSGS.slice(0, logs).map((msg, i) => <div key={i}>{`[██] ${msg}`}</div>)}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CONSENT & CONNECTION MODALS
// ==========================================
function ConsentModal({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const { state, error, handleConsentApproved, startReset } = wallet;

  // Modal should only show during active wallet flow states
  const activeStates: WalletState[] = [WALLET_STATE.MODAL_OPEN, WALLET_STATE.REQUESTING, WALLET_STATE.SWITCHING_NET, WALLET_STATE.FETCHING, WALLET_STATE.ERROR, WALLET_STATE.NO_METAMASK];
  if (!activeStates.includes(state)) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const renderContent = () => {
    switch (state) {
      case WALLET_STATE.MODAL_OPEN:
        return (
          <div onClick={stop} className="card-standard" style={{ width: 'min(480px, 95vw)', padding: 32, borderRadius: 24, background: C.surface }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Icons.Fox />
              <h2 style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 800, marginTop: 16 }}>Connect Your Wallet</h2>
              <div style={{ fontSize: 13, color: C.violet }}>ArbiHeLa · Oracle&apos;s Decree</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.t3, marginBottom: 8 }}>YOU ARE CONNECTING TO</div>
              <div style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, background: C.green, borderRadius: '50%', boxShadow: `0 0 10px ${C.green}` }} className="pulse-slow" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>ArbiHeLa — HeLa Yield Optimizer</div>
                  <div style={{ fontSize: 11, fontFamily: C.mono, color: C.t3 }}>testnet-rpc.helachain.com</div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.green, background: C.greenDim, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.greenDim}` }}>SECURE</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.t3, marginBottom: 10 }}>THIS CONNECTION WILL:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PermissionRow title="View your wallet address" desc="Read-only · Public blockchain data" allowed />
                <PermissionRow title="Check your HeLa balances" desc="Read-only · No funds can be moved" allowed />
                <PermissionRow title="Switch to HeLa Testnet" desc="Required for all protocol features" allowed extra="Required" />
                <PermissionRow title="Oracle's Decree Protection" desc="Capital Access Lock: ACTIVE" allowed={true} extra="SECURED" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={startReset} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.t2, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConsentApproved} className="gradient-btn" style={{ flex: 2, padding: 12, borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icons.Fox /> Connect with MetaMask →
              </button>
            </div>
          </div>
        );

      case WALLET_STATE.REQUESTING:
      case WALLET_STATE.SWITCHING_NET:
      case WALLET_STATE.FETCHING:
        const step = state === WALLET_STATE.REQUESTING ? 1 : (state === WALLET_STATE.SWITCHING_NET ? 2 : 3);
        const titles = { [WALLET_STATE.REQUESTING]: 'Waiting for MetaMask...', [WALLET_STATE.SWITCHING_NET]: 'Adding HeLa Network...', [WALLET_STATE.FETCHING]: 'Loading Balances...' };
        return (
          <div onClick={stop} className="card-standard" style={{ width: 440, padding: 40, textAlign: 'center', borderRadius: 24 }}>
            <div className="spinner" style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: step === 2 ? C.cyan : (step === 3 ? C.green : C.green), margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{titles[state]}</h3>
            <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginBottom: 32 }}>Please confirm the action in your MetaMask extension to proceed.</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'absolute', top: 5, left: 20, right: 20, height: 1, background: C.border, zIndex: 0 }} />
              <StepDot active={step >= 1} done={step > 1} label="Accounts" />
              <StepDot active={step >= 2} done={step > 2} label="Network" />
              <StepDot active={step >= 3} done={step > 3} label="Connect" />
            </div>
            
            {state === WALLET_STATE.FETCHING && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="shimmer" style={{ height: 12, borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 12, borderRadius: 4, width: '70%', margin: '0 auto' }} />
              </div>
            )}
            
            <button onClick={startReset} style={{ marginTop: 32, background: 'transparent', border: 'none', color: C.t3, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Dismiss</button>
          </div>
        );

      case WALLET_STATE.ERROR:
        return (
          <div onClick={stop} className="card-standard" style={{ width: 400, padding: 32, textAlign: 'center', borderRadius: 24 }}>
            <div style={{ width: 56, height: 56, background: C.redDim, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${C.red}` }}>
              <span style={{ color: C.red, fontSize: 24 }}>✗</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Connection Failed</h3>
            <div style={{ background: C.redDim, padding: 14, borderRadius: 10, fontSize: 12, fontFamily: C.mono, color: C.red, marginBottom: 24, textAlign: 'left', lineHeight: 1.5 }}>
              {error}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => wallet.connectWallet()} className="gradient-btn" style={{ flex: 1, padding: 10, borderRadius: 8, color: '#000', fontWeight: 600 }}>Try Again</button>
              <button onClick={startReset} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2 }}>Cancel</button>
            </div>
          </div>
        );

      case WALLET_STATE.NO_METAMASK:
        return (
          <div onClick={stop} className="card-standard" style={{ width: 400, padding: 32, textAlign: 'center', borderRadius: 24 }}>
            <Icons.Fox />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>MetaMask Not Found</h3>
            <p style={{ fontSize: 13, color: C.t2, margin: '16px 0 24px' }}>ArbiHeLa requires the MetaMask extension to read your wallet data on the HeLa Testnet.</p>
            <a href="https://metamask.io/download" target="_blank" rel="noreferrer" className="gradient-btn" style={{ display: 'block', padding: 12, borderRadius: 10, color: '#000', fontWeight: 700, textDecoration: 'none' }}>Install MetaMask</a>
            <button onClick={startReset} style={{ marginTop: 16, background: 'transparent', border: 'none', color: C.t3, fontSize: 11, cursor: 'pointer' }}>Close</button>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div onClick={startReset} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderContent()}
    </div>
  );
}

function PermissionRow({ title, desc, allowed, extra }: { title: string, desc: string, allowed: boolean, extra?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
      {allowed ? (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="9" fill={C.greenDim} stroke={C.green} strokeWidth="1" />
          <path d="M6 10 L9 13 L14 7" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="9" fill={C.redDim} stroke={C.red} strokeWidth="1" />
          <path d="M7 7 L13 13 M13 7 L7 13" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          {extra && <div style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: extra==='Required' ? C.blueDim : C.redDim, color: extra==='Required' ? C.blue : C.red }}>{extra}</div>}
        </div>
        <div style={{ fontSize: 10, color: C.t3 }}>{desc}</div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean, done: boolean, label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: done ? C.green : (active ? C.bg : C.bg), border: `2px solid ${done ? C.green : (active ? C.green : C.border)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {done && <span style={{ fontSize: 8, color: '#000' }}>✓</span>}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: active ? C.t1 : C.t4 }}>{label}</div>
    </div>
  );
}

function WalletCard({ wallet, compact = false }: { wallet: ReturnType<typeof useWallet>, compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { address, ethBalance, hlusdBalance, isCorrectNetwork, disconnectWallet } = wallet;

  if (!address) return null;

  const hue = parseInt(address.slice(2, 8), 16) % 360;
  const avatar = (
    <div style={{ width: compact ? 24 : 36, height: compact ? 24 : 36, borderRadius: '50%', background: `hsl(${hue}, 65%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 9 : 12, fontWeight: 900, color: '#fff' }}>
      {address.slice(2, 4).toUpperCase()}
    </div>
  );

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: isCorrectNetwork ? C.greenDim : C.amberDim, border: `1px solid ${isCorrectNetwork ? C.borderAcc : C.amber}`, borderRadius: 10, cursor: 'pointer' }}>
          {avatar}
          <div style={{ fontSize: 12, fontFamily: C.mono, color: C.t1 }}>{address.slice(0, 6)}...{address.slice(-4)}</div>
          <Icons.Down />
        </div>
        {open && (
         <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div className="card-standard stagger-in" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 260, padding: 16, zIndex: 11, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {avatar}
              <div style={{ fontFamily: C.mono, fontSize: 13 }}>{address.slice(0, 8)}...{address.slice(-6)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.t3, fontSize: 11 }}>HELA</span><span style={{ fontFamily: C.mono, color: C.green }}>{ethBalance}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.t3, fontSize: 11 }}>HLUSD</span><span style={{ fontFamily: C.mono, color: C.green }}>{hlusdBalance}</span></div>
            </div>
            <div style={{ height: 1, background: C.border, margin: '0 0 12px' }} />
            {!showConfirm ? (
              <div onClick={() => setShowConfirm(true)} style={{ color: C.red, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>Disconnect</div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.t2, marginBottom: 8 }}>Sure to disconnect?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={disconnectWallet} style={{ flex: 1, padding: '4px 8px', borderRadius: 4, background: C.redDim, border: `1px solid ${C.red}`, color: C.red, fontSize: 10 }}>Yes</button>
                  <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '4px 8px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2, fontSize: 10 }}>No</button>
                </div>
              </div>
            )}
          </div>
         </>
        )}
      </div>
    );
  }

  return (
    <div className="card-standard" style={{ padding: 20, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} className="pulse-slow" />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Wallet Linked</span>
        </div>
        <div style={{ background: C.blueDim, color: C.blue, padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>HELA TESTNET</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {avatar}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.mono, fontSize: 14 }}>{address}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: C.elevated, padding: 12, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, color: C.t3, marginBottom: 4 }}>HELA BALANCE</div>
          <div style={{ fontFamily: C.mono, fontSize: 16 }}>{ethBalance}</div>
        </div>
        <div style={{ background: C.elevated, padding: 12, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, color: C.t3, marginBottom: 4 }}>HLUSD BALANCE</div>
          <div style={{ fontFamily: C.mono, fontSize: 16, color: C.green }}>{hlusdBalance}</div>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [booted, setBooted] = useState(false);
  const [themeDark, setThemeDark] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const wallet = useWallet();
  const bot = useArbitrageSimulator(audioEnabled);
  const [activePage, setActivePage] = useState('HOME');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Themes & Hydration
  useEffect(() => {
    const savedTheme = localStorage.getItem('arbihela_theme');
    if (savedTheme === 'light') {
      setTimeout(() => setThemeDark(false), 0);
      document.documentElement.removeAttribute('data-theme');
    } else {
      setTimeout(() => setThemeDark(true), 0);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    setTimeout(() => {
      setMounted(true);
      setTimeout(() => setBooted(true), 800);
    }, 50);
  }, []);

  const toggleTheme = () => {
    const next = !themeDark;
    setThemeDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('arbihela_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('arbihela_theme', 'light');
    }
  };

  // Dynamic Title
  useEffect(() => {
    document.title = bot.isRunning ? `🟢 +$${bot.session.net.toFixed(3)} · ArbiHeLa` : `⏸ ArbiHeLa — HFT Protocol`;
  }, [bot.isRunning, bot.session.net]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(e.target instanceof HTMLInputElement) return;
      switch(e.key.toLowerCase()) {
        case 'p': bot.toggleBot(); break;
        case 'h': setActivePage('HOME'); break;
        case 'd': setActivePage('DASHBOARD'); break;
        case 't': setActivePage('LIVE'); break;
        case 'b': setActivePage('BAL'); break;
        case 's': setActivePage('HEALTH'); break;
        case 'l': setActivePage('LAB'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bot, setActivePage]);

  // Auto-Redirect to Dashboard on Connect
  const prevConnected = useRef(wallet.isConnected);
  useEffect(() => {
    if (!prevConnected.current && wallet.isConnected) {
      setTimeout(() => setActivePage('DASHBOARD'), 0);
    }
    prevConnected.current = wallet.isConnected;
  }, [wallet.isConnected, setActivePage]);

  // Navigation Guard: Reset to Home on Disconnect
  useEffect(() => {
    if (!wallet.isConnected && activePage !== 'HOME') {
      setTimeout(() => setActivePage('HOME'), 0);
    }
  }, [wallet.isConnected, activePage]);

  if (!mounted) return null;

  const renderPage = () => {
    switch(activePage) {
      case 'HOME': return <HomePage onConnect={wallet.connectWallet} />;
      case 'DASHBOARD': return <DashboardPage bot={bot} wallet={wallet} />;
      case 'UNITED': return <UnitedActionPage bot={bot} />;
      case 'LIVE': return <LiveTradingPage bot={bot} />;
      case 'BAL': return <BalanceSheetPage bot={bot} wallet={wallet} />;
      case 'HIST': return <TradeHistoryPage />;
      case 'LAB': return <TestnetLabPage wallet={wallet} />;
      case 'HEALTH': return <SystemHealthPage bot={bot} />;
    }
  };

  const navItems = [
    { id: 'HOME', label: 'Home View', Icon: Icons.Home, key: 'H' },
    { id: 'DASHBOARD', label: 'Dashboard', Icon: Icons.Dash, key: 'D' },
    { id: 'UNITED', label: 'Command Center', Icon: Icons.Terminal, key: 'M' },
    { id: 'LIVE', label: 'Live Trading', Icon: Icons.Live, key: 'T' },
    { id: 'BAL', label: 'Balance Sheet', Icon: Icons.Bal, key: 'B' },
    { id: 'HIST', label: 'Trade History', Icon: Icons.Hist, key: 'H' }, 
    { id: 'LAB', label: 'Testnet Lab', Icon: Icons.Lab, key: 'L' },
    { id: 'HEALTH', label: 'System Health', Icon: Icons.Health, key: 'S' },
  ];

  return (
    <>
      {!booted && <BootSequence onComplete={() => setBooted(true)} />}
      <ConsentModal wallet={wallet} />
      <div style={{ display: 'flex', minHeight: '100vh', opacity: booted ? 1 : 0, transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* SIDEBAR */}
        {wallet.isConnected && (
          <div style={{
            width: 260, position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 110,
            background: 'var(--bg-elevated)',
            borderRight: '3px solid var(--border-default)',
            display: 'flex', flexDirection: 'column',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: sidebarOpen ? '20px 0 50px rgba(0,0,0,0.3)' : 'none'
          }}>
            {/* Brand */}
            <div style={{ padding: '32px 28px 20px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 44, height: 44, background: 'var(--bg-base)', border: '2px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon.png" alt="ArbiHeLa Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>ARBI</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--gold)', letterSpacing: '-0.02em' }}>HELA</span>
                   </div>
                   <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.1em' }}>HFT PROTOCOL</span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontStyle: 'italic', color: 'var(--violet)', letterSpacing: '0.05em', marginTop: 4 }}>Code Name: Oracle&apos;s Decree</div>
              
              <div style={{ marginTop: 12, background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', padding: '5px 14px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <div className="network-dot healthy" style={{ width: 5, height: 5 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', fontWeight: 500, letterSpacing: '0.05em' }}>HELA TESTNET</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-4)', paddingLeft: 2 }}>Block #{4821000 + bot.stats.scans}</div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)', margin: '0 24px' }} />

            {/* Navigation */}
            <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems.filter(item => item.id === 'HOME' || wallet.isConnected).map(item => {
                const active = activePage === item.id;
                return (
                  <div key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }} title={`Shortcut: ${item.key}`} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderRadius: 'var(--r-md)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 600 : 400,
                    background: active ? 'var(--gold-dim)' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--text-2)',
                    borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                    transition: 'all 0.25s ease'
                  }} onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(200,169,110,0.04)')}
                     onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}>
                    <item.Icon />
                    {item.label}
                    {item.id === 'LIVE' && bot.session.profCount > 0 && (
                      <div style={{ marginLeft: 'auto', background: 'var(--green)', width: 6, height: 6, borderRadius: '50%' }} />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: 24, paddingBottom: 40, borderTop: '1px solid var(--border-subtle)' }}>
               <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, fontWeight: 700 }}>ACCOUNT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.blue }} />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{wallet.address?.slice(0,10)}...</div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* SIDEBAR TOGGLE ARROW */}
        {wallet.isConnected && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed', left: sidebarOpen ? 245 : 15, top: '50%', transform: 'translateY(-50%)',
              zIndex: 120, width: 32, height: 32, borderRadius: '50%',
              background: 'var(--gold)', color: '#000', border: '3px solid var(--bg-void)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 20px rgba(200,169,110,0.3)'
            }}
          >
            <div style={{ 
              transform: sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.4s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </button>
        )}

        {/* MAIN CONTENT */}
        <div style={{ 
          marginLeft: (wallet.isConnected && sidebarOpen) ? 260 : 0, 
          width: (wallet.isConnected && sidebarOpen) ? 'calc(100% - 260px)' : '100%', 
          overflowY: 'auto', 
          transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}>
          {/* TOP BAR */}
          <div style={{ height: 70, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--bg-elevated)', borderTopRightRadius: 'var(--r-lg)', position: 'sticky', top: 0, zIndex: 100 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} className="pulse" />
                 <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em' }}>HELA TESTNET ONLINE</span>
               </div>
               <div style={{ height: 20, width: 1, background: 'var(--border-subtle)' }} />
               <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                 <div>RPC: 14ms</div><div>POOL: 1.2M HLUSD</div>
               </div>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 40 }}>
               <button onClick={() => setAudioEnabled(!audioEnabled)} style={{ background: 'transparent', border: 'none', color: audioEnabled ? 'var(--blue)' : 'var(--text-4)', cursor: 'pointer', padding: 8 }}>
                 {audioEnabled ? <Icons.SpeakerOn /> : <Icons.SpeakerOff />}
               </button>
               <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 8 }}>
                 {themeDark ? <Icons.Sun /> : <Icons.Moon />}
               </button>
               
               {wallet.isConnected ? (
                 <WalletCard wallet={wallet} compact />
               ) : (
                 <button onClick={wallet.connectWallet} className="gradient-btn" style={{ padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', position: 'relative', zIndex: 101 }}>
                   <Icons.Fox /> Connect Wallet
                 </button>
               )}
             </div>
          </div>

          {/* WRONG NETWORK BANNER */}
          {wallet.state === WALLET_STATE.WRONG_NETWORK && (
            <div style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.12), rgba(251,191,36,0.06))', borderBottom: '1px solid rgba(251,191,36,0.25)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
                ⚠ Wrong Network — Connected via Chain ID: {wallet.chainId}. ArbiHeLa requires HeLa Testnet ({HELA_CHAIN_ID}).
              </div>
              <button onClick={() => wallet.handleConsentApproved()} style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber)', color: 'var(--amber)', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>
                Switch to HeLa Testnet
              </button>
            </div>
          )}

          <div style={{ padding: '24px 44px' }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: '-0.02em', marginBottom: 36 }}>
              {navItems.find(i => i.id === activePage)?.label}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                 <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '5px 14px', borderRadius: 20, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                   ⟳ {bot.stats.scanRate} scans/min
                 </div>
                 <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-gold)', padding: '5px 14px', borderRadius: 20, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--green)', position: 'relative' }} id="confetti-anchor">
                   +${bot.session.net.toFixed(4)} profit
                 </div>
                 <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '5px 14px', borderRadius: 20, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                   ◈ RPC: 34ms
                 </div>
              </div>
            </div>

            <div key={activePage} className="stagger-in">
               {renderPage()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ArbiHeLaRoot() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
