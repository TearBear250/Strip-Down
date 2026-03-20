'use strict';

const { NFCInterface } = require('../src/nfc/NFCInterface');

const BTC_URI = 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001&label=Test';
const ETH_URI = 'ethereum:0xAb5801a7D398351b8bE11C439e05C5B3259aec9B?amount=0.5';

describe('NFCInterface – static encode/decode', () => {
  it('encodes and decodes a Bitcoin URI round-trip', () => {
    const buf = NFCInterface.encode(BTC_URI);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(NFCInterface.decode(buf)).toBe(BTC_URI);
  });

  it('encodes and decodes an Ethereum URI round-trip', () => {
    expect(NFCInterface.decode(NFCInterface.encode(ETH_URI))).toBe(ETH_URI);
  });

  it('encode throws for an empty string', () => {
    expect(() => NFCInterface.encode('')).toThrow(TypeError);
  });

  it('encode throws for a non-string', () => {
    expect(() => NFCInterface.encode(42)).toThrow(TypeError);
  });

  it('decode throws for a buffer that is too short', () => {
    expect(() => NFCInterface.decode(Buffer.from([0x55, 0x00]))).toThrow(TypeError);
  });

  it('decode throws for an unsupported NDEF record type', () => {
    const buf = Buffer.allocUnsafe(3);
    buf.writeUInt8(0x58, 0); // 'X' – not 'U'
    buf.writeUInt16BE(0, 1);
    expect(() => NFCInterface.decode(buf)).toThrow('Unsupported NDEF record type');
  });

  it('decode throws when declared length exceeds buffer size', () => {
    const buf = Buffer.allocUnsafe(3);
    buf.writeUInt8(0x55, 0); // 'U'
    buf.writeUInt16BE(100, 1); // claims 100 bytes, but buffer only has 3
    expect(() => NFCInterface.decode(buf)).toThrow('shorter than declared payload length');
  });
});

describe('NFCInterface – simulation mode (no driver)', () => {
  let nfc;
  beforeEach(() => {
    nfc = new NFCInterface();
  });

  it('write then read returns the original URI', async () => {
    await nfc.write(BTC_URI);
    const result = await nfc.read();
    expect(result).toBe(BTC_URI);
  });

  it('readPaymentDetails parses the URI', async () => {
    await nfc.write(BTC_URI);
    const details = await nfc.readPaymentDetails();
    expect(details.scheme).toBe('bitcoin');
    expect(details.address).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(details.params.amount).toBe('0.001');
  });

  it('read throws when no tag has been written', async () => {
    await expect(nfc.read()).rejects.toThrow('No NFC tag present');
  });
});

describe('NFCInterface – driver delegation', () => {
  it('delegates write/read to the injected driver', async () => {
    const encoded = NFCInterface.encode(BTC_URI);
    const driver = {
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(encoded),
    };
    const nfc = new NFCInterface({ driver });

    await nfc.write(BTC_URI);
    expect(driver.write).toHaveBeenCalledWith(encoded);

    const result = await nfc.read();
    expect(result).toBe(BTC_URI);
  });
});
