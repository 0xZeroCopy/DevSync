
import React from "react";

export default function DevSyncLogo({
  size = 42,
  showText = true
}) {
  return (
    <div className="devsync-brand">

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DevSync logo"
      >
        <defs>
          <linearGradient
            id="devsync-logo-gradient"
            x1="8"
            y1="4"
            x2="40"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#398DFF" />
            <stop offset="55%" stopColor="#168FCD" />
            <stop offset="100%" stopColor="#08B99A" />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="13"
          fill="url(#devsync-logo-gradient)"
        />

        <g
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 15.5L24 9L36 15.5L24 22L12 15.5Z" />
          <path d="M12 22L24 28.5L36 22" />
          <path d="M12 28.5L24 35L36 28.5" />
        </g>
      </svg>

      {showText && (
        <span className="devsync-brand-name">
          DevSync
        </span>
      )}

    </div>
  );
}
