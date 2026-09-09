import { Keypair, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import {
  NETWORK_PASSPHRASE,
  OTHER_KEYPAIR,
  SIGNING_KEY,
  buildChallenge,
  validNonce,
} from "../../fixtures/sep10/challenge.js";

/** fromXdr returns the fee-bump union; the checks decode plain transactions. */
function decode(envelope: string): Transaction {
  return TransactionBuilder.fromXdr(envelope, NETWORK_PASSPHRASE) as Transaction;
}

describe("sep10 challenge fixture builder", () => {
  it("builds a challenge that decodes with sequence 0 and the right source", () => {
    const client = Keypair.random().publicKey();
    const envelope = buildChallenge({ clientAccount: client });
    const tx = decode(envelope);
    expect(tx.source).toBe(SIGNING_KEY);
    expect(tx.sequence).toBe("0");
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0]?.source).toBe(client);
    expect(tx.operations[0]?.type).toBe("manageData");
  });

  it("produces a signature that verifies against the signing key", () => {
    const client = Keypair.random().publicKey();
    const envelope = buildChallenge({ clientAccount: client });
    const tx = decode(envelope);
    expect(tx.signatures).toHaveLength(1);
    const verified = Keypair.fromPublicKey(SIGNING_KEY).verify(tx.hash(), tx.signatures[0]!.signature);
    expect(verified).toBe(true);
  });

  it("can build a challenge signed by another key", () => {
    const client = Keypair.random().publicKey();
    const envelope = buildChallenge({ clientAccount: client, signedBy: [OTHER_KEYPAIR] });
    const tx = decode(envelope);
    expect(tx.signatures).toHaveLength(1);
    expect(Keypair.fromPublicKey(SIGNING_KEY).verify(tx.hash(), tx.signatures[0]!.signature)).toBe(false);
    expect(Keypair.fromPublicKey(OTHER_KEYPAIR.publicKey()).verify(tx.hash(), tx.signatures[0]!.signature)).toBe(
      true,
    );
  });

  it("can omit time bounds and sign with nobody", () => {
    const client = Keypair.random().publicKey();
    const envelope = buildChallenge({ clientAccount: client, timebounds: null, signedBy: [] });
    const tx = decode(envelope);
    // TimeoutInfinite encodes as the zero time bounds; the checks treat that
    // as "no usable time bounds".
    expect(tx.timeBounds).toEqual({ minTime: "0", maxTime: "0" });
    expect(tx.signatures).toHaveLength(0);
  });

  it("produces a 64-byte nonce that decodes to 48 bytes", () => {
    const nonce = validNonce();
    expect(nonce.length).toBe(64);
    expect(Buffer.from(new TextDecoder().decode(nonce), "base64").length).toBe(48);
  });
});