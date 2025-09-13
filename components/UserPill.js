import { UserPill } from "@privy-io/react-auth/ui";

export default function PrivyUserPill({ action, label, size = 32, className = "", style }) {
  // This component assumes it is rendered inside PrivyProvider
  return (
    <UserPill
      action={action}
      label={label}
      size={size}
      className={className}
      ui={{ background: "secondary" }}
      style={{ background: "#ffffff", color: "#000000", border: "1px solid #000000", ...(style || {}) }}
    />
  );
}
