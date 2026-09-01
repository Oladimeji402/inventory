import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import './SearchableSelect.css';

function optionDomId(id, option) {
  return `${id}-option-${String(option).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Search…',
  disabled = false,
  emptyMessage = 'No matches'
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${id}-listbox`;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || needle === String(value || '').toLowerCase()) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query, value]);

  useEffect(() => {
    if (!open) setQuery(value || '');
  }, [value, open]);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open, filtered]);

  const select = (option) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  return (
    <div className={`searchable-select${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? optionDomId(id, filtered[activeIndex]) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : (value || '')}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(Math.max(filtered.indexOf(value), 0));
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
            event.preventDefault();
            select(filtered[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery(value || '');
          }
        }}
      />
      <span className="searchable-select-toggle" aria-hidden="true">
        <ChevronsUpDown size={16} />
      </span>
      {open && (
        <ul id={listId} role="listbox" className="searchable-select-menu" ref={listRef}>
          {filtered.length === 0 && (
            <li className="searchable-select-empty">{emptyMessage}</li>
          )}
          {filtered.map((option, index) => (
            <li
              id={optionDomId(id, option)}
              key={option}
              role="option"
              aria-selected={option === value}
              data-active={index === activeIndex}
              className={`searchable-select-option${index === activeIndex ? ' active' : ''}${option === value ? ' selected' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                select(option);
              }}
            >
              <span>{option}</span>
              {option === value && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
