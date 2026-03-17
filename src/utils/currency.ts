export type Currency = 'USD' | 'IDR';

export function formatCurrency(amount: number, currency: Currency) {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getCurrencySymbol(currency: Currency) {
  return currency === 'USD' ? '$' : 'Rp';
}

export function formatCurrencyInput(value: string, currency: Currency): string {
  let cleanValue = value.replace(/[^\d.,]/g, '');
  if (!cleanValue) return '';

  if (currency === 'USD') {
    cleanValue = cleanValue.replace(/,/g, '');
    const parts = cleanValue.split('.');
    let intPart = parts[0];
    const fracPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';
    
    if (intPart) {
      intPart = parseInt(intPart, 10).toLocaleString('en-US');
    }
    return intPart + fracPart;
  } else {
    cleanValue = cleanValue.replace(/\./g, '');
    const parts = cleanValue.split(',');
    let intPart = parts[0];
    const fracPart = parts.length > 1 ? ',' + parts[1].slice(0, 2) : '';
    
    if (intPart) {
      intPart = parseInt(intPart, 10).toLocaleString('id-ID');
    }
    return intPart + fracPart;
  }
}

export function parseCurrencyInput(value: string, currency: Currency): number {
  if (!value) return 0;
  if (currency === 'USD') {
    return parseFloat(value.replace(/,/g, '')) || 0;
  } else {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }
}
