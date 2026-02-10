export const getAssetColor = (type?: string) => {
    switch (type?.toLowerCase()) {
        case 'crypto': return '#AC66DA'; // Purple
        case 'stock': return '#74C648';  // Green
        case 'property': return '#EAB308'; // Amber
        case 'custom': return '#9CA3AF'; // Gray
        default: return '#AC66DA';
    }
};
