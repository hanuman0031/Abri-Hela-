import asyncio
import os
import time
import json
import random

def load_dotenv():
    # Mock load_dotenv if not available
    pass

try:
    from dotenv import load_dotenv as real_load_dotenv
    load_dotenv = real_load_dotenv
except ImportError:
    print("WARNING: python-dotenv not found. Using environment variables directly.")

try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False
    print("WARNING: Web3 not found. Running in MOCK mode for simulation.")

load_dotenv()

HELA_API_KEY = os.getenv("HELA_API_KEY")
RPC_URL = os.getenv("HELA_RPC_URL", "https://testnet-rpc.helachain.com")

if HAS_WEB3:
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
else:
    # Mock Web3 for simulation
    class MockEth:
        def __init__(self):
            self.block_number = 1234567
            self.account = self
        def from_key(self, key):
            class MockAccount:
                def __init__(self, key):
                    self.address = "0x" + "1"*40
            return MockAccount(key)
    class MockWeb3:
        def __init__(self):
            self.eth = MockEth()
    w3 = MockWeb3()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ACCOUNT = w3.eth.account.from_key(PRIVATE_KEY) if PRIVATE_KEY and len(PRIVATE_KEY) == 66 else None

EX_ADDR = os.getenv("EXECUTOR_ADDRESS", "0xAbC123400000000000000000000000000000Ef23")
MIN_PROFIT = float(os.getenv("MIN_PROFIT_HLUSD", "0.05"))

# State file for Next.js
STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public", "bot_state.json")

# State
logs = []
trades = []
stats = {"scans": 0, "scanRate": 0, "uptime": 0}
prices = [
    {"pair": 'USDC/HELA', "dexA": 1.0423, "dexB": 1.0451, "status": 'NO SPREAD', "spread": 0, "history": [1.0423]*100},
    {"pair": 'HLUSD/USDC', "dexA": 0.9998, "dexB": 1.0001, "status": 'NO SPREAD', "spread": 0, "history": [0.9998]*100},
    {"pair": 'ETH/HELA', "dexA": 3450.21, "dexB": 3450.21, "status": 'NO SPREAD', "spread": 0, "history": [3450.21]*100},
    {"pair": 'BTC/HELA', "dexA": 64120.50, "dexB": 64140.00, "status": 'NO SPREAD', "spread": 0, "history": [64120.50]*100},
    {"pair": 'USDT/USDC', "dexA": 1.0001, "dexB": 0.9999, "status": 'NO SPREAD', "spread": 0, "history": [1.0001]*100}
]

start_time = time.time()
scan_times = []
log_id = 1
is_running = True

def add_log(status, msg, pair="", spread=0.0):
    global log_id
    t_obj = {"id": log_id, "ts": int(time.time()*1000), "status": status, "msg": msg, "pair": pair, "spread": spread}
    logs.insert(0, t_obj)
    if len(logs) > 100: logs.pop()
    log_id += 1

def add_trade(tx_obj):
    trades.insert(0, tx_obj)
    if len(trades) > 500: trades.pop()

def write_state():
    state = {
        "isRunning": is_running,
        "logs": logs,
        "trades": trades,
        "stats": stats,
        "prices": prices
    }
    # Ensure dir exists
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

async def check_arbitrage_opportunity():
    global scan_times
    now = time.time()
    scan_times.append(now)
    scan_times = [t for t in scan_times if t > now - 60]
    
    stats["scans"] += 1
    stats["scanRate"] = len(scan_times)
    stats["uptime"] = int(now - start_time)

    # Simulate prices
    for p in prices:
        current_price = float(p["dexA"])
        vol = current_price * 0.0008
        nA = current_price + ((random.random() - 0.5) * vol * 2)
        nB = float(p["dexB"]) + ((random.random() - 0.5) * vol * 2)
        spr = ((nB - nA) / nA) * 100
        p["dexA"] = nA
        p["dexB"] = nB
        p["spread"] = spr
        history = list(p["history"])
        history.pop(0)
        history.append(nA)
        p["history"] = history
        if abs(spr) > 0.14: p["status"] = "ARBITRAGEABLE"
        else: p["status"] = "NO SPREAD"

    r_p = random.choice(prices)
    roll = random.random()

    if roll <= 0.54:
        add_log("SCAN", "Spread below threshold | ✗ SKIPPED", r_p["pair"], r_p["spread"])
    elif roll <= 0.77:
        add_log("MARGINAL", "Gas threshold not met | ⚠ MARGINAL SPREAD", r_p["pair"], r_p["spread"])
    else:
        gas = random.uniform(0.000018, 0.000048)
        gross = random.uniform(0.04, 0.19)
        net = gross - gas
        
        # In a real environment we would execute via Web3 here
        # Since this is a testnet demo without actual DEX liquidity, we simulate the execution state
        tx_hash = "0x" + "".join([random.choice("0123456789abcdef") for _ in range(64)])
        
        base_tx = {
            "id": log_id, "ts": int(time.time()*1000), "pair": r_p["pair"], 
            "pA": r_p["dexA"], "pB": r_p["dexB"], "spread": r_p["spread"], 
            "gross": gross, "gas": gas, "net": net, "hash": tx_hash
        }
        
        add_log("PENDING", f"TX: {tx_hash[:10]}... | Leg 1 & 2 dispatched", r_p["pair"])
        
        # Write state immediately so frontend shows pending
        write_state()
        await asyncio.sleep(0.6)
        
        if random.random() < 0.945:
            final_tx = {**base_tx, "status": "CONFIRMED", "msg": f"TX: {tx_hash[:10]}... | +${net:.4f} HLUSD | ✅ CONFIRMED"}
            add_log("CONFIRMED", final_tx["msg"], r_p["pair"])
            add_trade(final_tx)
        else:
            final_tx = {**base_tx, "status": "REVERTED", "msg": f"TX: {tx_hash[:10]}... | Slippage hit | 🔴 REVERTED"}
            add_log("REVERTED", final_tx["msg"], r_p["pair"])
            add_trade(final_tx)

    write_state()

async def engine_loop():
    print("====================================")
    print(" ArbiHeLa Live Backend Engine ")
    print(" Network: HeLa Testnet")
    print(f" Streaming state to: {STATE_FILE}")
    print("====================================\n")
    
    print(f"[{time.strftime('%H:%M:%S')}] Checking RPC connection...")
    try:
        block = w3.eth.block_number
        print(f"[{time.strftime('%H:%M:%S')}] Connected! Latest block: {block}")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] WARNING: RPC Connection failed: {e}")
        print("Continuing with mathematical simulation pipeline...")

    control_file = os.path.join(os.path.dirname(STATE_FILE), "control.json")

    while True:
        try:
            global is_running
            if os.path.exists(control_file):
                with open(control_file, "r") as f:
                    c_data = json.load(f)
                    is_running = c_data.get("isRunning", False)
            
            if is_running:
                await check_arbitrage_opportunity()
            else:
                write_state() # Keep heartbeat alive
        except Exception as e:
            print(f"Error in engine tick: {e}")
        await asyncio.sleep(0.75) 

if __name__ == "__main__":
    try:
        if not os.path.exists(os.path.dirname(STATE_FILE)):
            os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        asyncio.run(engine_loop())
    except KeyboardInterrupt:
        print("ArbiHeLa Bot shutting down.")
