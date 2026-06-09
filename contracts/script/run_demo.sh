#!/bin/bash
# run_demo.sh — Full SHALE Protocol demo: 3 epochs with a falling yield trend.
# Takes ~7 minutes (3 x 130s sleeps + tx time).
# Shows CDO waterfall, APEX buffer gate, and multi-epoch trend for LLM decision.

set -e

RPC="https://arb-sepolia.g.alchemy.com/v2/jQrzU79lUdexs3K1Q5A5F"
KEY="0xfd5cb64b9d08b76b2ae06a1a1d81360e3423c99eb09bb8f1ea139d3cc937a8cc"

USDC="0xb5C2B66c58444Cf8e1d45AB0C6C3F34caD0B9013"
VAULT="0x46464B91ee738168687A7bB0b770C6c4Db331D0D"
STRAT_A="0x079822F15bf88ecfc1e4B5E520F20286353210E2"  # Aave-like  4%
STRAT_B="0xE605fC8A6EdCa913D011276E2F6021898459DBC4"  # FixedYield 7%
STRAT_C="0xf607Cd2a74e1B4258Fd329C8B481D6DD53EDaf02"  # Camelot    9%

send() {
  cast send "$@" --private-key $KEY --rpc-url $RPC --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('  tx:', d.get('transactionHash','?'))"
}

echo ""
echo "════════════════════════════════════════════"
echo "  SHALE Protocol — Demo Run"
echo "  Vault:  $VAULT"
echo "  Epochs: 3 x 2 minutes | Trend: FALLING"
echo "════════════════════════════════════════════"

echo ""
echo "── SETUP: Mint extra USDC for yield injections ──"
send $USDC "mint(address,uint256)" 0x22a90658cdCDbDf89841ca2d37EfC489dE9Bb71A 1000000000000

echo ""
echo "── SETUP: Approve USDC (vault + strategies) ──"
send $USDC "approve(address,uint256)" $VAULT       500000000000000
send $USDC "approve(address,uint256)" $STRAT_A     200000000000
send $USDC "approve(address,uint256)" $STRAT_B     200000000000
send $USDC "approve(address,uint256)" $STRAT_C     200000000000

echo ""
echo "── DEPOSITS (APEX first → buffer gate satisfied) ──"
echo "  Depositing 30k USDC → APEX (first-loss buffer)..."
send $VAULT "deposit(uint256,uint8)" 30000000000 2

echo "  Depositing 100k USDC → CORE (senior)..."
send $VAULT "deposit(uint256,uint8)" 100000000000 0

echo "  Depositing 50k USDC → SEAM (mezzanine)..."
send $VAULT "deposit(uint256,uint8)" 50000000000 1

echo "  TVL = 180k USDC | APEX buffer = 16.7% > 15% ✓"

# ── EPOCH 1: Strong yield — implied ~9% APY ────────────────────────────────
echo ""
echo "── EPOCH 1: Injecting 310 USDC yield (~9% implied APY) ──"
send $STRAT_A "addYield(uint256)" 124000000   # 124 USDC (40% share)
send $STRAT_B "addYield(uint256)"  93000000   #  93 USDC (30% share)
send $STRAT_C "addYield(uint256)"  93000000   #  93 USDC (30% share)

echo "  Waiting 135s for epoch duration..."
sleep 135

echo "  Settling epoch 1..."
send $VAULT "settleEpoch()"
echo "  ✓ Epoch 1 settled"

# ── EPOCH 2: Moderate yield — implied ~6% APY ─────────────────────────────
echo ""
echo "── EPOCH 2: Injecting 200 USDC yield (~6% implied APY, FALLING) ──"
send $STRAT_A "addYield(uint256)" 80000000
send $STRAT_B "addYield(uint256)" 60000000
send $STRAT_C "addYield(uint256)" 60000000

echo "  Waiting 135s..."
sleep 135

echo "  Settling epoch 2..."
send $VAULT "settleEpoch()"
echo "  ✓ Epoch 2 settled"

# ── EPOCH 3: Weak yield — implied ~2.5% APY ───────────────────────────────
echo ""
echo "── EPOCH 3: Injecting 80 USDC yield (~2.5% implied APY, FALLING) ──"
send $STRAT_A "addYield(uint256)" 32000000
send $STRAT_B "addYield(uint256)" 24000000
send $STRAT_C "addYield(uint256)" 24000000

echo "  Waiting 135s..."
sleep 135

echo "  Settling epoch 3..."
send $VAULT "settleEpoch()"
echo "  ✓ Epoch 3 settled"

echo ""
echo "════════════════════════════════════════════"
echo "  3 EPOCHS COMPLETE — Trend: 9% → 6% → 2.5%"
echo "  Run agent to see LLM LOWER recommendation"
echo "════════════════════════════════════════════"
