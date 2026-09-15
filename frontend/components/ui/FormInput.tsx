type FormInputProps = {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function FormInput({ label, type = "text", value, placeholder, error, onChange }: FormInputProps) {
  return (
    <div>
      <label className="form-control-label">{label}</label>
      <input type={type} className="form-control" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
