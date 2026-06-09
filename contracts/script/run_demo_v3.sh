#!/bin/bash
# run_demo_v3.sh — SHALE Protocol V3 demo with SimStrategy market events.
#
# Narrative: AI agent reacts to real-world protocol dynamics
#   Epoch 1: Camelot high volume (21.9%) >> Aave (5.7%) >> Morpho (6.6%)
#            Agent weights heavily toward Camelot
#   Epoch 2: Camelot volume crashes to 3.65% — agent must rebalance
#            Aave utilization spikes to 80% (7%)
#   Epoch 3: Morpho matching rises to 90% (7.3%) — agent shifts to Morpho
#
# No manual addYield() needed — strategies mint yield automatically.
# Each epoch takes 2 minutes. Full demo ~8 minutes.

set -e

RPC="https://arb-sepolia.g.alchemy.com/v2/jQrzU79lUdexs3K1Q5A5F"
KEY="0xfd5cb64b9d08b76b2ae06a1a1d81360e3423c99eb09bb8f1ea139d3cc937a8cc"
ADMIN="0x22a90658cdCDbDf89841ca2d37EfC489dE9Bb71A"

USDC="0x91BD5E4E9fE9953051A815a6a9A8Fe92E9e7A8d7"
VAULT="0x3989a0E6450903f60Aa42A82fF1C9c44C24622DC"
ROUTER="0x27d0f024c1aE225aFA4366319a9F9F9e63B4610b"
AAVE_STRAT="0x29e312Ae6Fe409599D37E6DF3D742869E14BfdBE"
CAMELOT_STRAT="0x4BDe068D9DaDDB364Ff7f896AdA0Aa1433b7a8ef"
MORPHO_STRAT="0x7000eB5469D424b09Cd68AB3D9d634506E51FCEf"

send() {
  cast send "$@" --private-key $KEY --rpc-url $RPC --json 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('  tx:', d.get('transactionHash','?'))"
}

call() {
  cast call "$@" --rpc-url $RPC 2>/dev/null
}

bps_to_pct() {
  python3 -c "print(f'{$1/100:.2f}%')"
}

echo ""
echo "================================================="
echo "  SHALE Protocol V3 — Sim-Strategy Demo"
echo "  Aave V3 + Camelot V3 LP + Morpho Blue"
echo "  Vault:  $VAULT"
echo "  Epochs: 3 x 2 minutes | Trend: Dynamic"
echo "================================================="

# ── SETUP: Approve and deposit ───────────────────────────────────────────────
echo ""
echo "── SETUP: Approve vault ──"
send $USDC "approve(address,uint256)" $VAULT 500000000000000

echo ""
echo "── DEPOSITS (APEX first to satisfy buffer gate) ──"
echo "  30k USDC -> APEX (first-loss)"
send $VAULT "deposit(uint256,uint8)" 30000000000 2
echo "  100k USDC -> CORE (senior)"
send $VAULT "deposit(uint256,uint8)" 100000000000 0
echo "  50k USDC -> SEAM (mezzanine)"
send $VAULT "deposit(uint256,uint8)" 50000000000 1
echo "  TVL = 180k USDC | APEX buffer = 16.7% > 15% threshold OK"

# ── EPOCH 1: Normal market ────────────────────────────────────────────────────
echo ""
echo "================================================="
echo "  EPOCH 1: Initial market state"
echo "  Aave util=65% -> 5.7% | Camelot vol=120% -> 10.95% | Morpho match=70% -> 6.6%"
echo "  Agent will weight heavily toward Camelot (highest APY)"
echo "================================================="

echo "  Current APYs:"
AAVE_APY=$(call $AAVE_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimAave:    {int(sys.stdin.read().strip())/100:.2f}%')")
echo "$AAVE_APY"
CAMELOT_APY=$(call $CAMELOT_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimCamelot: {int(sys.stdin.read().strip())/100:.2f}%')")
echo "$CAMELOT_APY"
MORPHO_APY=$(call $MORPHO_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimMorpho:  {int(sys.stdin.read().strip())/100:.2f}%')")
echo "$MORPHO_APY"

echo "  Waiting 135s for epoch 1..."
sleep 135

echo "  Settling epoch 1..."
send $VAULT "settleEpoch()"
echo "  Epoch 1 settled. Check analytics page — agent run triggered."

# ── EPOCH 2: Camelot volume crash ─────────────────────────────────────────────
echo ""
echo "================================================="
echo "  EPOCH 2: MARKET EVENT — Camelot volume crash"
echo "  Camelot setVolumeRatio(2000) -> APY drops to 3.65%"
echo "  Aave setUtilization(8000) -> APY rises to 7.0%"
echo "  Agent should rebalance: reduce Camelot, increase Aave"
echo "================================================="

echo "  Updating market state..."
send $CAMELOT_STRAT "setVolumeRatio(uint256)" 2000   # volume crash: 3.65% APY
send $AAVE_STRAT    "setUtilization(uint256)" 8000   # demand spike: 7.0% APY

echo "  New APYs after market event:"
AAVE_APY=$(call $AAVE_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimAave:    {int(sys.stdin.read().strip())/100:.2f}%  [UP]')")
echo "$AAVE_APY"
CAMELOT_APY=$(call $CAMELOT_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimCamelot: {int(sys.stdin.read().strip())/100:.2f}%  [DOWN - crash]')")
echo "$CAMELOT_APY"

echo "  Waiting 135s for agent to detect and rebalance..."
sleep 135

echo "  Settling epoch 2..."
send $VAULT "settleEpoch()"
echo "  Epoch 2 settled. Check analytics for rebalancing event."

# ── EPOCH 3: Morpho matching spike ───────────────────────────────────────────
echo ""
echo "================================================="
echo "  EPOCH 3: MARKET EVENT — Morpho matching surge"
echo "  Morpho setRates(700, 1100, 9000) -> P2P blended ~8.1%"
echo "  Camelot recovery: setVolumeRatio(8000) -> APY 10.95%"
echo "  Aave stable: setUtilization(6500) -> APY 5.7%"
echo "  Agent should see: Camelot > Morpho > Aave, shift back"
echo "================================================="

echo "  Updating market state..."
send $MORPHO_STRAT  "setRates(uint256,uint256,uint256)" 700 1100 9000
send $CAMELOT_STRAT "setVolumeRatio(uint256)" 8000
send $AAVE_STRAT    "setUtilization(uint256)" 6500

echo "  New APYs:"
AAVE_APY=$(call $AAVE_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimAave:    {int(sys.stdin.read().strip())/100:.2f}%')")
echo "$AAVE_APY"
CAMELOT_APY=$(call $CAMELOT_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimCamelot: {int(sys.stdin.read().strip())/100:.2f}%  [recovered]')")
echo "$CAMELOT_APY"
MORPHO_APY=$(call $MORPHO_STRAT "apyBps()(uint256)" | python3 -c "import sys; print(f'  SimMorpho:  {int(sys.stdin.read().strip())/100:.2f}%  [UP - high match]')")
echo "$MORPHO_APY"

echo "  Waiting 135s for epoch 3..."
sleep 135

echo "  Settling epoch 3..."
send $VAULT "settleEpoch()"
echo "  Epoch 3 settled."

echo ""
echo "================================================="
echo "  3 EPOCHS COMPLETE"
echo "  Market events demonstrated:"
echo "  1. Normal market  -> Camelot-heavy allocation"
echo "  2. Volume crash   -> Agent rebalances to Aave"
echo "  3. Recovery       -> Agent rebalances back"
echo ""
echo "  Check analytics page for:"
echo "  - Protocol Market Mechanics panel (live gauges)"
echo "  - Rebalancing history (on-chain events)"
echo "  - Epoch history + yield distribution"
echo "================================================="
