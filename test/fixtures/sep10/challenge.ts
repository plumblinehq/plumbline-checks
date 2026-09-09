import {
  Account,
  Keypair,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
  type xdr,
} from "@stellar/stellar-sdk";

/**
 * Fixture builder for SEP-10 challenge transactions. Tests construct real
 * signed challenge XDR with the SDK and serve it over a fake HTTP layer, so
 * the checks decode and verify exactly what a server would send. Everything
 * is deterministic: the clock is frozen and the keys derive from fixed
 * seeds.
 */

/** Frozen clock shared with the test Envs (makeEnv's default now). */
export const NOW = new Date("2026-01-01T00:00:00Z");
export const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

/** The passphrase the valid fixture declares and challenges are signed over. */
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/** Deterministic keypairs derived from fixed seeds. */
export const SERVER_KEYPAIR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(1));
export const OTHER_KEYPAIR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(2));
export const SIGNING_KEY = SERVER_KEYPAIR.publicKey();

/** A 64-byte value that base64-decodes to 48 bytes, as SEP-10 requires. */
export function validNonce(): Uint8Array {
  return new TextEncoder().encode(Buffer.from(new Uint8Array(48).fill(9)).toString("base64"));
}

/** The first Manage Data operation every valid challenge carries. */
export function authOperation(clientAccount: string): xdr.Operation {
  return Operation.manageData({
    name: "example.com auth",
    value: validNonce(),
    source: clientAccount,
  });
}

/** The optional web_auth_domain operation for the endpoint's host. */
export function webAuthDomainOperation(domain = "example.com"): xdr.Operation {
  return Operation.manageData({
    name: "web_auth_domain",
    value: new TextEncoder().encode(domain),
    source: SIGNING_KEY,
  });
}

/** The optional client_domain operation, sourced from the client domain account. */
export function clientDomainOperation(
  domain = "wallet.example.com",
  source = OTHER_KEYPAIR.publicKey(),
): xdr.Operation {
  return Operation.manageData({
    name: "client_domain",
    value: new TextEncoder().encode(domain),
    source,
  });
}

export interface BuildChallengeOptions {
  clientAccount: string;
  /**
   * The transaction source account (the SEP-10 server account). Defaults to
   * SIGNING_KEY.
   */
  source?: string;
  /**
   * Starting sequence passed to the builder; build() increments it, so the
   * default "-1" yields the sequence 0 SEP-10 requires.
   */
  startingSequence?: string;
  /** Defaults to now..now+900; pass null for no time bounds. */
  timebounds?: { minTime: number; maxTime: number } | null;
  /** Defaults to a single auth operation for the client account. */
  operations?: xdr.Operation[];
  /** Defaults to [SERVER_KEYPAIR]; pass [] for an unsigned challenge. */
  signedBy?: Keypair[];
  networkPassphrase?: string;
}

/**
 * Build a challenge envelope and return it base64-encoded, ready to serve as
 * the `transaction` field of a challenge response.
 */
export function buildChallenge(options: BuildChallengeOptions): string {
  const networkPassphrase = options.networkPassphrase ?? NETWORK_PASSPHRASE;
  // Start the account at -1 so the builder's increment yields sequence 0,
  // the invalid sequence number SEP-10 requires (the SDK's own webauth
  // module does the same). The built transaction is immutable, so the
  // sequence must come out of build() correct.
  const builder = new TransactionBuilder(
    new Account(options.source ?? SIGNING_KEY, options.startingSequence ?? "-1"),
    {
      fee: "100",
      networkPassphrase,
    },
  );
  if (options.timebounds === null) {
    builder.setTimeout(TimeoutInfinite);
  } else {
    builder.setTimebounds(
      options.timebounds?.minTime ?? NOW_SECONDS,
      options.timebounds?.maxTime ?? NOW_SECONDS + 900,
    );
  }
  const operations = options.operations ?? [authOperation(options.clientAccount)];
  for (const operation of operations) {
    builder.addOperation(operation);
  }
  const transaction = builder.build();
  for (const keypair of options.signedBy ?? [SERVER_KEYPAIR]) {
    transaction.sign(keypair);
  }
  return transaction.toXdr();
}