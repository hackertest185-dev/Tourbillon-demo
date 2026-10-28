// Cursor preference context — persists selected cursor style to localStorage
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CursorStyle = 'default' | 'tourbillon' | 'crosshair' | 'lumed' | 'hand' | 'bezel' | 'compass' | 'sapphire' | 'rotor';

export interface CursorOption {
  id: CursorStyle;
  label: string;
  description: string;
}

export const CURSOR_OPTIONS: CursorOption[] = [
  { id: 'default',    label: 'العادي',       description: 'مؤشر الجهاز العادي' },
  { id: 'tourbillon', label: 'Tourbillon',   description: 'ميكانيزم بيلف' },
  { id: 'crosshair',  label: 'علامة الدقة',   description: 'علامة شبه تدريج وش الساعة' },
  { id: 'lumed',      label: 'نقطة منوّرة',  description: 'نقطة نور شبه علامات الساعة' },
  { id: 'hand',       label: 'عقرب ساعة',    description: 'مؤشر على شكل عقرب ساعة' },
  { id: 'bezel',      label: 'إطار الساعة',  description: 'دايرة بتلف حوالين المؤشر' },
  { id: 'compass',    label: 'بوصلة',        description: 'علامة على شكل بوصلة' },
  { id: 'sapphire',   label: 'كريستالة',     description: 'شكل مستوحى من زجاج الساعة' },
  { id: 'rotor',      label: 'دوّار الساعة', description: 'شكل مستوحى من ميكانيزم الساعة الأوتوماتيك' },
];

interface CursorContextType {
  cursor: CursorStyle;
  setCursor: (style: CursorStyle) => void;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export const useCursor = () => {
  const ctx = useContext(CursorContext);
  if (!ctx) throw new Error('useCursor must be used within CursorProvider');
  return ctx;
};

export const CursorProvider = ({ children }: { children: ReactNode }) => {
  const [cursor, setCursorState] = useState<CursorStyle>('default');

  useEffect(() => {
    const saved = localStorage.getItem('tourbillon-cursor') as CursorStyle | null;
    if (saved && CURSOR_OPTIONS.some(o => o.id === saved)) {
      setCursorState(saved);
    }
  }, []);

  const setCursor = (style: CursorStyle) => {
    setCursorState(style);
    localStorage.setItem('tourbillon-cursor', style);
  };

  return (
    <CursorContext.Provider value={{ cursor, setCursor }}>
      {children}
    </CursorContext.Provider>
  );
};
