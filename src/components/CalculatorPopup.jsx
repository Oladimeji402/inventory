import { useState } from 'react';
import { X } from 'lucide-react';

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Math.round(value * 1e10) / 1e10;
  const text = String(rounded);
  return text.length > 14 ? rounded.toPrecision(10) : text;
}

function compute(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '×') return a * b;
  if (op === '÷') return b === 0 ? NaN : a / b;
  return b;
}

export default function CalculatorPopup({ open, onClose }) {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);
  const [operator, setOperator] = useState(null);
  const [fresh, setFresh] = useState(true);

  if (!open) return null;

  const reset = () => {
    setDisplay('0');
    setStored(null);
    setOperator(null);
    setFresh(true);
  };

  const inputDigit = (digit) => {
    setDisplay((current) => {
      if (current === 'Error' || fresh) return digit;
      if (current === '0') return digit;
      if (current.length >= 14) return current;
      return current + digit;
    });
    setFresh(false);
  };

  const inputDot = () => {
    setDisplay((current) => {
      if (current === 'Error' || fresh) return '0.';
      if (current.includes('.')) return current;
      return `${current}.`;
    });
    setFresh(false);
  };

  const backspace = () => {
    if (fresh || display === 'Error') {
      setDisplay('0');
      setFresh(true);
      return;
    }
    setDisplay((current) => (current.length <= 1 ? '0' : current.slice(0, -1)));
  };

  const applyOperator = (nextOp) => {
    if (display === 'Error') return;
    const current = Number(display);

    if (stored !== null && operator && !fresh) {
      const result = compute(stored, current, operator);
      const formatted = formatNumber(result);
      setDisplay(formatted);
      setStored(formatted === 'Error' ? null : result);
      setOperator(formatted === 'Error' ? null : nextOp);
      setFresh(true);
      return;
    }

    setStored(current);
    setOperator(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (display === 'Error' || stored === null || !operator) return;
    const result = compute(stored, Number(display), operator);
    setDisplay(formatNumber(result));
    setStored(null);
    setOperator(null);
    setFresh(true);
  };

  const keys = [
    { label: 'C', action: reset, className: 'calc-key muted' },
    { label: '⌫', action: backspace, className: 'calc-key muted' },
    { label: '÷', action: () => applyOperator('÷'), className: 'calc-key op' },
    { label: '×', action: () => applyOperator('×'), className: 'calc-key op' },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '−', action: () => applyOperator('-'), className: 'calc-key op' },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '+', action: () => applyOperator('+'), className: 'calc-key op' },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '=', action: equals, className: 'calc-key equals' },
    { label: '0', action: () => inputDigit('0'), className: 'calc-key zero' },
    { label: '.', action: inputDot }
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="calculator-modal fade-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Calculator">
        <div className="calculator-head">
          <h3>Calculator</h3>
          <button type="button" className="modal-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
        <div className="calculator-display mono">
          <span className="calculator-expression">{operator ? `${formatNumber(stored)} ${operator}` : '\u00a0'}</span>
          <strong>{display}</strong>
        </div>
        <div className="calculator-pad">
          {keys.map((key) => (
            <button
              key={key.label}
              type="button"
              className={key.className || 'calc-key'}
              onClick={key.action}
            >
              {key.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
