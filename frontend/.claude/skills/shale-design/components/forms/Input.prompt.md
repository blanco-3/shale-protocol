Single-line text/number field; defaults to mono for amount entry. Hairline border ignites to bedrock on focus.

```jsx
<Input label="Amount" prefix="$" suffix="USDC" placeholder="0.00" type="number" />
<Input label="Recipient" mono={false} error="Invalid address" />
```

Supports `prefix`/`suffix` adornments, `label`, `hint`, and `error` (which recolors the border).
