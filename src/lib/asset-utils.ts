export const getAssetColor = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'crypto': return '#AC66DA'; 
        case 'stock': return '#74C648';  
        case 'property': return '#EAB308'; 
        case 'custom': return '#9CA3AF'; 
        default: return '#AC66DA';
    }
};

export const getDerivedAssetIcon = (type?: string, ticker?: string | null, pricingMode?: string) => {
    if (pricingMode === 'live') {
        if (type?.toLowerCase() === 'stock' && ticker) {
            return `https://logo.clearbit.com/${ticker}.us`;
        }
        if (type?.toLowerCase() === 'crypto' && ticker) {
            return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${ticker.toLowerCase()}.png`;
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
