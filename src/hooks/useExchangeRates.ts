// Utility hook to fetch live exchange rates and calculate precise fiat values
import { useState, useEffect, useCallback } from 'react';

// Shared module-level cache to prevent duplicate fetches across multiple mounting components
let cachedRates: Record<string, number> = { USD: 1, THB: 35, BDT: 110 };
let lastFetchTimestamp = 0;
let inflightFetchPromise: Promise<Record<string, number>> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const useExchangeRates = () => {
    const [rates, setRates] = useState<Record<string, number>>(cachedRates);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const now = Date.now();

        // If fresh cache exists, use immediately and avoid network hit
        if (now - lastFetchTimestamp < CACHE_TTL_MS && lastFetchTimestamp > 0) {
            setRates(cachedRates);
            return;
        }

        const fetchRates = async () => {
            if (!inflightFetchPromise) {
                inflightFetchPromise = (async () => {
                    try {
                        const res = await fetch('https://open.er-api.com/v6/latest/USD');
                        if (!res.ok) throw new Error("Failed to fetch rates");
                        const data = await res.json();
                        
                        if (data && data.rates) {
                            cachedRates = {
                                USD: 1,
                                THB: data.rates.THB || 35,
                                BDT: data.rates.BDT || 110
                            };
                            lastFetchTimestamp = Date.now();
                        }
                    } catch (error) {
                        console.debug("Exchange rates fetch fallback used:", error);
                    } finally {
                        inflightFetchPromise = null;
                    }
                    return cachedRates;
                })();
            }

            setLoading(true);
            const resolvedRates = await inflightFetchPromise;
            if (isMounted) {
                setRates(resolvedRates);
                setLoading(false);
            }
        };

        fetchRates();
        const interval = setInterval(fetchRates, CACHE_TTL_MS);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Helper to format price based on selected fiat
    const formatPrice = useCallback((priceInUsd: number, fiat: string) => {
        const rate = rates[fiat] || 1;
        const value = priceInUsd * rate;
        
        switch(fiat) {
            case 'THB':
                return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
            case 'BDT':
                return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
            case 'USD':
            default:
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        }
    }, [rates]);

    return { rates, formatPrice, loading };
};
