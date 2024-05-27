import {
  ApiClmmPoolsItemStatistics,
  TokenAccount,
  SPL_ACCOUNT_LAYOUT,
  PoolInfoLayout,
  ClmmPoolInfo,
  findProgramAddress,
  Clmm,
  ApiClmmPoolsItem,
  AccountInfo,
  ApiClmmConfigItem,
  AmmConfigLayout,
  TokenAmount,
  Percent,
  Token,
  fetchMultipleMintInfos,
  InnerSimpleV0Transaction,
  buildSimpleTransaction,
  TxVersion,
} from "@raydium-io/raydium-sdk";

import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

import { SendOptions, Signer } from "@solana/web3.js";

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

async function getMintProgram(connection: Connection, mint: PublicKey) {
  const account = await connection.getAccountInfo(mint);
  if (account === null) throw Error(" get id info error ");
  return account.owner;
}

export function formatConfigInfo(
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
const POOL_ID = "VUx83xFX3LhmrhbFWxAtTdAuQKuEJk1r2qq1edj7d6p";

export function estimateOutputAmount(
  inputTokenAmount: number,
  poolInfo: ClmmPoolInfo,
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

export async function fetchPoolInfo(
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
  // const programId = new PublicKey(TOKEN_PROGRAM_ID);
  // // Deserialize pool info (implement the deserialization based on the pool structure)
  // const poolKeys = deserializePoolInfo(accountInfo.data);
  // poolKeys.id = poolId;
  // poolKeys.mintProgramIdA = programId;
  // poolKeys.mintProgramIdB = programId;
  // poolKeys.ammConfig = { id: poolKeys.ammConfig };

  // const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
  //   owner,
  //   {
  //     programId: TOKEN_PROGRAM_ID,
  //   }
  // );
  // console.log(tokenAccountsResponse);
  // const tokenAccounts: TokenAccount[] = tokenAccountsResponse.value.map(
  //   (accountInfo) => ({
  //     pubkey: accountInfo.pubkey,
  //     account: accountInfo.account.data.parsed.info,
  //     amount: accountInfo.account.data.parsed.info.tokenAmount.amount,
  //     mint: new PublicKey(accountInfo.account.data.parsed.info.mint),
  //     accountInfo: {
  //       mint: new PublicKey(accountInfo.account.data.parsed.info.mint),
  //     },
  //   })
  // );

  // console.log(tokenAccounts);
  // const slot = await connection.getSlot();
  // const blockTime = await connection.getBlockTime(slot);

  // if (blockTime === null) {
  //   throw new Error("Unable to fetch block time");
  // }

  // const chainTime = blockTime * 1000; // Convert to milliseconds

  // const infos = {
  //   connection,
  //   poolKeys: [poolKeys],
  //   // ownerInfo: { wallet: owner, tokenAccounts: tokenAccounts },
  //   chainTime,
  // };
  // console.log("infos", infos);
  // const poolInfo = await Clmm.fetchMultiplePoolInfos(infos);
  // console.log("poolInfo", poolInfo);
  // return poolInfo[POOL_ID].state;
  return poolInfo.state;
}

async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

function convertFromSmallestUnit(amountInSmallestUnit: any, decimals: any) {
  // Ensure amountInSmallestUnit is an instance of BN
  if (!BN.isBN(amountInSmallestUnit)) {
    throw new Error("amountInSmallestUnit must be an instance of BN");
  }

  // Convert to string and perform division to get the floating-point representation
  const factor = new BN(10).pow(new BN(decimals));
  const amountInToken =
    amountInSmallestUnit.div(factor).toNumber() +
    amountInSmallestUnit.mod(factor).toNumber() / Math.pow(10, decimals);

  return amountInToken;
}

export async function sendTx(
  connection: Connection,
  payer: Keypair | Signer,
  txs: (VersionedTransaction | Transaction)[],
  options?: SendOptions
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}

export async function buildAndSendTx(
  connection: Connection,
  owner: PublicKey,
  innerSimpleV0Transaction: InnerSimpleV0Transaction[]
) {
  const willSendTx = await buildSimpleTransaction({
    makeTxVersion: TxVersion.V0,
    payer: owner,
    connection,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: undefined,
  });

  return willSendTx;
}

export async function createSwap(
  connection: Connection,
  poolInfo: ClmmPoolInfo,
  owner: PublicKey,
  tokenA: string,
  tokenB: string,
  amountIn: number,
  amountOut: number,
  useVersionedTransaction: boolean = true
) {
  const clmmPools: ApiClmmPoolsItem[] = [
    await formatClmmKeysById(connection, POOL_ID),
  ];
  const mintInfoInput = await getMint(connection, new PublicKey(tokenA));
  const mintInfoOutput = await getMint(connection, new PublicKey(tokenA));
  const inputToken = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey(tokenA),
    mintInfoInput.decimals
  );
  const outputToken = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey(tokenB),
    mintInfoOutput.decimals
  );
  const inputTokenAmount = new TokenAmount(
    inputToken,
    new BN(amountIn * Math.pow(10, mintInfoInput.decimals)).toString()
  );
  console.log(inputToken, inputTokenAmount.raw.toString());
  const tickCache = await Clmm.fetchMultiplePoolTickArrays({
    connection,
    poolKeys: [poolInfo],
    batchRequest: true,
  });
  // const amountInTest = inputTokenAmount;
  const { minAmountOut, remainingAccounts } = Clmm.computeAmountOutFormat({
    poolInfo: poolInfo,
    tickArrayCache: tickCache[POOL_ID],
    amountIn: inputTokenAmount,
    currencyOut: outputToken,
    slippage: new Percent(1, 100),
    epochInfo: await connection.getEpochInfo(),
    token2022Infos: await fetchMultipleMintInfos({
      connection,
      mints: [
        ...clmmPools
          .map((i: any) => [
            { mint: i.mintA, program: i.mintProgramIdA },
            { mint: i.mintB, program: i.mintProgramIdB },
          ])
          .flat()
          .filter((i: any) => i.program === TOKEN_2022_PROGRAM_ID.toString())
          .map((i: any) => new PublicKey(i.mint)),
      ],
    }),
    catchLiquidityInsufficient: false,
  });
  console.log("minAmountOut", minAmountOut.amount.raw.toString());
  console.log("remainingAccounts", remainingAccounts);

  // const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
  //   owner,
  //   {
  //     programId: TOKEN_PROGRAM_ID,
  //   }
  // );
  // const tokenAccounts: TokenAccount[] = tokenAccountsResponse.value.map(
  //   (accountInfo) => ({
  //     pubkey: accountInfo.pubkey,
  //     programId: new PublicKey(TOKEN_PROGRAM_ID),
  //     accountInfo: {
  //       mint: new PublicKey(accountInfo.account.data.parsed.info.mint),
  //       owner: new PublicKey(accountInfo.account.data.parsed.info.owner),
  //     },
  //   })
  // );

  // const params = {
  //   connection,
  //   poolInfo,
  //   ownerInfo: {
  //     feePayer: ownerPublicKey,
  //     wallet: ownerPublicKey,
  //     tokenAccounts: tokenAccounts,
  //   },
  //   inputMint: inputToken,
  //   amountIn: new BN(amountIn).raw,
  //   amountOutMin: new BN(amountOut).raw,
  //   remainingAccounts: tokenAccounts,
  //   // associatedOnly: true,
  // checkCreateATAOwner: false,
  // config: {
  //   bypassAssociatedCheck: false,
  // },
  // computeBudgetConfig: {
  //   microLamports: 100000,
  // }, // Add this line
  //   makeTXVersion: "V0",
  // };

  // const params = {
  //   connection,
  //   poolInfo,
  //   ownerInfo: {
  //     feePayer: ownerPublicKey,
  //     wallet: ownerPublicKey,
  //     tokenAccounts: tokenAccounts,
  //     useSOLBalance: true,
  //   },
  //   inputMint: inputToken,
  //   amountIn: new BN(amountIn),
  //   amountOutMin: new BN(1100),
  //   priceLimit: undefined,
  //   remainingAccounts: [],
  //   associatedOnly: true,
  //   checkCreateATAOwner: false,
  //   undefined,
  //   computeBudgetConfig: undefined, // Add this line
  //   makeTXVersion: "V0",
  // };

  const tokenAccounts = (await getWalletTokenAccount(connection, owner)).filter(
    (account: any) => {
      return (
        account.accountInfo.mint.equals(inputToken.mint) ||
        account.accountInfo.mint.equals(outputToken.mint)
      );
    }
  );
  console.log(inputTokenAmount, minAmountOut);
  const it = convertFromSmallestUnit(
    inputTokenAmount.raw,
    mintInfoInput.decimals
  );
  const ot = convertFromSmallestUnit(
    minAmountOut.amount.raw,
    mintInfoOutput.decimals
  );
  console.log("it, ot", it, ot, TxVersion.V0);
  const params = {
    connection,
    poolInfo: poolInfo,
    ownerInfo: {
      feePayer: owner,
      wallet: owner,
      tokenAccounts: [],
    },
    inputMint: inputTokenAmount.token.mint,
    amountIn: it,
    amountOutMin: ot,
    remainingAccounts: remainingAccounts,
    makeTxVersion: "V0",
  };
  console.log("inputToken", inputTokenAmount.raw.toString());
  console.log("params", params);
  const { innerTransactions } = await Clmm.makeSwapBaseInInstructionSimple(
    params
  );
  console.log(innerTransactions);
  // const recentBlockhashForSwap = await connection.getLatestBlockhash();
  // const instructions =
  //   swapTransaction.innerTransactions[0].instructions.filter(Boolean);

  // if (useVersionedTransaction) {
  //   const versionedTransaction = new VersionedTransaction(
  //     new TransactionMessage({
  //       payerKey: owner,
  //       recentBlockhash: recentBlockhashForSwap.blockhash,
  //       instructions: instructions,
  //     }).compileToV0Message()
  //   );

  //   return versionedTransaction;
  // }

  // const legacyTransaction = new Transaction({
  //   blockhash: recentBlockhashForSwap.blockhash,
  //   lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
  //   feePayer: owner,
  // });

  // legacyTransaction.add(...instructions);

  // return legacyTransaction;

  return await buildAndSendTx(connection, owner, innerTransactions);
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
