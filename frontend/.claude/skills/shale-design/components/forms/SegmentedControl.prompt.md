Slab-style segmented control; the canonical tier selector (CORE/SEAM/APEX) and any 2–4 option toggle. Selected slab fills with ink or its tier tone.

```jsx
const [tier, setTier] = React.useState("core");
<SegmentedControl
  value={tier}
  onChange={setTier}
  options={[
    { value: "core", label: "CORE", sub: "Stable", tone: "core" },
    { value: "seam", label: "SEAM", sub: "Balanced", tone: "seam" },
    { value: "apex", label: "APEX", sub: "Aggressive", tone: "apex" },
  ]}
/>
```
