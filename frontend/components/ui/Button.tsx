import type { ReactNode } from "react";
type ButtonProps = { children: ReactNode; type?: "button" | "submit" | "reset"; loading?: boolean; disabled?: boolean; onClick?: () => void };
export default function Button({ children, type = "button", loading = false, disabled = false, onClick }: ButtonProps) {
  return <button type={type} disabled={disabled || loading} onClick={onClick} className="primary-btn">{loading ? "Please wait..." : children}</button>;
}
