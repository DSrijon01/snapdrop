import { getMintLen, ExtensionType } from "@solana/spl-token";
console.log("No Ext:", getMintLen([]));
console.log("Ptr Ext:", getMintLen([ExtensionType.MetadataPointer]));
console.log("TransferFee:", getMintLen([ExtensionType.TransferFeeConfig]));
console.log("MintClose:", getMintLen([ExtensionType.MintCloseAuthority]));
