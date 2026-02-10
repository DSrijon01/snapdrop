import { PublicKey } from "@solana/web3.js";
import { Idl } from "@coral-xyz/anchor";

// Deployed Program ID
export const PROGRAM_ID = new PublicKey("wTiiJAuiwtsMsn9pznUymBLyYj2Mt6pFDRC4XLgsEWu");

export const IDL = {
  "accounts": [
    {
      "discriminator": [
        59,
        89,
        136,
        25,
        21,
        196,
        183,
        13
      ],
      "name": "ListingAccount"
    }
  ],
  "address": "wTiiJAuiwtsMsn9pznUymBLyYj2Mt6pFDRC4XLgsEWu",
  "instructions": [
    {
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "writable": true
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "listing_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "escrow_token_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "buyer_token_account",
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        },
        {
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          "name": "token_program"
        }
      ],
      "args": [],
      "discriminator": [
        96,
        0,
        28,
        190,
        49,
        107,
        83,
        222
      ],
      "name": "buy_nft"
    },
    {
      "accounts": [
        {
          "name": "seller",
          "signer": true,
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "listing_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "escrow_token_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "seller_token_account",
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        },
        {
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          "name": "token_program"
        }
      ],
      "args": [],
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "name": "cancel_listing"
    },
    {
      "accounts": [
        {
          "name": "seller",
          "signer": true,
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "seller_token_account",
          "writable": true
        },
        {
          "name": "listing_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "name": "escrow_token_account",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          },
          "writable": true
        },
        {
          "address": "11111111111111111111111111111111",
          "name": "system_program"
        },
        {
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          "name": "token_program"
        },
        {
          "address": "SysvarRent111111111111111111111111111111111",
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ],
      "discriminator": [
        88,
        221,
        93,
        166,
        63,
        220,
        106,
        232
      ],
      "name": "list_nft"
    }
  ],
  "metadata": {
    "description": "Created with Anchor",
    "name": "street_sync",
    "spec": "0.1.0",
    "version": "0.1.0"
  },
  "types": [
    {
      "name": "ListingAccount",
      "type": {
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ],
        "kind": "struct"
      }
    }
  ]
};

export const findListingAddress = (mint: PublicKey, seller: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("listing"),
            mint.toBuffer(),
            seller.toBuffer()
        ],
        PROGRAM_ID
    );
};

export const findEscrowAddress = (mint: PublicKey, seller: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            mint.toBuffer(),
            seller.toBuffer()
        ],
        PROGRAM_ID
    );
};
