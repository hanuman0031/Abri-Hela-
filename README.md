# 🚀 ArbiHeLa: Risk-Free HFT on the HeLa Network

**ArbiHeLa** is a High-Frequency Trading (HFT) Quantitative Engine built specifically for the **HeLa Labs Network** during an intense 3-day hackathon.

It completely eliminates cross-DEX arbitrage trading risk by wrapping the entire arbitrage lifecycle into a single, atomic, deterministic smart contract execution. By building on HeLa and utilizing the stable-gas token (HLUSD), we leverage HeLa's unique **gas refund mechanism** for failed transactions to make failed arbitrage attempts completely costless.

## 🏗️ The 3-Pillar Architecture

ArbiHeLa is structurally divided into three production-grade components:

### 1. The Execution Layer (Solidity Smart Contract)
* **Location:** `contracts/ArbitrageExecutor.sol`
* The "Muscle" of the operation. The Python bot triggers this contract to perform the actual trade.
* **100% Risk-Free Guarantee:** Using an Atomic Swap architecture, the contract executes Leg 1 (Buy) and Leg 2 (Sell) within the exact same block. **Crucially, the contract checks its final token balance at the end of the execution.** If the net profit is less than expected, it systematically triggers a `require()` failure, reverting the entire transaction state so no capital is ever lost.

### 2. The Quant Engine (Python & Web3.py)
* **Location:** `bot/main.py`
* The "Brain" of the operation. It runs a blazing-fast, asynchronous (`asyncio`) polling loop against multiple DEX routers on the HeLa Testnet.
* It reads Live AMM pricing data concurrently. The millisecond it detects a profitable mathematical spread across decentralized exchanges, it builds, signs, and fires a raw transaction directly into the HeLa mempool.

### 3. The Command Center (Next.js & Tailwind)
* **Location:** `frontend/`
* The "Eyes" of the operation. A dark-themed, "Bloomberg-esque" Web3 Terminal Dashboard.
* It provides real-time, human-readable visualization of the bot's logging activity, current network status, and tracks cumulative algorithmic yield in HLUSD.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js & npm (for the frontend and Hardhat)
- Python 3.9+ & pip (for the bot engine)

### 1. The Smart Contract (Hardhat)
To compile and deploy the arbitrage execution contract:
```bash
npm install
npx hardhat compile

# Deploy to HeLa Testnet (ensure PRIVATE_KEY is set in .env)
npx hardhat ignition deploy ./ignition/modules/ArbitrageExecutor.js --network helaTestnet
```

### 2. The Quant Bot (Python)
To start the high-frequency trading polling loop:
```bash
cd bot
pip install -r requirements.txt

# Start the engine
python main.py
```

### 3. The Web3 Dashboard (Next.js)
To launch the glassmorphism quantitative terminal UI:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to view the live dashboard.

---

## 🦊 MetaMask Wallet Setup

If you are using Chrome Browser, the MetaMask extension can easily be installed from the [Chrome Web Store](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn). Once installed, it will appear in the top panel of your browser.

### 🌐 Network Setup

To add the HeLa Testnet to MetaMask:
1. Open MetaMask.
2. Go to **Settings** > **Networks** > **Add a Network** > **Add a Network Manually**.
3. Enter the following details:

| Setting | HeLa Testnet |
| :--- | :--- |
| **Network Name** | HeLa Testnet |
| **RPC URL** | `https://testnet-rpc.helachain.com` |
| **Chain ID** | `666888` |
| **Symbol** | `HLUSD` |
| **Block Explorer** | [HeLa Testnet Explorer](https://testnet-blockexplorer.helachain.com) |

### 🚰 Funding Your Wallet

To receive testnet tokens for gas fees and trading simulation:
1. Go to the [HeLa Testnet Faucet](https://testnet-faucet.helachain.com).
2. Enter your wallet address.
3. You will receive **10 HLUSD** every 24 hours.
