type FormTextareaProps = { label: string; value: string; placeholder?: string; error?: string; onChange: (value: string) => void };
export default function FormTextarea({ label, value, placeholder, error, onChange }: FormTextareaProps) {
  return <div><label className="form-control-label">{label}</label><textarea className="form-control" value={value} placeholder={placeholder} rows={5} onChange={(e) => onChange(e.target.value)} />{error && <p className="form-error">{error}</p>}</div>;
}
