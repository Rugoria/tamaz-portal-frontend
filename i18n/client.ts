'use client';
import {useMessages} from 'next-intl';
import {useCallback} from 'react';
import {translateText} from './text';
export function useT() {
  const messages = useMessages().ui as Record<string, string>;
  return useCallback((source: string, values?: Record<string, string | number>) => translateText(messages, source, values), [messages]);
}
