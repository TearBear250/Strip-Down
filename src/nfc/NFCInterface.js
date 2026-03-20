'use strict';

const { parsePaymentURI } = require('../cryptocurrencies/paymentRequest');

/**
 * NDEF record types used for NFC payment data exchange.
 * Based on the NFC Forum URI Record Type Definition.
 */
const NDEF_TYPES = {
  URI: 'U',
  TEXT: 'T',
  MIME: 'MIME',
};

/**
 * NFCInterface
 *
 * Handles encoding and decoding of cryptocurrency payment data
 * for NFC (Near Field Communication) transport — compatible with
 * smartphone NFC chips and merchant-class POS NFC readers.
 *
 * In a production deployment this class would wrap the platform's
 * native NFC driver (e.g. Web NFC API on Android Chrome, CoreNFC on
 * iOS, or a serial/USB NFC reader SDK on POS hardware).
 * The static helpers are driver-independent and can be unit-tested
 * without physical hardware.
 */
class NFCInterface {
  /**
   * @param {object} [options]
   * @param {object} [options.driver] - Optional hardware driver instance that
   *   exposes `write(data: Buffer): Promise<void>` and
   *   `read(): Promise<Buffer>`.  When omitted the class operates in
   *   "simulation" mode, useful for testing.
   */
  constructor({ driver } = {}) {
    this.driver = driver || null;
    this._simulatedTag = null;
  }

  // ─── Encoding helpers ─────────────────────────────────────────────────────

  /**
   * Encodes a payment URI into an NDEF-like payload buffer.
   *
   * The encoding is intentionally simple so it can be decoded by any
   * standards-compliant NFC reader:
   *   [1 byte  : record type 'U']
   *   [2 bytes : payload length, big-endian uint16]
   *   [n bytes : UTF-8 encoded URI]
   *
   * @param {string} paymentURI - e.g. "bitcoin:1A1z…?amount=0.001"
   * @returns {Buffer}
   */
  static encode(paymentURI) {
    if (typeof paymentURI !== 'string' || paymentURI.trim() === '') {
      throw new TypeError('paymentURI must be a non-empty string');
    }
    const uriBytes = Buffer.from(paymentURI, 'utf8');
    const buf = Buffer.allocUnsafe(3 + uriBytes.length);
    buf.writeUInt8(NDEF_TYPES.URI.charCodeAt(0), 0);
    buf.writeUInt16BE(uriBytes.length, 1);
    uriBytes.copy(buf, 3);
    return buf;
  }

  /**
   * Decodes an NDEF-like payload buffer back into a payment URI string.
   *
   * @param {Buffer} buffer
   * @returns {string} The decoded payment URI.
   */
  static decode(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
      throw new TypeError('buffer must be a Buffer with at least 3 bytes');
    }
    const type = String.fromCharCode(buffer.readUInt8(0));
    if (type !== NDEF_TYPES.URI) {
      throw new Error(`Unsupported NDEF record type: ${type}`);
    }
    const length = buffer.readUInt16BE(1);
    if (buffer.length < 3 + length) {
      throw new Error('Buffer is shorter than declared payload length');
    }
    return buffer.toString('utf8', 3, 3 + length);
  }

  // ─── Hardware / simulation I/O ────────────────────────────────────────────

  /**
   * Writes a payment URI to the NFC tag (or simulated tag).
   *
   * @param {string} paymentURI
   * @returns {Promise<void>}
   */
  async write(paymentURI) {
    const payload = NFCInterface.encode(paymentURI);
    if (this.driver) {
      await this.driver.write(payload);
    } else {
      // Simulation mode: store in memory
      this._simulatedTag = payload;
    }
  }

  /**
   * Reads a payment URI from the NFC tag (or simulated tag).
   *
   * @returns {Promise<string>} Decoded payment URI.
   */
  async read() {
    let payload;
    if (this.driver) {
      payload = await this.driver.read();
    } else {
      if (!this._simulatedTag) {
        throw new Error('No NFC tag present (simulation mode)');
      }
      payload = this._simulatedTag;
    }
    return NFCInterface.decode(payload);
  }

  /**
   * Reads and immediately parses the payment URI from the tag.
   *
   * @returns {Promise<{ scheme: string, address: string, params: object }>}
   */
  async readPaymentDetails() {
    const uri = await this.read();
    return parsePaymentURI(uri);
  }
}

module.exports = { NFCInterface, NDEF_TYPES };
