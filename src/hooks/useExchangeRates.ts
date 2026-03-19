// Utility hook to fetch live exchange rates and calculate precise fiat values
import { useState, useEffect } from 'react';

export const useExchangeRates = () => {
    const [rates, setRates] = useState<Record<string, number>>({ USD: 1, THB: 35, BDT: 110 }); // Fallbacks
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRates = async () => {
            setLoading(true);
            try {
                // Free, public API for daily exchange rates (no auth required)
                const res = await fetch('https://open.er-api.com/v6/latest/USD');
                if (!res.ok) throw new Error("Failed to fetch rates");
                const data = await res.json();
                
                if (data && data.rates) {
                    setRates({
                        USD: 1,
                        THB: data.rates.THB || 35,
                        BDT: data.rates.BDT || 110
                    });
                }
            } catch (error) {
                console.error("Error fetching exchange rates:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRates();
        // Update rates every hour
        const interval = setInterval(fetchRates, 3600 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Helper to format price based on selected fiat
    const formatPrice = (priceInUsd: number, fiat: string) => {
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
    };

    return { rates, formatPrice, loading };
};
