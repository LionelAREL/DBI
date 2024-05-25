import {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  Market,
  PoolInfoLayout,
} from "@raydium-io/raydium-sdk";
import BN from "bn.js";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  GetProgramAccountsResponse,
} from "@solana/web3.js";

import { AccountLayout } from "@solana/spl-token";

const RAYDIUM_V4_PROGRAM_ID = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";

export const getTokenAccountsByOwner = async (
  connection: Connection,
  owner: PublicKey
) => {
  const tokenResp = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  return tokenResp.value.map((token) => ({
    pubkey: token.pubkey,
    programId: token.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(token.account.data),
  }));
};

export const getDecimalFromMintAddress = async (mintAddress: PublicKey) => {
  const token = new Token(TOKEN_PROGRAM_ID, mintAddress, 0);
  const mintInfo = await token.getMintInfo();
  const decimals = mintInfo.decimals;
  return decimals;
};

export const getPoolKeys = async () => {
  const liquidityJsonResp = await fetch(
    "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
  );
  if (!liquidityJsonResp.ok)
    throw new Error("Cannot get liquidity pool response");
  const liquidityJson = (await liquidityJsonResp.json()) as {
    official: any;
    unOfficial: any;
  };
  const allPoolKeysJson = [
    ...(liquidityJson?.official ?? []),
    ...(liquidityJson?.unOfficial ?? []),
  ];

  return allPoolKeysJson;
};

export const findPoolInfoForTokens = (
  mintA: string,
  mintB: string,
  allPoolKeysJson: any
) => {
  const poolData = allPoolKeysJson.find(
    (pool: any) =>
      (pool.baseMint === mintA && pool.quoteMint === mintB) ||
      (pool.baseMint === mintB && pool.quoteMint === mintA)
  );

  if (!poolData) return null;

  return jsonInfo2PoolKeys(poolData) as LiquidityPoolKeys;
};

export const getPoolKeysV3 = async (connection: Connection) => {
  const poolPublicKey = new PublicKey(
    "VUx83xFX3LhmrhbFWxAtTdAuQKuEJk1r2qq1edj7d6p"
  );

  // Get the account info
  const accountInfo = await connection.getAccountInfo(poolPublicKey);

  if (!accountInfo) {
    throw new Error("Pool account not found");
  }

  // Decode the account data
  const poolInfo = PoolInfoLayout.decode(accountInfo.data);
  console.log("v3 poolInfo", poolInfo);
  // Extract necessary fields from poolInfo
  const liquidityPoolKeys: LiquidityPoolKeys = {
    id: poolPublicKey,
    bump: poolInfo.bump,
    ammConfig: new PublicKey(poolInfo.ammConfig),
    creator: new PublicKey(poolInfo.creator),
    mintA: new PublicKey(poolInfo.mintA),
    mintB: new PublicKey(poolInfo.mintB),
    vaultA: new PublicKey(poolInfo.vaultA),
    vaultB: new PublicKey(poolInfo.vaultB),
    observationId: new PublicKey(poolInfo.observationId),
    mintDecimalsA: poolInfo.mintDecimalsA,
    mintDecimalsB: poolInfo.mintDecimalsB,
    tickSpacing: poolInfo.tickSpacing,
    liquidity: new BN(poolInfo.liquidity),
    sqrtPriceX64: new BN(poolInfo.sqrtPriceX64),
    tickCurrent: poolInfo.tickCurrent,
    observationIndex: poolInfo.observationIndex,
    observationUpdateDuration: poolInfo.observationUpdateDuration,
    feeGrowthGlobalX64A: new BN(poolInfo.feeGrowthGlobalX64A),
    feeGrowthGlobalX64B: new BN(poolInfo.feeGrowthGlobalX64B),
    protocolFeesTokenA: new BN(poolInfo.protocolFeesTokenA),
    protocolFeesTokenB: new BN(poolInfo.protocolFeesTokenB),
    swapInAmountTokenA: new BN(poolInfo.swapInAmountTokenA),
    swapOutAmountTokenB: new BN(poolInfo.swapOutAmountTokenB),
    swapInAmountTokenB: new BN(poolInfo.swapInAmountTokenB),
    swapOutAmountTokenA: new BN(poolInfo.swapOutAmountTokenA),
    status: poolInfo.status,
    rewardInfos: poolInfo.rewardInfos.map((info: any) => ({
      emissionsPerSecondX64: new BN(info.emissionsPerSecondX64),
      growthGlobalX64: new BN(info.rewardGrowthGlobalX64),
      rewardVault: new PublicKey(info.tokenVault),
      authority: new PublicKey(info.tokenMint),
    })),
    tickArrayBitmap: poolInfo.tickArrayBitmap.map(
      (bitmap: any) => new BN(bitmap)
    ),
    totalFeesTokenA: new BN(poolInfo.totalFeesTokenA),
    totalFeesClaimedTokenA: new BN(poolInfo.totalFeesClaimedTokenA),
    totalFeesTokenB: new BN(poolInfo.totalFeesTokenB),
    totalFeesClaimedTokenB: new BN(poolInfo.totalFeesClaimedTokenB),
    fundFeesTokenA: new BN(poolInfo.fundFeesTokenA),
    fundFeesTokenB: new BN(poolInfo.fundFeesTokenB),
    startTime: new BN(poolInfo.startTime),
    programId: poolPublicKey,
  };

  console.log("v3", liquidityPoolKeys);
  return liquidityPoolKeys;
};

const getProgramAccounts = async (
  connection: Connection,
  baseMint: string,
  quoteMint: string
): Promise<GetProgramAccountsResponse> => {
  const layout = LIQUIDITY_STATE_LAYOUT_V4;
  const programId = new PublicKey(RAYDIUM_V4_PROGRAM_ID);
  console.log(layout.offsetOf("quoteMint"), layout.offsetOf("baseMint"));
  const quoteMintIsBaseMintAccounts = await connection.getProgramAccounts(
    programId,
    {
      filters: [
        {
          memcmp: {
            offset: layout.offsetOf("baseMint"),
            bytes: new PublicKey(baseMint).toBase58(),
          },
        },
        {
          memcmp: {
            offset: layout.offsetOf("quoteMint"),
            bytes: new PublicKey(quoteMint).toBase58(),
          },
        },
      ],
    }
  );

  const baseMintIsBaseMintAccounts = await connection.getProgramAccounts(
    programId,
    {
      filters: [
        {
          memcmp: {
            offset: layout.offsetOf("quoteMint"),
            bytes: new PublicKey(baseMint).toBase58(),
          },
        },
        {
          memcmp: {
            offset: layout.offsetOf("baseMint"),
            bytes: new PublicKey(quoteMint).toBase58(),
          },
        },
      ],
    }
  );

  const combinedAccounts = [...quoteMintIsBaseMintAccounts];
  console.log("result", combinedAccounts);
  baseMintIsBaseMintAccounts.forEach((account) => {
    if (!combinedAccounts.some((acc) => acc.pubkey.equals(account.pubkey))) {
      combinedAccounts.push(account);
    }
  });

  return combinedAccounts;
};

const getProgramsAccounts = async (
  connection: Connection,
  baseMint: string,
  quoteMint: string
) => {
  const response = await Promise.all([
    getProgramAccounts(connection, baseMint, quoteMint),
    getProgramAccounts(connection, quoteMint, baseMint),
  ]);

  return response.filter((r) => r.length > 0)[0] || [];
};

export const getPoolKeysV2 = async (
  connection: Connection,
  baseMint: string,
  quoteMint: string
): Promise<LiquidityPoolKeys | undefined> => {
  const layout = LIQUIDITY_STATE_LAYOUT_V4;

  const programData = await getProgramsAccounts(
    connection,
    baseMint,
    quoteMint
  );
  console.log("programData", programData);
  const collectedPoolResults = programData
    .map((info: any) => ({
      id: new PublicKey(info.pubkey),
      version: 4,
      programId: new PublicKey(RAYDIUM_V4_PROGRAM_ID),
      ...layout.decode(info.account.data),
    }))
    .flat();

  const pool = collectedPoolResults[0];
  if (!pool) return null;

  const market = await connection
    .getAccountInfo(pool.marketId)
    .then((item: any) => ({
      programId: item.owner,
      ...MARKET_STATE_LAYOUT_V3.decode(item.data),
    }));

  const authority = Liquidity.getAssociatedAuthority({
    programId: new PublicKey(RAYDIUM_V4_PROGRAM_ID),
  }).publicKey;

  const marketProgramId = market.programId;

  const poolKeys = {
    id: pool.id,
    baseMint: pool.baseMint,
    quoteMint: pool.quoteMint,
    lpMint: pool.lpMint,
    baseDecimals: Number.parseInt(pool.baseDecimal.toString()),
    quoteDecimals: Number.parseInt(pool.quoteDecimal.toString()),
    lpDecimals: Number.parseInt(pool.baseDecimal.toString()),
    version: pool.version,
    programId: pool.programId,
    openOrders: pool.openOrders,
    targetOrders: pool.targetOrders,
    baseVault: pool.baseVault,
    quoteVault: pool.quoteVault,
    marketVersion: 3,
    authority: authority,
    marketProgramId,
    marketId: market.ownAddress,
    marketAuthority: Market.getAssociatedAuthority({
      programId: marketProgramId,
      marketId: market.ownAddress,
    }).publicKey,
    marketBaseVault: market.baseVault,
    marketQuoteVault: market.quoteVault,
    marketBids: market.bids,
    marketAsks: market.asks,
    marketEventQueue: market.eventQueue,
    withdrawQueue: pool.withdrawQueue,
    lpVault: pool.lpVault,
    lookupTableAccount: PublicKey.default,
  } as LiquidityPoolKeys;
  return poolKeys;
};

export const getSwapTransaction = async (
  connection: Connection,
  owner: PublicKey,
  amount: number,
  poolKeys: LiquidityPoolKeys,
  maxLamports: number = 100000,
  useVersionedTransaction = true,
  fixedSide: "in" | "out" = "in",
  slippage: number = 5
): Promise<Transaction | VersionedTransaction> => {
  const { minAmountOut, amountIn } = await calcAmountOut(
    connection,
    poolKeys,
    amount,
    slippage,
    fixedSide === "in"
  );

  const userTokenAccounts = await getTokenAccountsByOwner(connection, owner);
  const swapTransaction = await Liquidity.makeSwapInstructionSimple({
    connection: connection,
    makeTxVersion: useVersionedTransaction ? 0 : 1,
    poolKeys: {
      ...poolKeys,
    },
    userKeys: {
      tokenAccounts: userTokenAccounts,
      owner: owner,
    },
    amountIn: amountIn,
    amountOut: minAmountOut,
    fixedSide: fixedSide,
    config: {
      bypassAssociatedCheck: false,
    },
    computeBudgetConfig: {
      microLamports: maxLamports,
    },
  });

  const recentBlockhashForSwap = await connection.getLatestBlockhash();
  const instructions =
    swapTransaction.innerTransactions[0].instructions.filter(Boolean);

  if (useVersionedTransaction) {
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: owner,
        recentBlockhash: recentBlockhashForSwap.blockhash,
        instructions: instructions,
      }).compileToV0Message()
    );

    return versionedTransaction;
  }

  const legacyTransaction = new Transaction({
    blockhash: recentBlockhashForSwap.blockhash,
    lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
    feePayer: owner,
  });

  legacyTransaction.add(...instructions);

  return legacyTransaction;
};

export const calcAmountOut = async (
  connection: Connection,
  poolKeys: LiquidityPoolKeys,
  rawAmountIn: number,
  slippage: number = 5,
  swapInDirection: boolean = true
) => {
  swapInDirection = !swapInDirection;
  const poolInfo = await Liquidity.fetchInfo({
    connection: connection,
    poolKeys,
  });

  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolInfo.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolInfo.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolInfo.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolInfo.baseDecimals;
  }

  const currencyIn = new Token(
    TOKEN_PROGRAM_ID,
    currencyInMint,
    currencyInDecimals
  );
  const amountIn = new TokenAmount(
    currencyIn,
    rawAmountIn.toFixed(currencyInDecimals),
    false
  );
  const currencyOut = new Token(
    TOKEN_PROGRAM_ID,
    currencyOutMint,
    currencyOutDecimals
  );
  const slippageX = new Percent(slippage, 100); // 5% slippage

  const {
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage: slippageX,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
};
