import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Field from './Field';

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  required = true
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field id={id} label={label}>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={8}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="auth-eye"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}
