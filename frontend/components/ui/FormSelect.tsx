type Option = { label: string; value: string };
type FormSelectProps = { label: string; value: string; error?: string; options: Option[]; onChange: (value: string) => void };
export default function FormSelect({ label, value, error, options, onChange }: FormSelectProps) {
  return <div><label className="form-control-label">{label}</label><select className="form-control" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <p className="form-error">{error}</p>}</div>;
}
