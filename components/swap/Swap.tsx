import React, {
  ChangeEvent,
  ComponentPropsWithoutRef,
  MouseEventHandler,
  useState,
} from "react";
import { IoSettingsSharp } from "react-icons/io5";
import { CgArrowsExchangeV } from "react-icons/cg";
import { Button } from "../ui/button";
import Image from "next/image";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
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
  PoolInfoLayout,
  MARKET_STATE_LAYOUT_V3,
  Market,
  ClmmPoolInfo,
} from "@raydium-io/raydium-sdk";
import Modal from "@mui/material/Modal";
import {
  BASE_MINT_TOKEN,
  QUOTE_MINT_TOKEN,
  createInstruction,
  estimateOutputAmount,
  fetchPoolInfo,
  getPoolInfo,
  getTokenAccountsByOwner,
} from "@/lib/swap-utils";

const AmoutShorcut = ({
  label,
  percentage,
  onClick,
}: {
  label: string;
  percentage: number;
  onClick: Function;
}) => {
  return (
    <div
      onClick={() => onClick(percentage)}
      className="cursor-pointer px-2 py-0.5 bg-red-400 rounded-xl text-xs text-gray-100"
    >
      {label}
    </div>
  );
};
const InputSwap = (
  props: ComponentPropsWithoutRef<"div"> & {
    logo: string;
    isInput: boolean;
    balance: number | null;
    setValue?: Function;
    value?: number | null;
  }
) => {
  const [inputValue, setInputValue] = useState<string>("");
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!props.setValue) return;
    const { value } = event.target;
    // Allow numbers and one decimal point only

    if ((isNaN(Number(value)) || isNaN(parseFloat(value))) && value !== "")
      return;
    setInputValue(value);
    props.setValue(Number(value) || 0);
  };

  const handleClickShortcut = (percentage: number) => {
    if (!props.setValue || !props.balance) return;
    let newValue = (percentage / 100) * props.balance;
    props.setValue(newValue);
    setInputValue(newValue.toString());
  };

  return (
    <div className={`${props?.className || ""} rounded-md px-2 py-2 min-w-max`}>
      <div className="flex flex-row justify-between py-1">
        <label className="text-sm text-white">
          {props.isInput ? "From" : "To"}
        </label>
        {props.isInput && props.setValue ? (
          <div className="flex flex-row gap-3 items-center">
            <AmoutShorcut
              label={"25%"}
              percentage={25}
              onClick={handleClickShortcut}
            />
            <AmoutShorcut
              label={"50%"}
              percentage={50}
              onClick={handleClickShortcut}
            />
            <AmoutShorcut
              label={"MAX"}
              percentage={100}
              onClick={handleClickShortcut}
            />
          </div>
        ) : (
          ""
        )}
      </div>
      <div className="flex flex-row justify-between text-white items-end">
        {props.isInput ? (
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            className="flex-1 placeholder-white caret-white bg-inherit text-4xl focus:outline-none"
            placeholder="Enter amount"
          />
        ) : (
          <input
            disabled
            type="text"
            value={props?.value?.toString()}
            className="flex-1 placeholder-white caret-white bg-inherit text-4xl focus:outline-none"
            placeholder="0"
          />
        )}
        <Image
          width={500}
          height={500}
          className="mx-2 w-8 h-8 rounded-full"
          src={props.logo}
          alt="Don't buy it pls"
        />
      </div>
      <span className="ms-auto text-sm text-gray-200">
        Balance : {props.balance}
      </span>
    </div>
  );
};
const Swap = () => {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [poolKeys, setPoolKeys] = useState<ClmmPoolInfo>();
  const [exchangeRate, setExchangeRate] = useState<string>("");
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);

  const [isBuying, setIsBuying] = React.useState<boolean>(true);

  const [balanceA, setBalanceA] = React.useState<number | null>(null);
  const [balanceB, setBalanceB] = React.useState<number | null>(null);

  const [valueA, setValueA] = React.useState<number | null>();
  const [valueB, setValueB] = React.useState<number>(0);

  const [open, setOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const RAYDIUM_LIQUIDITY_JSON =
    "https://api.raydium.io/v2/sdk/liquidity/mainnet.json";

  const handleSwap: MouseEventHandler<HTMLButtonElement> = async () => {
    if (poolKeys && publicKey && signTransaction && connection) {
      setLoading(true);
      try {
        const transaction = await createInstruction(
          connection,
          publicKey,
          poolKeys,
          isBuying ? BASE_MINT_TOKEN : QUOTE_MINT_TOKEN,
          isBuying ? QUOTE_MINT_TOKEN : BASE_MINT_TOKEN,
          valueA || 0
        );

        const signedTransaction = await signTransaction(transaction);
        const txid = await sendTransaction(signedTransaction, connection, {
          skipPreflight: true,
        });
        setLoading(true);
      } catch (err: any) {
        console.error("tx failed => ", err);
      }
      setLoading(false);
      setOpen(false);
    }
  };

  React.useEffect(() => {
    if (!publicKey) return;

    // Get the pool token of our token
    getPoolInfo(connection, publicKey).then((poolInfo: ClmmPoolInfo) => {
      console.log("poolKeys", poolInfo);
      setPoolKeys(poolInfo);
    });

    // Get solana balance
    connection.getBalance(publicKey).then((balance) => {
      const realBalance = balance / LAMPORTS_PER_SOL;
      if (isBuying) {
        setBalanceA(realBalance);
      } else {
        setBalanceB(realBalance);
      }
    });

    getTokenAccountsByOwner(connection, publicKey).then(async (tokens) => {
      const mintAddress = new PublicKey(QUOTE_MINT_TOKEN);
      const quoteToken = tokens.filter((token) =>
        token.accountInfo.mint.equals(mintAddress)
      )?.[0];
      // Get decimals
      const decimals =
        (await connection.getTokenAccountBalance(quoteToken.pubkey)).value
          .decimals || 1;
      const amount = quoteToken.accountInfo.amount.toNumber() / 10 ** decimals;
      if (isBuying) {
        setBalanceB(amount);
      } else {
        setBalanceA(amount);
      }
    });
  }, [publicKey, connection, isBuying]);

  React.useEffect(() => {
    // update estimated output

    if (poolKeys) {
      const calculatedOutput: number = estimateOutputAmount(
        valueA || 0,
        poolKeys,
        isBuying
      );
      setValueB(calculatedOutput);
    }
  }, [valueA]);

  return (
    <>
      <div className="bg-red-200 w-6/12 ms-auto me-auto rounded-md p-2 min-w-max">
        {/* <div className="flex flex-row justify-end py-1">
          <IoSettingsSharp className="w-6 h-6" />
        </div> */}
        <div>
          <InputSwap
            className="bg-red-500"
            logo={
              isBuying
                ? "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png"
                : "https://pink-bright-bonobo-930.mypinata.cloud/ipfs/Qmda8MCUFypeyFsBd2bgCbMN4eYugkK5cWoMxeghpH6Ceq"
            }
            balance={balanceA}
            isInput={true}
            setValue={setValueA}
          />
          <div className="relative h-0.5">
            <div
              onClick={() => setIsBuying((state) => !state)}
              className="absolute cursor-pointer inset-x-2/4 -translate-y-1/2 -translate-x-1/2"
            >
              <CgArrowsExchangeV className="w-8 h-8 bg-red-300 rounded-md" />
            </div>
          </div>
          <InputSwap
            className="bg-red-800"
            logo={
              isBuying
                ? "https://pink-bright-bonobo-930.mypinata.cloud/ipfs/Qmda8MCUFypeyFsBd2bgCbMN4eYugkK5cWoMxeghpH6Ceq"
                : "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png"
            }
            balance={balanceB}
            isInput={false}
            value={valueB}
          />
        </div>
        <Button
          disabled={(valueA || 0) === 0 || !publicKey}
          onClick={handleOpen}
          className="mt-1 w-full inline-flex h-10 items-center justify-center rounded-md bg-[#C62828] px-6 text-sm font-medium text-white shadow transition-colors hover:bg-[#B71C1C] focus:outline-none focus:ring-2 focus:ring-[#C62828] focus:ring-offset-2"
        >
          {publicKey ? "Do not swap" : "Connect your wallet"}
        </Button>
      </div>
      <Modal open={open} onClose={handleClose}>
        <div className="absolute left-1/2 top-1/2 bg-red-300 rounded-xl p-8 transform -translate-x-1/2 -translate-y-1/2">
          <p className="text-center text-white text-3xl font-bold">
            {loading ? "No pls no !" : "Are you sure ?"}
          </p>
          <div className="flex flex-row justify-between gap-2">
            <Button onClick={handleSwap} className="py-0">
              {loading ? (
                <div className="flex justify-center gap-2">
                  {["1", "2", "4"].map((key) => {
                    return (
                      <div
                        key={key}
                        className={`w-3 h-3 rounded-full bg-red-300 opacity-100 animate-bounce`}
                        style={{ animationDelay: `0.${key}s` }}
                      ></div>
                    );
                  })}
                </div>
              ) : (
                "Yes but do not buy it"
              )}
            </Button>
            <Button onClick={handleClose}>No</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Swap;
