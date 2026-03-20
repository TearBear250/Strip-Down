'use strict';

const { validateAddress } = require('../src/cryptocurrencies/addressValidator');

describe('validateAddress', () => {
  // Bitcoin
  describe('BTC', () => {
    it('accepts a valid P2PKH address', () => {
      expect(validateAddress('BTC', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
    });
    it('accepts a valid P2SH address', () => {
      expect(validateAddress('BTC', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
    });
    it('accepts a native SegWit (bech32) address', () => {
      expect(validateAddress('BTC', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
    });
    it('rejects an invalid BTC address', () => {
      expect(validateAddress('BTC', 'notabitcoinaddress')).toBe(false);
    });
  });

  // Ethereum
  describe('ETH', () => {
    it('accepts a valid checksummed ETH address', () => {
      expect(validateAddress('ETH', '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B')).toBe(true);
    });
    it('accepts a valid lower-case ETH address', () => {
      expect(validateAddress('ETH', '0xab5801a7d398351b8be11c439e05c5b3259aec9b')).toBe(true);
    });
    it('rejects an address without 0x prefix', () => {
      expect(validateAddress('ETH', 'ab5801a7d398351b8be11c439e05c5b3259aec9b')).toBe(false);
    });
    it('rejects a too-short ETH address', () => {
      expect(validateAddress('ETH', '0xab5801a7')).toBe(false);
    });
  });

  // TRON
  describe('TRX', () => {
    it('accepts a valid TRON address', () => {
      expect(validateAddress('TRX', 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7')).toBe(true);
    });
    it('rejects an address not starting with T', () => {
      expect(validateAddress('TRX', 'ALa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7')).toBe(false);
    });
    it('rejects a TRON address that is too short', () => {
      expect(validateAddress('TRX', 'Tshort')).toBe(false);
    });
  });

  // USDC (supports both ETH and TRX addresses)
  describe('USDC', () => {
    it('accepts an ERC-20 address', () => {
      expect(validateAddress('USDC', '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B')).toBe(true);
    });
    it('accepts a TRC-20 address', () => {
      expect(validateAddress('USDC', 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7')).toBe(true);
    });
    it('rejects an unrecognised address', () => {
      expect(validateAddress('USDC', 'notanaddress')).toBe(false);
    });
  });

  // BNB
  describe('BNB', () => {
    it('accepts a valid BNB Smart Chain address', () => {
      expect(validateAddress('BNB', '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B')).toBe(true);
    });
    it('rejects an invalid BNB address', () => {
      expect(validateAddress('BNB', 'bnbinvalidaddress')).toBe(false);
    });
  });

  // Error cases
  it('throws for an unsupported currency', () => {
    expect(() => validateAddress('DOGE', '1A1z')).toThrow('Unsupported currency');
  });

  it('returns false for non-string inputs', () => {
    expect(validateAddress('BTC', null)).toBe(false);
    expect(validateAddress(null, '1A1z')).toBe(false);
  });
});
