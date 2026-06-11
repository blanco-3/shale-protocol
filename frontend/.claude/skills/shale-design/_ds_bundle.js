/* @ds-bundle: {"format":3,"namespace":"SHALEDesignSystem_1fdf95","components":[{"name":"StrataMark","sourcePath":"components/brand/StrataMark.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"StatTile","sourcePath":"components/core/StatTile.jsx"},{"name":"RiskMeter","sourcePath":"components/data/RiskMeter.jsx"},{"name":"StrataBar","sourcePath":"components/data/StrataBar.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"}],"sourceHashes":{"components/brand/StrataMark.jsx":"b16798868b83","components/core/Badge.jsx":"4d0807542da5","components/core/Button.jsx":"6c0e10644f3e","components/core/Card.jsx":"5b3a303d1467","components/core/StatTile.jsx":"0369c81bcab4","components/data/RiskMeter.jsx":"2315b5ab1b83","components/data/StrataBar.jsx":"1fd3bdc959ab","components/forms/Input.jsx":"3eabfa785d5f","components/forms/SegmentedControl.jsx":"1f54672ba473","ui_kits/shale-app/Analytics.jsx":"a22425c2384f","ui_kits/shale-app/Dashboard.jsx":"8828a92efc9f","ui_kits/shale-app/DepositFlow.jsx":"bc41f68ca89b","ui_kits/shale-app/Hero.jsx":"a28716fd4b9e","ui_kits/shale-app/NavBar.jsx":"374846a60ddb","ui_kits/shale-app/Safety.jsx":"ecf54dedd454","ui_kits/shale-app/Scenarios.jsx":"a62040c2a58a","ui_kits/shale-app/data.js":"43e4ecb53818"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SHALEDesignSystem_1fdf95 = window.SHALEDesignSystem_1fdf95 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/StrataMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The SHALE strata mark, drawn inline so it scales crisply and can sit
 * on any surface. Three diagonal rock layers on bedrock — the exact
 * geometry of the brand icon. Optionally pairs with the wordmark.
 */
function StrataMark({
  size = 40,
  wordmark = false,
  wordmarkStyle = "serif",
  color,
  style,
  ...rest
}) {
  const svg = /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 512 512",
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      display: "block",
      flex: "none"
    },
    "aria-label": "SHALE"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("clipPath", {
    id: "shaleClip"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "512",
    height: "512",
    rx: "72"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "512",
    height: "512",
    rx: "72",
    fill: "#1a1714"
  }), /*#__PURE__*/React.createElement("g", {
    clipPath: "url(#shaleClip)"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "-100,-100 612,-100 612,230 -100,60",
    fill: "#d9a96b"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-100,60 612,230 612,450 -100,280",
    fill: "#5c3318"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-100,280 612,450 612,612 -100,612",
    fill: "#a06828"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "-100",
    y1: "60",
    x2: "612",
    y2: "230",
    stroke: "#1a1714",
    strokeWidth: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "-100",
    y1: "280",
    x2: "612",
    y2: "450",
    stroke: "#1a1714",
    strokeWidth: "22"
  })));
  if (!wordmark) return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      ...style
    }
  }, rest), svg);
  const isCaps = wordmarkStyle === "caps";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: `${size * 0.32}px`,
      ...style
    }
  }, rest), svg, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: isCaps ? "var(--font-sans)" : "var(--font-serif)",
      fontWeight: isCaps ? 800 : 700,
      fontSize: `${size * (isCaps ? 0.62 : 0.92)}px`,
      letterSpacing: isCaps ? "0.22em" : "-0.02em",
      textTransform: isCaps ? "uppercase" : "none",
      lineHeight: 1,
      color: color || "var(--rock-600)"
    }
  }, isCaps ? "SHALE" : "shale"));
}
Object.assign(__ds_scope, { StrataMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/StrataMark.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: "var(--surface-sunken)",
    fg: "var(--text-muted)",
    bd: "var(--border)"
  },
  ink: {
    bg: "var(--rock-900)",
    fg: "var(--sand-50)",
    bd: "transparent"
  },
  core: {
    bg: "var(--core-100)",
    fg: "var(--core-700)",
    bd: "transparent"
  },
  seam: {
    bg: "var(--seam-100)",
    fg: "var(--seam-700)",
    bd: "transparent"
  },
  apex: {
    bg: "var(--apex-100)",
    fg: "var(--apex-700)",
    bd: "transparent"
  },
  positive: {
    bg: "var(--positive-bg)",
    fg: "var(--positive)",
    bd: "transparent"
  },
  warning: {
    bg: "var(--warning-bg)",
    fg: "var(--warning)",
    bd: "transparent"
  },
  danger: {
    bg: "var(--danger-bg)",
    fg: "var(--danger)",
    bd: "transparent"
  }
};

/**
 * Small status / label pill. Optional leading dot.
 */
function Badge({
  children,
  tone = "neutral",
  dot = false,
  outline = false,
  mono = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontWeight: 600,
      fontSize: "11px",
      letterSpacing: mono ? "0.02em" : "0.06em",
      textTransform: mono ? "none" : "uppercase",
      lineHeight: 1,
      padding: "5px 10px",
      borderRadius: "var(--r-pill)",
      background: outline ? "transparent" : t.bg,
      color: t.fg,
      border: `1px solid ${outline ? t.fg : t.bd}`,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "var(--r-pill)",
      background: "currentColor",
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    fontSize: "12px",
    padding: "7px 13px",
    height: "32px",
    radius: "var(--r-sm)",
    gap: "6px"
  },
  md: {
    fontSize: "13px",
    padding: "9px 17px",
    height: "40px",
    radius: "var(--r-md)",
    gap: "8px"
  },
  lg: {
    fontSize: "15px",
    padding: "13px 24px",
    height: "50px",
    radius: "var(--r-md)",
    gap: "10px"
  }
};
const TONES = {
  default: "var(--rock-900)",
  core: "var(--core-600)",
  seam: "var(--seam-600)",
  apex: "var(--apex-600)",
  accent: "var(--accent-600)"
};

/**
 * SHALE primary action button. Square-ish, weighted, no bounce.
 * variant: solid (ink fill) · outline (hairline) · ghost (text)
 * tone: default · core · seam · apex · accent
 */
function Button({
  children,
  variant = "solid",
  tone = "default",
  size = "md",
  fullWidth = false,
  disabled = false,
  iconRight,
  iconLeft,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const c = TONES[tone] || TONES.default;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    fontSize: s.fontSize,
    letterSpacing: "0.01em",
    lineHeight: 1,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? "100%" : undefined,
    borderRadius: s.radius,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    transform: active && !disabled ? "translateY(1px)" : "none",
    whiteSpace: "nowrap",
    userSelect: "none"
  };
  let look;
  if (variant === "solid") {
    look = {
      background: hover && !disabled ? "var(--rock-800)" : c,
      color: "var(--sand-50)",
      border: "1.5px solid transparent",
      boxShadow: hover && !disabled ? "var(--shadow-md)" : "var(--shadow-xs)"
    };
    if (tone !== "default" && hover && !disabled) {
      look.background = c;
      look.filter = "brightness(1.08)";
    }
  } else if (variant === "outline") {
    look = {
      background: hover && !disabled ? c : "transparent",
      color: hover && !disabled ? "var(--sand-50)" : c,
      border: `1.5px solid ${c}`
    };
  } else {
    look = {
      background: hover && !disabled ? "var(--surface-sunken)" : "transparent",
      color: c,
      border: "1.5px solid transparent"
    };
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      ...base,
      ...look,
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SURFACES = {
  paper: {
    background: "var(--surface-card)",
    color: "var(--text-body)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)"
  },
  raised: {
    background: "var(--surface-raised)",
    color: "var(--text-body)",
    border: "1px solid var(--border-soft)",
    boxShadow: "var(--shadow-md)"
  },
  sunken: {
    background: "var(--surface-sunken)",
    color: "var(--text-body)",
    border: "1px solid var(--border-soft)",
    boxShadow: "none"
  },
  ink: {
    background: "var(--surface-ink)",
    color: "var(--text-inverse)",
    border: "1px solid var(--border-ink)",
    boxShadow: "var(--shadow-lg)"
  }
};
const ACCENTS = {
  core: "var(--core-500)",
  seam: "var(--seam-500)",
  apex: "var(--apex-500)",
  accent: "var(--accent-500)"
};
const PADS = {
  none: "0",
  sm: "16px",
  md: "22px",
  lg: "28px"
};

/**
 * Surface container. Optional sedimentary top-edge accent (a thin
 * strata band) keyed to a tier, and optional hover lift.
 */
function Card({
  children,
  surface = "paper",
  accent,
  pad = "md",
  strataEdge = false,
  interactive = false,
  style,
  ...rest
}) {
  const s = SURFACES[surface] || SURFACES.paper;
  const [hover, setHover] = React.useState(false);
  const accentColor = accent ? ACCENTS[accent] || accent : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      position: "relative",
      borderRadius: "var(--r-lg)",
      padding: PADS[pad] ?? PADS.md,
      overflow: "hidden",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      transform: hover ? "translateY(-3px)" : "none",
      boxShadow: hover ? "var(--shadow-lg)" : s.boxShadow,
      cursor: interactive ? "pointer" : "default",
      ...s,
      ...style
    }
  }, rest), accentColor && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: strataEdge ? "6px" : "3px",
      background: strataEdge ? `repeating-linear-gradient(118deg, ${accentColor} 0 10px, var(--rock-900) 10px 11px)` : accentColor
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Metric tile — eyebrow label, big mono value, optional sub & delta.
 * The workhorse of SHALE dashboards (TVL, APY, epoch, buffer).
 */
function StatTile({
  label,
  value,
  sub,
  delta,
  deltaTone = "positive",
  align = "left",
  style,
  ...rest
}) {
  const deltaColor = deltaTone === "positive" ? "var(--positive)" : deltaTone === "danger" ? "var(--danger)" : deltaTone === "warning" ? "var(--warning)" : "var(--text-muted)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--text-2xs)/1 var(--font-sans)",
      letterSpacing: "var(--ls-wider)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "var(--text-2xl)",
      lineHeight: 1,
      letterSpacing: "-0.02em",
      color: "var(--text-strong)",
      fontVariantNumeric: "tabular-nums"
    }
  }, value), (sub || delta) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "1px"
    }
  }, delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "var(--text-xs)",
      color: deltaColor
    }
  }, delta), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 var(--text-xs)/1.3 var(--font-sans)",
      color: "var(--text-faint)"
    }
  }, sub)));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data/RiskMeter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CONFIG = {
  1: {
    lit: 1,
    color: "var(--core-500)",
    label: "Low Risk"
  },
  2: {
    lit: 2,
    color: "var(--seam-500)",
    label: "Med Risk"
  },
  3: {
    lit: 3,
    color: "var(--apex-500)",
    label: "High Risk"
  }
};

/**
 * Three-dot risk indicator with label. Lit dots use the tier tone,
 * unlit dots fall back to a faint sand fill. Mirrors the live app's
 * CORE/SEAM/APEX risk dots.
 */
function RiskMeter({
  level = 1,
  showLabel = true,
  dotSize = 8,
  style,
  ...rest
}) {
  const c = CONFIG[level] || CONFIG[1];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "5px"
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: dotSize,
      height: dotSize,
      borderRadius: "var(--r-pill)",
      background: i < c.lit ? c.color : "var(--rock-100)",
      boxShadow: i < c.lit ? "none" : "inset 0 0 0 1px var(--border)"
    }
  }))), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--text-xs)/1 var(--font-sans)",
      color: c.color
    }
  }, c.label));
}
Object.assign(__ds_scope, { RiskMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/RiskMeter.jsx", error: String((e && e.message) || e) }); }

// components/data/StrataBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  core: "var(--core-500)",
  seam: "var(--seam-500)",
  apex: "var(--apex-500)",
  positive: "var(--positive)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  ink: "var(--rock-700)",
  accent: "var(--accent-500)"
};

/**
 * Horizontal meter — strategy allocation, APEX buffer gauge, TVL split.
 * Track is a sandstone well; the fill carries a faint strata texture.
 * Optional target marker (a bedrock tick) for actual-vs-target drift.
 */
function StrataBar({
  value = 0,
  max = 100,
  tone = "ink",
  target,
  height = 10,
  label,
  valueLabel,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const fill = TONE[tone] || tone;
  const targetPct = target != null ? Math.max(0, Math.min(100, target / max * 100)) : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...style
    }
  }, rest), (label || valueLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "7px"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--text-xs)/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, label), valueLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "12px",
      color: "var(--text-strong)",
      fontVariantNumeric: "tabular-nums"
    }
  }, valueLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: `${height}px`,
      width: "100%",
      background: "var(--surface-sunken)",
      borderRadius: "var(--r-pill)",
      boxShadow: "inset 0 1px 2px rgba(26,23,20,0.10)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: `${pct}%`,
      background: fill,
      backgroundImage: "repeating-linear-gradient(118deg, rgba(255,255,255,0.10) 0 6px, rgba(0,0,0,0.04) 6px 12px)",
      borderRadius: "var(--r-pill)",
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  }), targetPct != null && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      top: "-2px",
      bottom: "-2px",
      left: `${targetPct}%`,
      width: "2px",
      background: "var(--rock-900)",
      borderRadius: "1px"
    }
  })));
}
Object.assign(__ds_scope, { StrataBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StrataBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text / number input with a warm hairline that ignites to ink on focus.
 * Optional prefix/suffix adornments (e.g. "$", "USDC") and label row.
 */
function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  mono = true,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  id,
  style,
  inputStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--danger)" : focus ? "var(--rock-900)" : "var(--border)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      font: "var(--fw-semibold) var(--text-xs)/1 var(--font-sans)",
      letterSpacing: "0.02em",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-raised)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--r-md)",
      padding: "0 14px",
      height: "46px",
      transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      boxShadow: focus ? "0 0 0 4px rgba(26,23,20,0.06)" : "none",
      opacity: disabled ? 0.6 : 1
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "15px",
      color: "var(--text-muted)",
      marginRight: "8px"
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-strong)",
      fontVariantNumeric: "tabular-nums",
      ...inputStyle
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: "13px",
      color: "var(--text-faint)",
      marginLeft: "8px"
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 var(--text-xs)/1.4 var(--font-sans)",
      color: error ? "var(--danger)" : "var(--text-faint)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  core: "var(--core-600)",
  seam: "var(--seam-600)",
  apex: "var(--apex-600)",
  default: "var(--rock-900)"
};

/**
 * Segmented control — the SHALE tier selector. Each option is a
 * slab; the selected slab fills with ink (or its tier tone).
 * options: [{ value, label, sub, tone }]
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  style,
  ...rest
}) {
  const pad = size === "lg" ? "12px 14px" : size === "sm" ? "7px 10px" : "10px 12px";
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      gap: "8px",
      ...style
    }
  }, rest), options.map(opt => {
    const selected = opt.value === value;
    const tone = TONE[opt.tone] || TONE.default;
    return /*#__PURE__*/React.createElement("button", {
      key: opt.value,
      role: "tab",
      "aria-selected": selected,
      onClick: () => onChange && onChange(opt.value),
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        textAlign: "left",
        padding: pad,
        borderRadius: "var(--r-md)",
        cursor: "pointer",
        background: selected ? tone : "var(--surface-raised)",
        color: selected ? "var(--sand-50)" : "var(--text-body)",
        border: `1.5px solid ${selected ? tone : "var(--border)"}`,
        boxShadow: selected ? "var(--shadow-sm)" : "none",
        transition: "all var(--dur-fast) var(--ease-out)"
      },
      onMouseEnter: e => {
        if (!selected) e.currentTarget.style.borderColor = "var(--rock-400)";
      },
      onMouseLeave: e => {
        if (!selected) e.currentTarget.style.borderColor = "var(--border)";
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: size === "sm" ? "12px" : "14px",
        letterSpacing: "0.02em"
      }
    }, opt.label), opt.sub && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: "11px",
        fontWeight: 500,
        opacity: selected ? 0.8 : 0.65
      }
    }, opt.sub));
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/Analytics.jsx
try { (() => {
/* SHALE app — analytics surface */
const {
  Card,
  StatTile,
  Badge,
  StrataBar
} = window.SHALEDesignSystem_1fdf95;
function StrategyRow({
  s
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 0",
      borderBottom: "1px solid var(--border-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "9px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "9px",
      height: "9px",
      borderRadius: "var(--r-pill)",
      background: shaleToneVar(s.tone)
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-bold) 14px/1 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-faint)"
    }
  }, "\xB7 ", s.asset, " \xB7 Arbitrum")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "14px",
      color: "var(--positive)"
    }
  }, s.apy, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      color: "var(--core-300)"
    }
  }, "live"))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 12px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      margin: "0 0 12px 18px"
    }
  }, s.model), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "18px"
    }
  }, /*#__PURE__*/React.createElement(StrataBar, {
    value: s.actual,
    target: s.target,
    tone: s.tone,
    valueLabel: `${s.actual}% actual / ${s.target}% target`
  })));
}
function Analytics() {
  const p = window.SHALE_PROTOCOL;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "40px 0 60px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) 34px/1 var(--font-serif)",
      color: "var(--text-strong)",
      letterSpacing: "-0.02em",
      marginBottom: "8px"
    }
  }, "Analytics"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "Real-time protocol metrics \xB7 Arbitrum Sepolia")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Total TVL",
    value: p.tvl,
    sub: "principal + yield"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Blended yield",
    value: p.blended,
    sub: "weighted"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Accrued yield",
    value: "$41,208",
    delta: "+1.2%",
    sub: "epoch #" + p.epoch
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "APEX buffer",
    value: p.bufferPct + "%",
    deltaTone: "warning",
    sub: "first-loss cushion"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)",
      marginBottom: "18px"
    }
  }, "TVL Breakdown"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "14px"
    }
  }, /*#__PURE__*/React.createElement(StrataBar, {
    label: "CORE",
    tone: "core",
    value: p.split.core,
    valueLabel: p.split.core + "%"
  }), /*#__PURE__*/React.createElement(StrataBar, {
    label: "SEAM",
    tone: "seam",
    value: p.split.seam,
    valueLabel: p.split.seam + "%"
  }), /*#__PURE__*/React.createElement(StrataBar, {
    label: "APEX",
    tone: "apex",
    value: p.split.apex,
    valueLabel: p.split.apex + "%"
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)"
    }
  }, "APEX Buffer Health"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "CAUTION")), /*#__PURE__*/React.createElement(StrataBar, {
    value: p.bufferPct,
    tone: "warning",
    height: 14,
    valueLabel: p.bufferPct + "% of principal",
    style: {
      marginBottom: "10px"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 12px/1.55 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "APEX principal is the first-loss cushion for CORE and SEAM. Below 15% blocks new senior deposits; below 10% triggers caution."))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "6px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)"
    }
  }, "Live Strategy Farming"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--positive)"
    }
  }, "Blended ", p.blended)), /*#__PURE__*/React.createElement("div", null, window.SHALE_STRATEGIES.map(s => /*#__PURE__*/React.createElement(StrategyRow, {
    key: s.name,
    s: s
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 12px/1.5 var(--font-sans)",
      color: "var(--text-faint)",
      marginTop: "14px"
    }
  }, "The AI agent monitors allocation drift and rebalances when actual weight diverges from target beyond the configured threshold.")));
}
window.Analytics = Analytics;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/Analytics.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/Dashboard.jsx
try { (() => {
/* SHALE app — dashboard surfaces */
const {
  Card,
  StatTile,
  Badge,
  RiskMeter,
  StrataBar,
  Button
} = window.SHALEDesignSystem_1fdf95;
function TierCard({
  tier,
  onDeposit
}) {
  return /*#__PURE__*/React.createElement(Card, {
    accent: tier.tone,
    strataEdge: true,
    interactive: true,
    pad: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow"
  }, tier.label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 24px/1 var(--font-serif)",
      color: "var(--text-strong)",
      marginTop: "6px",
      letterSpacing: "0.02em"
    }
  }, tier.name)), /*#__PURE__*/React.createElement(RiskMeter, {
    level: tier.risk,
    showLabel: false
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "24px",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "5px"
    }
  }, "Target APY"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "21px",
      color: shaleToneVar(tier.tone),
      letterSpacing: "-0.01em"
    }
  }, tier.apy)), tier.lev && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "5px"
    }
  }, "Leverage"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "21px",
      color: "var(--text-strong)"
    }
  }, tier.lev))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 13px/1.6 var(--font-sans)",
      color: "var(--text-muted)",
      flex: 1,
      marginBottom: "16px"
    }
  }, tier.blurb), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "14px",
      borderTop: "1px solid var(--border-soft)"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: tier.tone
  }, tier.loss), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    tone: tier.tone,
    onClick: () => onDeposit(tier.id)
  }, "Deposit \u2192")));
}
function LossCascade() {
  const steps = [{
    tone: "apex",
    name: "① APEX",
    note: "First-loss",
    sub: "High APY · principal at risk"
  }, {
    tone: "seam",
    name: "② SEAM",
    note: "Second-loss",
    sub: "Mid APY · partial buffer"
  }, {
    tone: "core",
    name: "③ CORE",
    note: "Last-loss",
    sub: "Safe APY · protected"
  }];
  const bg = {
    apex: "var(--apex-50)",
    seam: "var(--seam-50)",
    core: "var(--core-50)"
  };
  return /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "4px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 18px/1 var(--font-serif)",
      color: "var(--text-strong)"
    }
  }, "Risk\u2013Yield Tradeoff"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-faint)"
    }
  }, "loss absorption order")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 13px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "18px"
    }
  }, "Who absorbs the hit first if a strategy underperforms."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "stretch",
      gap: "8px"
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: bg[s.tone],
      borderRadius: "var(--r-md)",
      padding: "16px 14px",
      textAlign: "center",
      border: `1px solid ${shaleToneVar(s.tone)}22`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 15px/1 var(--font-sans)",
      color: shaleToneVar(s.tone),
      letterSpacing: "0.02em"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 12px/1 var(--font-sans)",
      color: shaleToneVar(s.tone),
      marginTop: "8px",
      opacity: 0.85
    }
  }, s.note), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1.4 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: "8px"
    }
  }, s.sub)), i < 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      color: "var(--text-faint)",
      fontSize: "16px"
    }
  }, "\u25B6")))));
}
function AgentPanel({
  accepted,
  onAccept
}) {
  const a = window.SHALE_PROTOCOL.agent;
  return /*#__PURE__*/React.createElement(Card, {
    surface: "ink",
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "8px",
      height: "8px",
      borderRadius: "var(--r-pill)",
      background: "var(--core-300)",
      boxShadow: "0 0 0 4px rgba(149,169,109,0.18)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 14px/1 var(--font-sans)",
      color: "var(--sand-50)"
    }
  }, "AI Agent \u2014 Proposal #", a.id)), /*#__PURE__*/React.createElement(Badge, {
    tone: accepted ? "positive" : "warning"
  }, accepted ? "EXECUTED" : "PENDING")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "32px",
      marginBottom: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      color: "var(--text-on-ink-muted)"
    }
  }, "New CORE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "15px",
      color: "var(--rock-150)",
      marginTop: "5px"
    }
  }, a.core)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      color: "var(--text-on-ink-muted)"
    }
  }, "New SEAM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "15px",
      color: "var(--rock-150)",
      marginTop: "5px"
    }
  }, a.seam))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 13px/1.6 var(--font-sans)",
      color: "var(--text-on-ink-muted)",
      marginBottom: "18px",
      maxWidth: "640px"
    }
  }, a.reason), accepted ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 13px/1 var(--font-sans)",
      color: "var(--core-300)"
    }
  }, "\u2713 Proposal executed on-chain.") : /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    tone: "accent",
    onClick: onAccept
  }, "Accept proposal \u2192"));
}
function Dashboard({
  onNavigate,
  agentAccepted,
  onAcceptAgent
}) {
  const p = window.SHALE_PROTOCOL;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      paddingBottom: "48px"
    }
  }, /*#__PURE__*/React.createElement(window.Hero, {
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5,1fr)",
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Total TVL",
    value: p.tvl,
    delta: "+7.34%",
    sub: "principal + yield"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Blended APY",
    value: p.blended,
    sub: "weighted strategies"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "APEX Buffer",
    value: p.bufferPct + "%",
    deltaTone: "warning",
    sub: "of principal"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Epoch",
    value: "#" + p.epoch,
    sub: "settled"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Strategies",
    value: "3",
    sub: "Aave \xB7 Camelot \xB7 Morpho"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "16px"
    }
  }, window.SHALE_TIERS.map(t => /*#__PURE__*/React.createElement(TierCard, {
    key: t.id,
    tier: t,
    onDeposit: id => onNavigate("Deposit", id)
  }))), /*#__PURE__*/React.createElement(LossCascade, null), /*#__PURE__*/React.createElement(AgentPanel, {
    accepted: agentAccepted,
    onAccept: onAcceptAgent
  }));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/DepositFlow.jsx
try { (() => {
/* SHALE app — deposit flow */
const {
  Card,
  Button,
  Input,
  SegmentedControl,
  Badge,
  RiskMeter
} = window.SHALEDesignSystem_1fdf95;
function DepositFlow({
  initialTier
}) {
  const tiers = window.SHALE_TIERS;
  const [tier, setTier] = React.useState(initialTier || "apex");
  const [amount, setAmount] = React.useState("1000.00");
  const [stage, setStage] = React.useState("idle"); // idle → approving → done
  const [balance, setBalance] = React.useState(1000);
  const active = tiers.find(t => t.id === tier);
  function deposit() {
    setStage("approving");
    setTimeout(() => setStage("done"), 1400);
  }
  function faucet() {
    setBalance(b => b + 1000);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "520px",
      margin: "0 auto",
      padding: "40px 0 60px"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) 34px/1 var(--font-serif)",
      color: "var(--text-strong)",
      letterSpacing: "-0.02em",
      marginBottom: "8px"
    }
  }, "Deposit"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "26px"
    }
  }, "Choose a tier, then deposit USDC. Yield settles every epoch via waterfall."), stage === "done" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    surface: "paper",
    accent: "core",
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 14px/1 var(--font-sans)",
      color: "var(--positive)"
    }
  }, "\u2713 Deposit confirmed"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 12px/1.4 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: "6px"
    }
  }, "$", amount, " \u2192 ", active.name, " \xB7 shl", active.name, " minted")), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    mono: true
  }, "0x9f2c\u202641be")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "10px"
    }
  }, "Select tier"), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: tier,
    onChange: setTier,
    size: "lg",
    options: tiers.map(t => ({
      value: t.id,
      label: t.name,
      sub: t.label,
      tone: t.tone
    }))
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      marginBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-bold) 17px/1 var(--font-serif)",
      color: "var(--text-strong)"
    }
  }, active.name), /*#__PURE__*/React.createElement(RiskMeter, {
    level: active.risk
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "16px",
      color: shaleToneVar(active.tone)
    }
  }, active.apy)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 12px/1.55 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "18px"
    }
  }, active.blurb), /*#__PURE__*/React.createElement(Input, {
    label: "Amount",
    prefix: "$",
    suffix: "USDC",
    type: "number",
    value: amount,
    onChange: e => setAmount(e.target.value),
    style: {
      marginBottom: "12px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      marginBottom: "6px"
    }
  }, [25, 50, 75].map(p => /*#__PURE__*/React.createElement(Button, {
    key: p,
    size: "sm",
    variant: "outline",
    tone: "default",
    onClick: () => setAmount((balance * p / 100).toFixed(2)),
    style: {
      flex: 1
    }
  }, p, "%")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    onClick: () => setAmount(balance.toFixed(2)),
    style: {
      flex: 1
    }
  }, "MAX")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "8px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-faint)"
    }
  }, "Balance: ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text-body)"
    }
  }, "$", balance.toFixed(2))), /*#__PURE__*/React.createElement("button", {
    onClick: faucet,
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      font: "var(--fw-medium) 12px/1 var(--font-sans)",
      color: "var(--accent-600)",
      textDecoration: "underline"
    }
  }, "Get 1,000 test USDC"))), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    size: "lg",
    tone: active.tone,
    disabled: stage === "approving",
    onClick: deposit
  }, stage === "approving" ? "Approving & depositing…" : `Deposit to ${active.name} →`), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "18px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    surface: "sunken",
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "10px"
    }
  }, "Important"), ["Deposits are deployed to the yield strategy immediately.", "Yield distributes at the end of each epoch via waterfall.", "APEX bears first loss if yield falls short of CORE/SEAM targets."].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      gap: "8px",
      font: "400 12px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "6px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: shaleToneVar(active.tone)
    }
  }, "\u2022"), t)))));
}
window.DepositFlow = DepositFlow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/DepositFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/Hero.jsx
try { (() => {
/* SHALE app — dashboard hero with the sedimentary strata illustration */
const {
  Button,
  Badge
} = window.SHALEDesignSystem_1fdf95;

/* The signature illustration: a rock cross-section. Three diagonal
   strata (APEX/SEAM/CORE) with a drilled "core sample" column showing
   capital descending through the tranches. Built from the brand motif. */
function StrataCrossSection() {
  const bands = [{
    tone: "var(--apex-500)",
    line: "#7a3318",
    name: "APEX",
    meta: "first-loss · 10.2%+",
    fg: "#fbe7dd"
  }, {
    tone: "var(--seam-500)",
    line: "#7a521a",
    name: "SEAM",
    meta: "second-loss · 5–7%",
    fg: "#fdf2db"
  }, {
    tone: "var(--core-500)",
    line: "#3a4a26",
    name: "CORE",
    meta: "last-loss · 2.5–3.5%",
    fg: "#eef2e2"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      borderRadius: "var(--r-2xl)",
      overflow: "hidden",
      boxShadow: "var(--shadow-xl)",
      border: "1px solid var(--rock-700)",
      aspectRatio: "1 / 1",
      background: "var(--rock-900)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, bands.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: b.name,
    style: {
      flex: 1,
      position: "relative",
      background: b.tone,
      borderBottom: i < 2 ? `3px solid ${b.line}` : "none",
      transform: "skewY(-7deg) scale(1.18)",
      transformOrigin: "left center",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      transform: "skewY(7deg)",
      paddingLeft: "32px",
      opacity: 0,
      animation: `shaleRise var(--dur-slow) var(--ease-out) ${0.15 + i * 0.12}s forwards`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 700,
      fontSize: "26px",
      color: b.fg,
      letterSpacing: "0.04em",
      lineHeight: 1
    }
  }, b.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      color: b.fg,
      opacity: 0.78,
      marginTop: "5px"
    }
  }, b.meta))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: "20%",
      width: "16%",
      borderLeft: "1.5px dashed rgba(253,250,243,0.45)",
      borderRight: "1.5px dashed rgba(253,250,243,0.45)",
      background: "rgba(26,23,20,0.16)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: "calc(20% + 8% - 22px)",
      width: "44px",
      height: "44px",
      borderRadius: "var(--r-pill)",
      background: "var(--sand-50)",
      boxShadow: "var(--shadow-lg), inset 0 0 0 2px var(--rock-200)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: "15px",
      color: "var(--rock-700)",
      animation: "shaleDrill 4.2s var(--ease-in-out) infinite"
    }
  }, "$"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "16px",
      left: "16px"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ink"
  }, "Core sample \xB7 live")));
}
function Hero({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.15fr 0.85fr",
      gap: "48px",
      alignItems: "center",
      padding: "44px 0 36px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "22px",
      display: "flex",
      gap: "8px"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    dot: true
  }, "AI-managed"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Arbitrum \xB7 CDO waterfall")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) 58px/0.98 var(--font-serif)",
      letterSpacing: "-0.03em",
      color: "var(--text-strong)",
      marginBottom: "20px"
    }
  }, "Yield, ", /*#__PURE__*/React.createElement("em", {
    style: {
      fontStyle: "italic",
      fontWeight: 600,
      color: "var(--rock-500)"
    }
  }, "stratified.")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 17px/1.6 var(--font-sans)",
      color: "var(--text-body)",
      maxWidth: "440px",
      marginBottom: "30px"
    }
  }, "Deposit USDC into one of three risk tiers. An on-chain AI agent rebalances across DeFi strategies every epoch and distributes yield through a sedimentary waterfall \u2014 CORE first, APEX last, losses absorbed top-down."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    tone: "apex",
    iconRight: "\u2192",
    onClick: () => onNavigate("Deposit")
  }, "Start Earning"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "outline",
    onClick: () => onNavigate("Analytics")
  }, "View Analytics"))), /*#__PURE__*/React.createElement(StrataCrossSection, null));
}
window.Hero = Hero;
window.StrataCrossSection = StrataCrossSection;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/NavBar.jsx
try { (() => {
/* SHALE app — top navigation bar */
const {
  StrataMark,
  Button,
  Badge
} = window.SHALEDesignSystem_1fdf95;
function NavBar({
  active,
  onNavigate,
  connected,
  onConnect
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "var(--nav-h)",
      padding: "0 28px",
      background: "rgba(249,244,234,0.86)",
      backdropFilter: "blur(14px)",
      borderBottom: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      cursor: "pointer",
      display: "flex"
    },
    onClick: () => onNavigate("Dashboard")
  }, /*#__PURE__*/React.createElement(StrataMark, {
    size: 32,
    wordmark: true,
    wordmarkStyle: "caps",
    color: "var(--rock-700)"
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "4px"
    }
  }, window.SHALE_NAV.map(item => {
    const on = item === active;
    return /*#__PURE__*/React.createElement("button", {
      key: item,
      onClick: () => onNavigate(item),
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: "13px",
        color: on ? "var(--text-strong)" : "var(--text-muted)",
        background: on ? "var(--surface-raised)" : "transparent",
        border: on ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: on ? "var(--shadow-xs)" : "none",
        padding: "8px 14px",
        borderRadius: "var(--r-pill)",
        cursor: "pointer",
        transition: "all var(--dur-fast) var(--ease-out)"
      }
    }, item);
  })), connected ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "positive",
    dot: true
  }, "Arbitrum"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-body)",
      padding: "8px 12px",
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-pill)",
      whiteSpace: "nowrap"
    }
  }, "0x22a9\u2026b71A")) : /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onConnect
  }, "Connect Wallet"));
}
window.NavBar = NavBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/NavBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/Safety.jsx
try { (() => {
/* SHALE app — Safety Monitor */
const {
  Card,
  StatTile,
  Badge,
  StrataBar
} = window.SHALEDesignSystem_1fdf95;
function Safety() {
  const s = window.SHALE_SAFETY;
  // current level from ratio (≥20 HEALTHY, ≥15 CAUTION, ≥10 WARNING, ≥5 DANGER, else CRITICAL)
  const r = s.apexRatioPct;
  const current = r >= 20 ? "HEALTHY" : r >= 15 ? "CAUTION" : r >= 10 ? "WARNING" : r >= 5 ? "DANGER" : "CRITICAL";
  const cfg = s.levels.find(l => l.level === current);
  const toneVar = {
    positive: "var(--positive)",
    seam: "var(--seam-600)",
    warning: "var(--warning)",
    danger: "var(--danger)"
  }[cfg.tone];
  const toneBg = {
    positive: "var(--positive-bg)",
    seam: "var(--seam-50)",
    warning: "var(--warning-bg)",
    danger: "var(--danger-bg)"
  }[cfg.tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "40px 0 60px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) 34px/1 var(--font-serif)",
      color: "var(--text-strong)",
      letterSpacing: "-0.02em",
      marginBottom: "8px"
    }
  }, "Safety Monitor"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "Real-time protocol health and the APEX buffer system.")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-faint)"
    }
  }, "Auto-refreshes every 30s \xB7 updated just now")), /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      background: toneBg,
      border: `1px solid ${toneVar}33`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "8px"
    }
  }, "Current Safety Level"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 42px/1 var(--font-serif)",
      color: toneVar,
      letterSpacing: "-0.02em"
    }
  }, cfg.level.charAt(0) + cfg.level.slice(1).toLowerCase()), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.5 var(--font-sans)",
      color: "var(--text-body)",
      marginTop: "8px",
      maxWidth: "420px"
    }
  }, "Protocol operating normally with an adequate first-loss buffer.")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "8px"
    }
  }, "APEX Buffer Ratio"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "42px",
      color: toneVar,
      letterSpacing: "-0.02em"
    }
  }, r.toFixed(2), "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-faint)",
      marginTop: "6px"
    }
  }, "Gate threshold: ", s.gateThresholdPct.toFixed(1), "%"))), /*#__PURE__*/React.createElement(StrataBar, {
    value: Math.min(r, 100),
    tone: cfg.tone === "seam" ? "seam" : cfg.tone,
    height: 10
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "7px"
    }
  }, ["0%", "5%", "10%", "20%", "100%"].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      font: "400 11px/1 var(--font-mono)",
      color: "var(--text-faint)"
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "CORE APY Target",
    value: s.coreApyTarget,
    sub: "senior guaranteed"
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "md",
    style: {
      background: s.gateActive ? "var(--warning-bg)" : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "10px"
    }
  }, "CORE / SEAM Deposits"), /*#__PURE__*/React.createElement(Badge, {
    tone: s.gateActive ? "warning" : "positive",
    dot: true
  }, s.gateActive ? "Gated — deposit APEX first" : "Enabled")), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "10px"
    }
  }, "APEX Deposits"), /*#__PURE__*/React.createElement(Badge, {
    tone: "positive",
    dot: true
  }, "Always open"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 11px/1.4 var(--font-sans)",
      color: "var(--text-faint)",
      marginTop: "10px"
    }
  }, "Replenishes the first-loss buffer."))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)",
      marginBottom: "18px"
    }
  }, "Principal Breakdown"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "24px"
    }
  }, [{
    k: "CORE",
    v: s.principal.core,
    p: s.principal.corePct,
    tone: "core"
  }, {
    k: "SEAM",
    v: s.principal.seam,
    p: s.principal.seamPct,
    tone: "seam"
  }, {
    k: "APEX (buffer)",
    v: s.principal.apex,
    p: s.principal.apexPct,
    tone: "apex"
  }].map(row => /*#__PURE__*/React.createElement("div", {
    key: row.k
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "7px"
    }
  }, row.k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "20px",
      color: "var(--text-strong)",
      marginBottom: "10px"
    }
  }, row.v), /*#__PURE__*/React.createElement(StrataBar, {
    value: row.p,
    tone: row.tone,
    valueLabel: row.p + "%",
    height: 8
  }))))), /*#__PURE__*/React.createElement(Card, {
    pad: "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 22px",
      borderBottom: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)"
    }
  }, "Safety Level System")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["Level", "APEX Ratio", "CORE APY", "Status"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: "left",
      padding: "10px 22px",
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      borderBottom: "1px solid var(--border-soft)"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, s.levels.map(row => {
    const on = row.level === current;
    const rc = {
      positive: "var(--positive)",
      seam: "var(--seam-700)",
      warning: "var(--warning)",
      danger: "var(--danger)"
    }[row.tone];
    return /*#__PURE__*/React.createElement("tr", {
      key: row.level,
      style: {
        background: on ? "var(--surface-sunken)" : "transparent"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 22px",
        font: `${on ? 700 : 600} 13px/1 var(--font-sans)`,
        color: rc,
        borderBottom: "1px solid var(--border-soft)"
      }
    }, row.level, on && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "8px",
        color: "var(--text-muted)"
      }
    }, "\u2190")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 22px",
        font: "400 12px/1 var(--font-mono)",
        color: "var(--text-body)",
        borderBottom: "1px solid var(--border-soft)"
      }
    }, row.threshold), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 22px",
        font: "400 12px/1 var(--font-mono)",
        color: "var(--text-body)",
        borderBottom: "1px solid var(--border-soft)"
      }
    }, row.coreAPY), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 22px",
        font: "400 12px/1 var(--font-sans)",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border-soft)"
      }
    }, row.desc));
  })))));
}
window.Safety = Safety;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/Safety.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/Scenarios.jsx
try { (() => {
/* SHALE app — Tranche Scenarios (CDO waterfall simulator) */
const {
  Card,
  Badge,
  StrataBar,
  Button
} = window.SHALEDesignSystem_1fdf95;
function TierResult({
  name,
  ordinal,
  principal,
  yld,
  apy,
  loss,
  finalTvl,
  tone,
  apyTone
}) {
  const lossPct = principal > 0 ? loss / principal * 100 : 0;
  return /*#__PURE__*/React.createElement(Card, {
    accent: tone,
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "14px"
    }
  }, name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: shaleToneVar(tone)
    }
  }, ordinal)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-sans)",
      color: "var(--text-faint)",
      marginBottom: "5px"
    }
  }, "Effective APY"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      fontSize: "30px",
      color: apyTone,
      letterSpacing: "-0.02em"
    }
  }, window.shalePct(apy))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      font: "400 12px/1 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, "Starting TVL"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text-body)"
    }
  }, window.shaleFmt(principal))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, "Yield earned"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--positive)"
    }
  }, "+", window.shaleFmt(yld))), loss > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--danger)"
    }
  }, "Principal absorbed"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--danger)"
    }
  }, "\u2212", window.shaleFmt(loss), " (", lossPct.toFixed(1), "%)")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "1px solid var(--border-soft)",
      paddingTop: "9px",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-strong)"
    }
  }, "Final balance"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: loss > 0 ? "var(--danger)" : "var(--text-strong)"
    }
  }, window.shaleFmt(finalTvl + yld)))));
}
function Scenarios() {
  const S = window.SHALE_SIM;
  const [active, setActive] = React.useState("normal");
  const [isCustom, setIsCustom] = React.useState(false);
  const [customApy, setCustomApy] = React.useState(6);
  const [customLoss, setCustomLoss] = React.useState(0);
  const scenario = S.scenarios.find(s => s.id === active);
  const stratApy = isCustom ? customApy : scenario.apy;
  const lossUsd = isCustom ? customLoss : scenario.loss;
  const res = window.shaleSimulate(stratApy, lossUsd);
  const statusTone = {
    healthy: "positive",
    apex_deficit: "warning",
    seam_hit: "warning",
    core_hit: "danger"
  }[res.status];
  const statusBg = {
    healthy: "var(--positive-bg)",
    apex_deficit: "var(--warning-bg)",
    seam_hit: "var(--seam-50)",
    core_hit: "var(--danger-bg)"
  }[res.status];
  const apexApyTone = res.apexApy > res.seamApy ? "var(--apex-600)" : res.apexApy > 0 ? "var(--seam-600)" : "var(--text-faint)";
  const floor = ((S.CORE_TVL * S.CORE_TARGET_PCT / 100 + S.SEAM_TVL * S.SEAM_TARGET_PCT / 100) / S.TOTAL_TVL * 100).toFixed(2);
  const maxApy = Math.max(res.coreApy, res.seamApy, res.apexApy, 0.1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "40px 0 60px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) 34px/1 var(--font-serif)",
      color: "var(--text-strong)",
      letterSpacing: "-0.02em",
      marginBottom: "8px"
    }
  }, "Tranche Scenarios"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      maxWidth: "620px"
    }
  }, "How the CDO waterfall distributes yield and absorbs losses across different market conditions.")), /*#__PURE__*/React.createElement(Card, {
    surface: "sunken",
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shale-eyebrow",
    style: {
      marginBottom: "14px"
    }
  }, "Simulation Setup"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "18px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-sans)",
      color: "var(--text-faint)",
      marginBottom: "5px"
    }
  }, "Total TVL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "15px",
      color: "var(--text-strong)"
    }
  }, window.shaleFmt(S.TOTAL_TVL))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-sans)",
      color: "var(--core-600)",
      marginBottom: "5px"
    }
  }, "CORE \xB7 50%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "15px",
      color: "var(--text-strong)"
    }
  }, window.shaleFmt(S.CORE_TVL)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 10px/1.3 var(--font-mono)",
      color: "var(--text-faint)",
      marginTop: "3px"
    }
  }, S.CORE_TARGET_PCT, "% guaranteed")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-sans)",
      color: "var(--seam-600)",
      marginBottom: "5px"
    }
  }, "SEAM \xB7 27%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "15px",
      color: "var(--text-strong)"
    }
  }, window.shaleFmt(S.SEAM_TVL)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 10px/1.3 var(--font-mono)",
      color: "var(--text-faint)",
      marginTop: "3px"
    }
  }, S.SEAM_TARGET_PCT, "% guaranteed")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-sans)",
      color: "var(--apex-600)",
      marginBottom: "5px"
    }
  }, "APEX \xB7 23%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "15px",
      color: "var(--text-strong)"
    }
  }, window.shaleFmt(S.APEX_TVL)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 10px/1.3 var(--font-mono)",
      color: "var(--text-faint)",
      marginTop: "3px"
    }
  }, "first-loss buffer")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "10px"
    }
  }, S.scenarios.map(s => {
    const on = !isCustom && active === s.id;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      onClick: () => {
        setActive(s.id);
        setIsCustom(false);
      },
      style: {
        textAlign: "left",
        padding: "13px 15px",
        borderRadius: "var(--r-md)",
        cursor: "pointer",
        background: on ? "var(--rock-900)" : "var(--surface-raised)",
        border: `1.5px solid ${on ? "var(--rock-900)" : "var(--border)"}`,
        transition: "all var(--dur-fast) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-bold) 13px/1.2 var(--font-sans)",
        color: on ? "var(--sand-50)" : "var(--text-strong)"
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "400 11px/1 var(--font-mono)",
        color: on ? "var(--rock-200)" : "var(--text-faint)",
        marginTop: "5px"
      }
    }, s.tag));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsCustom(true),
    style: {
      textAlign: "left",
      padding: "13px 15px",
      borderRadius: "var(--r-md)",
      cursor: "pointer",
      background: isCustom ? "var(--rock-900)" : "transparent",
      border: `1.5px dashed ${isCustom ? "var(--rock-900)" : "var(--rock-300)"}`,
      transition: "all var(--dur-fast) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 13px/1.2 var(--font-sans)",
      color: isCustom ? "var(--sand-50)" : "var(--text-strong)"
    }
  }, "Custom"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 11px/1 var(--font-mono)",
      color: isCustom ? "var(--rock-200)" : "var(--text-faint)",
      marginTop: "5px"
    }
  }, "set your own"))), isCustom ? /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      border: "1.5px dashed var(--rock-300)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "28px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      font: "var(--fw-medium) 12px/1 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "12px"
    }
  }, "Strategy APY: ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, customApy, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: -25,
    max: 25,
    step: 0.5,
    value: customApy,
    onChange: e => setCustomApy(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: "var(--rock-700)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "6px",
      font: "400 11px/1 var(--font-mono)",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u221225%"), /*#__PURE__*/React.createElement("span", null, "0%"), /*#__PURE__*/React.createElement("span", null, "+25%"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      font: "var(--fw-medium) 12px/1 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: "12px"
    }
  }, "Capital loss: ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, window.shaleFmt(customLoss))), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 3000,
    step: 100,
    value: customLoss,
    onChange: e => setCustomLoss(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: "var(--apex-600)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "6px",
      font: "400 11px/1 var(--font-mono)",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "$0"), /*#__PURE__*/React.createElement("span", null, "$1,500 (APEX)"), /*#__PURE__*/React.createElement("span", null, "$3,000"))))) : /*#__PURE__*/React.createElement(Card, {
    surface: "sunken",
    pad: "md"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 13px/1.5 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, scenario.desc)), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "Strategy yield on ", window.shaleFmt(S.TOTAL_TVL), " TVL"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "12px",
      color: stratApy >= 0 ? "var(--positive)" : "var(--danger)"
    }
  }, stratApy >= 0 ? "+" : "", Math.round(S.TOTAL_TVL * stratApy / 100).toLocaleString(), " USDC/yr (", stratApy, "% APY)")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "12px",
      background: "var(--surface-sunken)",
      borderRadius: "var(--r-pill)",
      overflow: "hidden",
      boxShadow: "inset 0 1px 2px rgba(26,23,20,0.1)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      [stratApy >= 0 ? "left" : "right"]: 0,
      width: `${Math.min(Math.abs(stratApy) / 25 * 100, 100)}%`,
      background: stratApy >= 0 ? "var(--positive)" : "var(--danger)",
      borderRadius: "var(--r-pill)",
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "6px",
      font: "400 11px/1 var(--font-mono)",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u221225%"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, "CORE+SEAM floor: ", floor, "%"), /*#__PURE__*/React.createElement("span", null, "+25%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderRadius: "var(--r-md)",
      background: statusBg,
      border: `1px solid ${shaleToneVar(statusTone === "positive" ? "core" : statusTone === "danger" ? "apex" : "seam")}22`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fw-medium) 13px/1.5 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, res.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement(TierResult, {
    name: "CORE \u2014 Last-loss",
    ordinal: "\u2462",
    principal: S.CORE_TVL,
    yld: res.coreYield,
    apy: res.coreApy,
    loss: res.coreLoss,
    finalTvl: res.coreFinal,
    tone: "core",
    apyTone: "var(--positive)"
  }), /*#__PURE__*/React.createElement(TierResult, {
    name: "SEAM \u2014 Second-loss",
    ordinal: "\u2461",
    principal: S.SEAM_TVL,
    yld: res.seamYield,
    apy: res.seamApy,
    loss: res.seamLoss,
    finalTvl: res.seamFinal,
    tone: "seam",
    apyTone: "var(--seam-700)"
  }), /*#__PURE__*/React.createElement(TierResult, {
    name: "APEX \u2014 First-loss",
    ordinal: "\u2460",
    principal: S.APEX_TVL,
    yld: res.apexYield,
    apy: res.apexApy,
    loss: res.apexLoss,
    finalTvl: res.apexFinal,
    tone: "apex",
    apyTone: apexApyTone
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--fw-semibold) 16px/1 var(--font-serif)",
      color: "var(--text-strong)",
      marginBottom: "18px"
    }
  }, "APY Comparison"), [{
    label: "CORE",
    apy: res.coreApy,
    tone: "core"
  }, {
    label: "SEAM",
    apy: res.seamApy,
    tone: "seam"
  }, {
    label: "APEX",
    apy: res.apexApy,
    tone: "apex"
  }].map(row => /*#__PURE__*/React.createElement("div", {
    key: row.label,
    style: {
      marginBottom: "12px"
    }
  }, /*#__PURE__*/React.createElement(StrataBar, {
    label: row.label,
    valueLabel: window.shalePct(row.apy),
    value: Math.max(row.apy / maxApy * 100, 0),
    max: 100,
    tone: row.tone,
    height: 12
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 12px/1.5 var(--font-sans)",
      color: "var(--text-faint)",
      marginTop: "10px"
    }
  }, res.apexApy > res.seamApy ? `APEX earns ${(res.apexApy / Math.max(res.coreApy, 0.01)).toFixed(1)}× CORE — leverage at work.` : res.apexApy === 0 ? "APEX earns 0% — absorbing losses instead." : "APY reversal: low strategy yield means APEX earns less than CORE despite first-loss risk.")));
}
window.Scenarios = Scenarios;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/Scenarios.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shale-app/data.js
try { (() => {
/* ============================================================
   SHALE UI Kit — shared fixtures & formatters
   Fake but plausible protocol state for the click-through.
   Exposes everything on window for the Babel-scoped screens.
   ============================================================ */

const SHALE_TIERS = [{
  id: "core",
  name: "CORE",
  label: "Stable",
  risk: 1,
  tone: "core",
  apy: "2.50 – 3.50%",
  loss: "③ last-loss",
  lev: null,
  blurb: "Receives yield first, every epoch, regardless of strategy performance. Last in line for any capital loss — APEX and SEAM absorb losses before CORE is touched.",
  profile: "Capital preservation"
}, {
  id: "seam",
  name: "SEAM",
  label: "Balanced",
  risk: 2,
  tone: "seam",
  apy: "5.00 – 7.00%",
  loss: "② second-loss",
  lev: null,
  blurb: "Higher guaranteed APY than CORE. Absorbs losses only after the APEX buffer is fully depleted — a meaningful safety margin while earning more.",
  profile: "Balanced yield"
}, {
  id: "apex",
  name: "APEX",
  label: "Aggressive",
  risk: 3,
  tone: "apex",
  apy: "10.2%+",
  loss: "① first-loss",
  lev: "2.4×",
  blurb: "Captures all residual yield after CORE and SEAM are paid. First to absorb any strategy loss — but with leverage on the upside when strategies outperform.",
  profile: "Maximum yield"
}];
const SHALE_STRATEGIES = [{
  name: "Aave V3",
  asset: "USDC",
  apy: "5.72%",
  actual: 30,
  target: 30,
  tone: "apex",
  model: "Variable-rate supply · two-slope IR model on pool utilization."
}, {
  name: "Camelot V3",
  asset: "USDC/USDT",
  apy: "7.34%",
  actual: 48,
  target: 50,
  tone: "seam",
  model: "Concentrated-liquidity LP fees · vol/TVL × fee tier × 365."
}, {
  name: "Morpho Blue",
  asset: "USDC",
  apy: "3.41%",
  actual: 22,
  target: 20,
  tone: "core",
  model: "P2P lending · matched suppliers earn above Aave, blended with idle."
}];
const SHALE_PROTOCOL = {
  tvl: "$2,481,094",
  blended: "5.74%",
  epoch: 248,
  bufferPct: 18.4,
  split: {
    core: 46,
    seam: 35,
    apex: 19
  },
  agent: {
    id: 41,
    status: "PENDING",
    reason: "Blended APY trending down 38bps over 3 epochs (Camelot volume softening). Lowering CORE target to 2.50–3.25% and SEAM to 4.75–6.50% to keep the APEX residual positive and protect senior tranches.",
    core: "2.50 – 3.25%",
    seam: "4.75 – 6.50%"
  }
};
const SHALE_NAV = ["Dashboard", "Deposit", "Portfolio", "Analytics", "Safety", "Scenarios"];

/* ---- Safety monitor ---- */
const SHALE_SAFETY = {
  apexRatioPct: 18.4,
  gateThresholdPct: 15.0,
  coreApyTarget: "2.5 – 3.5%",
  gateActive: false,
  principal: {
    core: "$1,141,303",
    seam: "$868,383",
    apex: "$471,408",
    corePct: 46,
    seamPct: 35,
    apexPct: 19
  },
  levels: [{
    level: "HEALTHY",
    threshold: "\u2265 20%",
    coreAPY: "4 \u2013 6%",
    desc: "All deposits enabled",
    tone: "positive"
  }, {
    level: "CAUTION",
    threshold: "15 \u2013 20%",
    coreAPY: "4 \u2013 6%",
    desc: "All deposits enabled",
    tone: "seam"
  }, {
    level: "WARNING",
    threshold: "10 \u2013 15%",
    coreAPY: "4 \u2013 5%",
    desc: "Monitoring closely",
    tone: "warning"
  }, {
    level: "DANGER",
    threshold: "5 \u2013 10%",
    coreAPY: "3 \u2013 4%",
    desc: "CORE deposits restricted",
    tone: "danger"
  }, {
    level: "CRITICAL",
    threshold: "< 5%",
    coreAPY: "2 \u2013 3%",
    desc: "Emergency \u2014 all deposits paused",
    tone: "danger"
  }]
};

/* ---- Scenario simulator constants (mirror live vault) ---- */
const SHALE_SIM = {
  TOTAL_TVL: 750000,
  CORE_TVL: 375000,
  SEAM_TVL: 200000,
  APEX_TVL: 175000,
  CORE_TARGET_PCT: 2.5,
  SEAM_TARGET_PCT: 5.0,
  scenarios: [{
    id: "bull",
    label: "Bull Market",
    tag: "12% strategy",
    desc: "Strategy significantly outperforms. APEX captures amplified residual.",
    apy: 12,
    loss: 0
  }, {
    id: "normal",
    label: "Normal DeFi",
    tag: "6% strategy",
    desc: "Healthy DeFi conditions. All tiers paid, APEX earns a meaningful premium.",
    apy: 6,
    loss: 0
  }, {
    id: "breakeven",
    label: "Near Breakeven",
    tag: "3.2% strategy",
    desc: "Strategy just covers CORE+SEAM. APEX earns minimal yield \u2014 the APY-reversal zone.",
    apy: 3.2,
    loss: 0
  }, {
    id: "low",
    label: "Low Yield",
    tag: "1% strategy",
    desc: "Strategy can't cover SEAM. APEX receives zero yield and absorbs the shortfall from principal.",
    apy: 1,
    loss: 0
  }, {
    id: "small_loss",
    label: "Capital Loss",
    tag: "\u22125% strategy",
    desc: "Strategy loses principal. APEX absorbs the loss first. CORE and SEAM unaffected.",
    apy: -5,
    loss: 500
  }, {
    id: "large_loss",
    label: "APEX Depleted",
    tag: "\u221220% strategy",
    desc: "Loss exceeds the APEX buffer. SEAM begins absorbing the remainder. CORE still protected.",
    apy: -20,
    loss: 2100
  }]
};
function shaleSimulate(stratApy, capitalLoss) {
  const S = SHALE_SIM;
  const totalYield = S.TOTAL_TVL * stratApy / 100;
  const coreDue = S.CORE_TVL * S.CORE_TARGET_PCT / 100;
  const seamDue = S.SEAM_TVL * S.SEAM_TARGET_PCT / 100;
  let apexLoss = 0,
    seamLoss = 0,
    coreLoss = 0;
  let rem = Math.max(0, capitalLoss);
  const apexAbsorb = Math.min(rem, S.APEX_TVL);
  apexLoss = apexAbsorb;
  rem -= apexAbsorb;
  const seamAbsorb = Math.min(rem, S.SEAM_TVL);
  seamLoss = seamAbsorb;
  rem -= seamAbsorb;
  coreLoss = Math.min(rem, S.CORE_TVL);
  let avail = totalYield,
    coreYield = 0,
    seamYield = 0,
    apexYield = 0;
  if (avail >= coreDue) {
    coreYield = coreDue;
    avail -= coreDue;
  } else {
    const d = coreDue - avail;
    coreYield = coreDue;
    apexLoss += d;
    avail = 0;
  }
  if (avail >= seamDue) {
    seamYield = seamDue;
    avail -= seamDue;
  } else {
    const d = seamDue - avail;
    seamYield = Math.max(0, avail);
    const can = Math.max(0, S.APEX_TVL - apexLoss);
    const ab = Math.min(d, can);
    apexLoss += ab;
    const r2 = d - ab;
    if (r2 > 0) {
      seamLoss += r2;
      seamYield = seamDue - r2;
    } else {
      seamYield = seamDue;
    }
    avail = 0;
  }
  apexYield = Math.max(0, avail);
  const coreApy = S.CORE_TVL > 0 ? coreYield / S.CORE_TVL * 100 : 0;
  const seamApy = S.SEAM_TVL > 0 ? seamYield / S.SEAM_TVL * 100 : 0;
  const apexApy = S.APEX_TVL > 0 ? apexYield / S.APEX_TVL * 100 : 0;
  let status = "healthy",
    note = "All tiers fully paid. APEX earns the leveraged residual.";
  if (coreLoss > 0) {
    status = "core_hit";
    note = "APEX and SEAM depleted. CORE principal is absorbing losses \u2014 an extreme scenario.";
  } else if (seamLoss > 0) {
    status = "seam_hit";
    note = "APEX buffer depleted. SEAM principal is absorbing the remaining shortfall.";
  } else if (apexLoss > 0 && capitalLoss === 0) {
    status = "apex_deficit";
    note = "Yield too low to cover CORE+SEAM targets. APEX principal absorbs the deficit; CORE and SEAM are fully protected.";
  } else if (apexLoss > 0) {
    status = "apex_deficit";
    note = "Capital loss absorbed by APEX. CORE and SEAM principal unaffected.";
  }
  return {
    coreYield,
    seamYield,
    apexYield,
    coreApy,
    seamApy,
    apexApy,
    coreLoss,
    seamLoss,
    apexLoss,
    coreFinal: S.CORE_TVL - coreLoss,
    seamFinal: S.SEAM_TVL - seamLoss,
    apexFinal: Math.max(0, S.APEX_TVL - apexLoss),
    status,
    note
  };
}
function shaleFmt(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}
function shalePct(n) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
const SHALE_POSITIONS = [{
  tier: "CORE",
  tone: "core",
  shares: "12,000 shlCORE",
  value: "$12,184.40",
  yield: "+$184.40",
  apy: "3.07%"
}, {
  tier: "SEAM",
  tone: "seam",
  shares: "8,000 shlSEAM",
  value: "$8,402.10",
  yield: "+$402.10",
  apy: "6.21%"
}, {
  tier: "APEX",
  tone: "apex",
  shares: "5,000 shlAPEX",
  value: "$5,611.80",
  yield: "+$611.80",
  apy: "11.40%"
}];
function shaleToneVar(tone) {
  return {
    core: "var(--core-600)",
    seam: "var(--seam-600)",
    apex: "var(--apex-600)"
  }[tone] || "var(--rock-900)";
}
Object.assign(window, {
  SHALE_TIERS,
  SHALE_STRATEGIES,
  SHALE_PROTOCOL,
  SHALE_NAV,
  SHALE_POSITIONS,
  SHALE_SAFETY,
  SHALE_SIM,
  shaleSimulate,
  shaleFmt,
  shalePct,
  shaleToneVar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shale-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.StrataMark = __ds_scope.StrataMark;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.RiskMeter = __ds_scope.RiskMeter;

__ds_ns.StrataBar = __ds_scope.StrataBar;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

})();
