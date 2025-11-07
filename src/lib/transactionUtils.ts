import { Transaction } from '@/types/dashboard';

export function groupTransactionsByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    // Parse date like "Dec 2nd 2024" to extract month and year
    const dateMatch = transaction.date.match(/(\w+)\s+\d+[a-z]+\s+(\d+)/);
    if (dateMatch) {
      const monthName = dateMatch[1];
      const year = dateMatch[2];
      
      // Convert month name to full month format
      const monthMap: Record<string, string> = {
        'Jan': 'January',
        'Feb': 'February',
        'Mar': 'March',
        'Apr': 'April',
        'May': 'May',
        'Jun': 'June',
        'Jul': 'July',
        'Aug': 'August',
        'Sep': 'September',
        'Oct': 'October',
        'Nov': 'November',
        'Dec': 'December',
      };
      
      const fullMonthName = monthMap[monthName] || monthName;
      const monthKey = `${fullMonthName} ${year}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    }
  });
  
  // Sort months (most recent first)
  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    })
  );
}

export function filterTransactions(
  transactions: Transaction[],
  searchQuery: string,
  categoryFilter: string | null
): Transaction[] {
  return transactions.filter(transaction => {
    const matchesSearch = !searchQuery || 
      transaction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.date.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
}



