import {
  ApiPoolInfo,
  ApiClmmPoolsItem,
  MAINNET_PROGRAM_ID,
  Clmm,
  PoolInfoLayout,
  AmmConfigLayout,
  AccountInfo,
  ApiClmmConfigItem,
  getMultipleAccountsInfoWithCustomFlags,
  ApiClmmPoolsItemStatistics,
  ApiPoolInfoV4,
  LIQUIDITY_STATE_LAYOUT_V4,
  Liquidity,
  MARKET_STATE_LAYOUT_V3,
  Market,
  TradeV2,
  Token,
  TokenAmount,
  fetchMultipleMintInfos,
  TxVersion,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  ClmmPoolInfo,
  CurrencyAmount,
} from "@raydium-io/raydium-sdk";

import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

import {
  SendOptions,
  Signer,
  AddressLookupTableAccount,
} from "@solana/web3.js";

import BN from "bn.js";
import { Decimal } from "decimal.js";

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  GetProgramAccountsResponse,
} from "@solana/web3.js";

const PROGRAMIDS = MAINNET_PROGRAM_ID;
console.log(PROGRAMIDS);
const POOL_ID = "GxnkK5rRftBkHbZu5rJnELnLaic2GSbbpeWcRKNKJqst";
export const BASE_MINT_TOKEN = "So11111111111111111111111111111111111111112";
export const QUOTE_MINT_TOKEN = "J2yWgVXwq2EzCnmac4irUmDctcSg7aoDAj7KfxH4zMyM";

async function getMintProgram(connection: Connection, mint: PublicKey) {
  const account = await connection.getAccountInfo(mint);
  if (account === null) throw Error(" get id info error ");
  return account.owner;
}

async function getConfigInfo(
  connection: Connection,
  configId: PublicKey
): Promise<ApiClmmConfigItem> {
  const account = await connection.getAccountInfo(configId);
  if (account === null) throw Error(" get id info error ");
  return formatConfigInfo(configId, account);
}

export async function formatClmmKeysById(
  connection: Connection,
  id: string
): Promise<ApiClmmPoolsItem> {
  const account = await connection.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error(" get id info error ");
  const info = PoolInfoLayout.decode(account.data);

  return {
    id,
    mintProgramIdA: (await getMintProgram(connection, info.mintA)).toString(),
    mintProgramIdB: (await getMintProgram(connection, info.mintB)).toString(),
    mintA: info.mintA.toString(),
    mintB: info.mintB.toString(),
    vaultA: info.vaultA.toString(),
    vaultB: info.vaultB.toString(),
    mintDecimalsA: info.mintDecimalsA,
    mintDecimalsB: info.mintDecimalsB,
    ammConfig: await getConfigInfo(connection, info.ammConfig),
    rewardInfos: await Promise.all(
      info.rewardInfos
        .filter((i: any) => !i.tokenMint.equals(PublicKey.default))
        .map(async (i: any) => ({
          mint: i.tokenMint.toString(),
          programId: (await getMintProgram(connection, i.tokenMint)).toString(),
        }))
    ),
    tvl: 0,
    day: getApiClmmPoolsItemStatisticsDefault(),
    week: getApiClmmPoolsItemStatisticsDefault(),
    month: getApiClmmPoolsItemStatisticsDefault(),
    lookupTableAccount: PublicKey.default.toBase58(),
  };
}

export async function getPoolInfo(
  connection: Connection,
  owner: PublicKey
): Promise<ClmmPoolInfo> {
  const clmmPools: ApiClmmPoolsItem[] = [
    await formatClmmKeysById(connection, POOL_ID),
  ];
  const { [POOL_ID]: poolInfo } = await Clmm.fetchMultiplePoolInfos({
    connection,
    poolKeys: clmmPools,
    chainTime: new Date().getTime() / 1000,
  });

  if (!poolInfo) {
    throw new Error("Failed to fetch pool info");
  }

  return poolInfo.state;
}

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

export function estimateOutputAmount(
  inputTokenAmount: number,
  poolInfo: any,
  isBuying: boolean
): number {
  let outputAmount;
  if (isBuying) {
    outputAmount = poolInfo.currentPrice.toNumber() * inputTokenAmount;
  } else {
    outputAmount = inputTokenAmount / poolInfo.currentPrice.toNumber();
  }
  return outputAmount;
}

function formatConfigInfo(
  id: PublicKey,
  account: AccountInfo<Buffer>
): ApiClmmConfigItem {
  const info = AmmConfigLayout.decode(account.data);

  return {
    id: id.toBase58(),
    index: info.index,
    protocolFeeRate: info.protocolFeeRate,
    tradeFeeRate: info.tradeFeeRate,
    tickSpacing: info.tickSpacing,
    fundFeeRate: info.fundFeeRate,
    fundOwner: info.fundOwner.toString(),
    description: "",
  };
}

export async function formatClmmConfigs(
  connection: Connection,
  programId: string
) {
  const configAccountInfo = await connection.getProgramAccounts(
    new PublicKey(programId),
    { filters: [{ dataSize: AmmConfigLayout.span }] }
  );
  return configAccountInfo
    .map((i) => formatConfigInfo(i.pubkey, i.account))
    .reduce((a, b) => {
      a[b.id] = b;
      return a;
    }, {} as { [id: string]: ApiClmmConfigItem });
}

export function getApiClmmPoolsItemStatisticsDefault(): ApiClmmPoolsItemStatistics {
  return {
    volume: 0,
    volumeFee: 0,
    feeA: 0,
    feeB: 0,
    feeApr: 0,
    rewardApr: { A: 0, B: 0, C: 0 },
    apr: 0,
    priceMin: 0,
    priceMax: 0,
  };
}

export async function formatClmmKeys(
  connection: Connection,
  programId: string,
  findLookupTableAddress: boolean = false
): Promise<ApiClmmPoolsItem[]> {
  const filterDefKey = PublicKey.default.toString();
  const quoteTokenPubkey = new PublicKey(QUOTE_MINT_TOKEN);

  const poolAccountInfo = await connection.getProgramAccounts(
    new PublicKey(programId),
    { filters: [{ dataSize: PoolInfoLayout.span }] }
  );
  const configIdToData = await formatClmmConfigs(connection, programId);

  const poolAccountFormat = poolAccountInfo
    .map((i) => ({
      id: i.pubkey,
      ...PoolInfoLayout.decode(i.account.data),
    }))
    .filter((account: any) => {
      return (
        account.mintA.equals(quoteTokenPubkey) ||
        account.mintB.equals(quoteTokenPubkey)
      );
    });
  console.log("poolAccountInfo", poolAccountFormat);

  // const allMint = [
  //   ...new Set<string>(
  //     poolAccountFormat
  //       .map((i: any) => [
  //         i.mintA.toString(),
  //         i.mintB.toString(),
  //         ...i.rewardInfos.map((ii) => ii.tokenMint.toString()),
  //       ])
  //       .flat()
  //   ),
  // ]
  const allMint = Array.from(
    new Set(
      poolAccountFormat.flatMap((i) => [
        i.mintA.toString(),
        i.mintB.toString(),
        ...i.rewardInfos.map((ii: any) => ii.tokenMint.toString()),
      ])
    )
  )
    .filter((i) => i !== filterDefKey)
    .map((i) => ({ pubkey: new PublicKey(i) }));
  const mintAccount = await getMultipleAccountsInfoWithCustomFlags(
    connection,
    allMint
  );
  const mintInfoDict = mintAccount
    .filter((i: any) => i.accountInfo !== null)
    .reduce((a: any, b: any) => {
      a[b.pubkey.toString()] = { programId: b.accountInfo!.owner.toString() };
      return a;
    }, {} as { [mint: string]: { programId: string } });

  const poolInfoDict = poolAccountFormat
    .map((i) => {
      const mintProgramIdA = mintInfoDict[i.mintA.toString()].programId;
      const mintProgramIdB = mintInfoDict[i.mintB.toString()].programId;
      const rewardInfos = i.rewardInfos
        .filter((i: any) => !i.tokenMint.equals(PublicKey.default))
        .map((i: any) => ({
          mint: i.tokenMint.toString(),
          programId: mintInfoDict[i.tokenMint.toString()].programId,
        }));

      return {
        id: i.id.toString(),
        mintProgramIdA,
        mintProgramIdB,
        mintA: i.mintA.toString(),
        mintB: i.mintB.toString(),
        vaultA: i.vaultA.toString(),
        vaultB: i.vaultB.toString(),
        mintDecimalsA: i.mintDecimalsA,
        mintDecimalsB: i.mintDecimalsB,
        ammConfig: configIdToData[i.ammConfig.toString()],
        rewardInfos,
        tvl: 0,
        day: getApiClmmPoolsItemStatisticsDefault(),
        week: getApiClmmPoolsItemStatisticsDefault(),
        month: getApiClmmPoolsItemStatisticsDefault(),
        lookupTableAccount: PublicKey.default.toBase58(),
      };
    })
    .reduce((a: any, b: any) => {
      a[b.id] = b;
      return a;
    }, {} as { [id: string]: ApiClmmPoolsItem });

  if (findLookupTableAddress) {
    const ltas = await connection.getProgramAccounts(
      new PublicKey("AddressLookupTab1e1111111111111111111111111"),
      {
        filters: [
          {
            memcmp: {
              offset: 22,
              bytes: "RayZuc5vEK174xfgNFdD9YADqbbwbFjVjY4NM8itSF9",
            },
          },
        ],
      }
    );
    for (const itemLTA of ltas) {
      const keyStr = itemLTA.pubkey.toString();
      const ltaForamt = new AddressLookupTableAccount({
        key: itemLTA.pubkey,
        state: AddressLookupTableAccount.deserialize(itemLTA.account.data),
      });
      for (const itemKey of ltaForamt.state.addresses) {
        const itemKeyStr = itemKey.toString();
        if (poolInfoDict[itemKeyStr] === undefined) continue;
        poolInfoDict[itemKeyStr].lookupTableAccount = keyStr;
      }
    }
  }

  return Object.values(poolInfoDict);
}

export async function formatAmmKeys(
  connection: Connection,
  programId: string,
  findLookupTableAddress: boolean = false
): Promise<ApiPoolInfoV4[]> {
  const filterDefKey = PublicKey.default.toString();
  const allAmmAccount = await connection.getProgramAccounts(
    new PublicKey(programId),
    { filters: [{ dataSize: LIQUIDITY_STATE_LAYOUT_V4.span }] }
  );
  const amAccountmData = allAmmAccount
    .map((i) => ({
      id: i.pubkey,
      programId: i.account.owner,
      ...LIQUIDITY_STATE_LAYOUT_V4.decode(i.account.data),
    }))
    .filter((i) => i.marketProgramId.toString() !== filterDefKey);

  const allMarketProgram = new Set<string>(
    amAccountmData.map((i) => i.marketProgramId.toString())
  );

  const marketInfo: {
    [marketId: string]: {
      marketProgramId: string;
      marketAuthority: string;
      marketBaseVault: string;
      marketQuoteVault: string;
      marketBids: string;
      marketAsks: string;
      marketEventQueue: string;
    };
  } = {};
  for (const itemMarketProgram of Array.from(allMarketProgram)) {
    const allMarketInfo = await connection.getProgramAccounts(
      new PublicKey(itemMarketProgram),
      { filters: [{ dataSize: MARKET_STATE_LAYOUT_V3.span }] }
    );
    for (const itemAccount of allMarketInfo) {
      const itemMarketInfo = MARKET_STATE_LAYOUT_V3.decode(
        itemAccount.account.data
      );
      marketInfo[itemAccount.pubkey.toString()] = {
        marketProgramId: itemAccount.account.owner.toString(),
        marketAuthority: Market.getAssociatedAuthority({
          programId: itemAccount.account.owner,
          marketId: itemAccount.pubkey,
        }).publicKey.toString(),
        marketBaseVault: itemMarketInfo.baseVault.toString(),
        marketQuoteVault: itemMarketInfo.quoteVault.toString(),
        marketBids: itemMarketInfo.bids.toString(),
        marketAsks: itemMarketInfo.asks.toString(),
        marketEventQueue: itemMarketInfo.eventQueue.toString(),
      };
    }
  }

  const ammFormatData = (
    amAccountmData
      .map((itemAmm) => {
        const itemMarket = marketInfo[itemAmm.marketId.toString()];
        if (itemMarket === undefined) return undefined;

        const format: ApiPoolInfoV4 = {
          id: itemAmm.id.toString(),
          baseMint: itemAmm.baseMint.toString(),
          quoteMint: itemAmm.quoteMint.toString(),
          lpMint: itemAmm.lpMint.toString(),
          baseDecimals: itemAmm.baseDecimal.toNumber(),
          quoteDecimals: itemAmm.quoteDecimal.toNumber(),
          lpDecimals: itemAmm.baseDecimal.toNumber(),
          version: 4,
          programId: itemAmm.programId.toString(),
          authority: Liquidity.getAssociatedAuthority({
            programId: itemAmm.programId,
          }).publicKey.toString(),
          openOrders: itemAmm.openOrders.toString(),
          targetOrders: itemAmm.targetOrders.toString(),
          baseVault: itemAmm.baseVault.toString(),
          quoteVault: itemAmm.quoteVault.toString(),
          withdrawQueue: itemAmm.withdrawQueue.toString(),
          lpVault: itemAmm.lpVault.toString(),
          marketVersion: 3,
          marketId: itemAmm.marketId.toString(),
          ...itemMarket,
          lookupTableAccount: filterDefKey,
        };
        return format;
      })
      .filter((i) => i !== undefined) as ApiPoolInfoV4[]
  ).reduce((a, b) => {
    a[b.id] = b;
    return a;
  }, {} as { [id: string]: ApiPoolInfoV4 });

  if (findLookupTableAddress) {
    const ltas = await connection.getProgramAccounts(
      new PublicKey("AddressLookupTab1e1111111111111111111111111"),
      {
        filters: [
          {
            memcmp: {
              offset: 22,
              bytes: "RayZuc5vEK174xfgNFdD9YADqbbwbFjVjY4NM8itSF9",
            },
          },
        ],
      }
    );
    for (const itemLTA of ltas) {
      const keyStr = itemLTA.pubkey.toString();
      const ltaForamt = new AddressLookupTableAccount({
        key: itemLTA.pubkey,
        state: AddressLookupTableAccount.deserialize(itemLTA.account.data),
      });
      for (const itemKey of ltaForamt.state.addresses) {
        const itemKeyStr = itemKey.toString();
        if (ammFormatData[itemKeyStr] === undefined) continue;
        ammFormatData[itemKeyStr].lookupTableAccount = keyStr;
      }
    }
  }

  return Object.values(ammFormatData);
}

export async function formatAmmKeysToApi(
  connection: Connection,
  programId: string,
  findLookupTableAddress: boolean = false
): Promise<ApiPoolInfo> {
  return {
    official: [],
    unOfficial: await formatAmmKeys(
      connection,
      programId,
      findLookupTableAddress
    ),
  };
}

export const fetchPoolInfo = async (connection: Connection) => {
  const clmmPools: ApiClmmPoolsItem[] = await formatClmmKeys(
    connection,
    PROGRAMIDS.CLMM.toString()
  ); // If the clmm pool is not required for routing, then this variable can be configured as undefined
  const clmmList = Object.values(
    await Clmm.fetchMultiplePoolInfos({
      connection,
      poolKeys: clmmPools,
      chainTime: new Date().getTime() / 1000,
    })
  ).map((i: any) => i.state);

  const sPool: ApiPoolInfo = undefined; // If the Liquidity pool is not required for routing, then this variable can be configured as undefined

  return { sPool, clmmList, clmmPools };
};

const getAllRoute = (
  inputToken: Token,
  outputToken: Token,
  sPool: ApiPoolInfo,
  clmmList: any
) => {
  const getRoute = TradeV2.getAllRoute({
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    apiPoolList: sPool,
    clmmList,
  });

  return getRoute;
};

const getTokenAccounts = async (connection: Connection, owner: PublicKey) => {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  const tokenAccounts = walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));

  const solAccountInfo = await connection.getAccountInfo(owner);

  tokenAccounts.push({
    pubkey: owner,
    programId: TOKEN_PROGRAM_ID,
    accountInfo: { mint: new PublicKey(BASE_MINT_TOKEN), owner: owner },
  });
  return tokenAccounts;
};

export const getDecimalFromMintAddress = async (
  poolInfo: any,
  mintAddress: PublicKey
) => {
  console.log(poolInfo);
  return poolInfo.mintA.mint.equals(mintAddress)
    ? poolInfo.mintA.decimals
    : poolInfo.mintB.decimals;
};

export const createInstruction = async (
  connection: Connection,
  owner: PublicKey,
  poolInfo: any,
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  useVersionedTransaction = true
) => {
  const inputToken = new Token(
    TOKEN_PROGRAM_ID,
    inputMint,
    await getDecimalFromMintAddress(poolInfo, new PublicKey(inputMint))
  );
  const outputToken = new Token(
    TOKEN_PROGRAM_ID,
    outputMint,
    await getDecimalFromMintAddress(poolInfo, new PublicKey(outputMint))
  );
  const inputTokenAmount = new (
    inputMint === BASE_MINT_TOKEN ? CurrencyAmount : TokenAmount
  )(
    inputToken,
    Math.ceil(inputAmount * 10 ** inputToken.decimals)
    // await getDecimalFromMintAddress(new PublicKey(inputMint))
  );
  // const inputTokenAmount = new Token(
  //   TOKEN_PROGRAM_ID,
  //   inputMint,
  //   await getDecimalFromMintAddress(poolInfo, new PublicKey(inputMint))
  // );

  const slippage = new Percent(0, 100);
  const feeConfig = undefined;
  // console.log(inputTokenAmount.raw.toString(), inputToken, outputToken);

  const { clmmList, sPool, clmmPools } = await fetchPoolInfo(connection);
  console.log("clmmList:", clmmList);
  console.log("sPool:", sPool);
  console.log("clmmPools:", clmmPools);

  const getRoute = getAllRoute(inputToken, outputToken, sPool, clmmList);
  console.log("getRoute:", getRoute);

  const [tickCache, poolInfosCache] = await Promise.all([
    await Clmm.fetchMultiplePoolTickArrays({
      connection,
      poolKeys: getRoute.needTickArray,
      batchRequest: true,
    }),
    await TradeV2.fetchMultipleInfo({
      connection,
      pools: getRoute.needSimulate,
      batchRequest: true,
    }),
  ]);
  console.log("tickCache:", tickCache);
  console.log("poolInfosCache:", poolInfosCache);

  const paramsRouteInfo = {
    inputTokenAmount: inputTokenAmount,
    outputToken: outputToken,
    directPath: getRoute.directPath,
    routePathDict: getRoute.routePathDict,
    simulateCache: poolInfosCache,
    tickCache,
    slippage: slippage,
    chainTime: new Date().getTime() / 1000, // this chain time

    feeConfig: feeConfig,

    mintInfos: await fetchMultipleMintInfos({
      connection,
      mints: [
        ...clmmPools
          .map((i: any) => [
            { mint: i.mintA, program: i.mintProgramIdA },
            { mint: i.mintB, program: i.mintProgramIdB },
          ])
          .flat()
          // .filter((i: any) => i.program === TOKEN_2022_PROGRAM_ID.toString())
          .map((i: any) => new PublicKey(i.mint)),
      ],
    }),

    epochInfo: await connection.getEpochInfo(),
  };
  console.log("epochInfo:", await connection.getEpochInfo());
  console.log("paramsRouteInfo", paramsRouteInfo);
  const swapInfo = TradeV2.getAllRouteComputeAmountOut(paramsRouteInfo);

  const tokenAccounts = await getTokenAccounts(connection, owner);
  console.log("swapInfo", swapInfo);
  console.log(
    swapInfo[0].amountIn.amount,
    swapInfo[0].amountIn.amount.raw.toString()
  );
  console.log("tokenAccounts", tokenAccounts);
  const swapTransaction = await TradeV2.makeSwapInstructionSimple({
    routeProgram: PROGRAMIDS.Router,
    connection,
    swapInfo: swapInfo[0],
    ownerInfo: {
      wallet: owner,
      tokenAccounts: tokenAccounts,
      associatedOnly: true, //true pour dbi -> sol
      checkCreateATAOwner: true,
    },

    // computeBudgetConfig: {
    //   // if you want add compute instruction
    //   units: 400000, // compute instruction
    //   microLamports: 1, // fee add 1 * 400000 / 10 ** 9 SOL
    // },
    makeTxVersion: TxVersion.V0,
  });

  const recentBlockhashForSwap = await connection.getLatestBlockhash();
  const instructions = swapTransaction.innerTransactions[0].instructions;

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
