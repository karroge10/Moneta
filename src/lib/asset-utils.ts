export const getAssetColor = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'crypto': return '#AC66DA'; // Purple
        case 'stock': return '#74C648';  // Green
        case 'property': return '#EAB308'; // Amber
        case 'custom': return '#9CA3AF'; // Gray
        default: return '#AC66DA';
    }
};

export const getDerivedAssetIcon = (type?: string, ticker?: string | null, pricingMode?: string) => {
    if (pricingMode === 'live') {
        if (type?.toLowerCase() === 'stock' && ticker) {
            return `https://images.financialmodelingprep.com/symbol/${ticker.toUpperCase()}.png`;
        }
        if (type?.toLowerCase() === 'crypto' && ticker) {
            return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${ticker.toLowerCase()}.png`;
        }
    }

    switch (type?.toLowerCase()) {
        case 'crypto': return 'BitcoinCircle';
        case 'stock': return 'Cash';
        case 'property': return 'Neighbourhood';
        case 'custom': return 'ViewGrid';
        case 'other': return 'Reports';
        default: return 'Reports';
    }
};
