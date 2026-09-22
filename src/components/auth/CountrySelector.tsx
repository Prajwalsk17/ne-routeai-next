'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface CountryInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  formatPlaceholder: string;
  sampleDigits: number;
}

export const COUNTRIES: CountryInfo[] = [
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    formatPlaceholder: '98765 43210',
    sampleDigits: 10,
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    formatPlaceholder: '202 555 0123',
    sampleDigits: 10,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    formatPlaceholder: '7911 123456',
    sampleDigits: 10,
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    dialCode: '+880',
    flag: '🇧🇩',
    formatPlaceholder: '1712 345678',
    sampleDigits: 10,
  },
  {
    code: 'NP',
    name: 'Nepal',
    dialCode: '+977',
    flag: '🇳🇵',
    formatPlaceholder: '984 1234567',
    sampleDigits: 10,
  },
  {
    code: 'BT',
    name: 'Bhutan',
    dialCode: '+975',
    flag: '🇧🇹',
    formatPlaceholder: '17 123 456',
    sampleDigits: 8,
  },
  {
    code: 'MM',
    name: 'Myanmar',
    dialCode: '+95',
    flag: '🇲🇲',
    formatPlaceholder: '9 1234 5678',
    sampleDigits: 9,
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    formatPlaceholder: '8123 4567',
    sampleDigits: 8,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    formatPlaceholder: '50 123 4567',
    sampleDigits: 9,
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    formatPlaceholder: '412 345 678',
    sampleDigits: 9,
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    formatPlaceholder: '416 555 0199',
    sampleDigits: 10,
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    formatPlaceholder: '151 23456789',
    sampleDigits: 10,
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    flag: '🇯🇵',
    formatPlaceholder: '90 1234 5678',
    sampleDigits: 10,
  },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)

interface CountrySelectorProps {
  selected: CountryInfo;
  onSelect: (country: CountryInfo) => void;
  disabled?: boolean;
}

export function CountrySelector({ selected, onSelect, disabled = false }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Selected country: ${selected.name} (${selected.dialCode})`}
        className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[#0B130F] border border-white/20 hover:border-teal/50 text-[#F8FAFC] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-semibold text-white tracking-wide">{selected.dialCode}</span>
        <ChevronDown size={14} className={`text-mist-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-72 max-h-72 rounded-xl bg-[#0F1A14] border border-white/20 shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl"
        >
          {/* Search filter */}
          <div className="p-2 border-b border-white/10 bg-[#0B130F]/80">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#14221B] border border-white/10 text-white text-xs placeholder:text-mist-muted focus:outline-none focus:border-teal text-[#F8FAFC]"
              />
            </div>
          </div>

          {/* List of Countries */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/5 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-mist-muted">No countries found</div>
            ) : (
              filtered.map((country) => {
                const isSelected = country.code === selected.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(country);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left hover:bg-white/[0.08] transition-colors ${
                      isSelected ? 'bg-teal/15 text-white font-semibold' : 'text-mist-dim'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base leading-none">{country.flag}</span>
                      <span className="truncate text-white">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-mono text-teal-light font-semibold">{country.dialCode}</span>
                      {isSelected && <Check size={14} className="text-teal" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Normalizes phone number into strict E.164 format.
 * Example: Country +91, local "98765 43210" => "+919876543210"
 */
export function normalizeToE164(dialCode: string, localNumber: string): string {
  const cleanDial = dialCode.trim().startsWith('+') ? dialCode.trim() : `+${dialCode.trim()}`;
  // Strip non-digit characters from local number
  const cleanLocal = localNumber.replace(/\D/g, '');
  // Strip leading 0 if present (e.g. UK 07911... or India 098765...)
  const trimmedLocal = cleanLocal.startsWith('0') ? cleanLocal.replace(/^0+/, '') : cleanLocal;
  return `${cleanDial}${trimmedLocal}`;
}

/**
 * Validates local phone number format for given country.
 */
export function validatePhoneNumber(country: CountryInfo, localNumber: string): { valid: boolean; error?: string } {
  const digits = localNumber.replace(/\D/g, '');
  if (!digits) {
    return { valid: false, error: 'Please enter a mobile phone number.' };
  }

  if (country.code === 'IN') {
    // Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9
    const cleanDigits = digits.startsWith('0') ? digits.slice(1) : digits;
    if (cleanDigits.length !== 10) {
      return { valid: false, error: 'Indian mobile numbers must be exactly 10 digits.' };
    }
    if (!/^[6-9]/.test(cleanDigits)) {
      return { valid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9.' };
    }
    return { valid: true };
  }

  // Generic international length checks (7 to 15 digits according to ITU-T E.164)
  if (digits.length < 6 || digits.length > 15) {
    return { valid: false, error: `Please enter a valid ${country.name} phone number (${country.sampleDigits} digits).` };
  }

  return { valid: true };
}
