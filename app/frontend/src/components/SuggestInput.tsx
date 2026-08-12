'use client';

import { useMemo, useRef, useState } from 'react';
import { Field, inputClass } from './ui';

/**
 * Campo de texto con sugerencias.
 *
 * La regla de fondo, que vale tanto para la ciudad como para la marca: las
 * listas del catálogo son PARCIALES. Tienen lo habitual, no todo lo que
 * existe. Por eso esto sugiere pero nunca obliga — quien vende una marca rara
 * o vive en un pueblo chico tiene que poder publicar igual. El valor se guarda
 * como texto libre; el catálogo solo evita que la misma cosa quede escrita de
 * cinco formas distintas.
 */
export function SuggestInput({
  label,
  value,
  onChange,
  suggestions,
  hint,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  hint?: string | null;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const search = normalize(value);
    return suggestions
      .filter((option) => (search ? normalize(option).includes(search) : true))
      .slice(0, 8);
  }, [suggestions, value]);

  const exactMatch = matches.length === 1 && normalize(matches[0]!) === normalize(value);
  const showList = open && !disabled && matches.length > 0 && !exactMatch;

  function choose(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <Field label={label} hint={hint} required={required}>
      <div className="relative">
        <input
          className={inputClass}
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Se espera un instante para que un clic en la lista alcance a
            // registrarse antes de que la lista desaparezca.
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(event) => {
            if (!showList) return;

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlight((current) => Math.min(current + 1, matches.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlight((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter') {
              const picked = matches[highlight];
              if (picked) {
                event.preventDefault();
                choose(picked);
              }
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />

        {showList && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            {matches.map((option, index) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                  }}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setHighlight(index)}
                  className={[
                    'block w-full px-3 py-2 text-left text-sm',
                    index === highlight ? 'bg-brand-soft text-brand-deep' : 'text-body',
                  ].join(' ')}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

/** Compara sin distinguir mayúsculas ni acentos: "cordoba" encuentra "Córdoba". */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
