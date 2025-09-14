import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { getLatestApiKey, getUser } from "@/app/db";
import { NextResponse } from "next/server";

import {
  Address,
  createWalletClient,
  Hex,
  SignableMessage,
  hashMessage,
  encodeFunctionData,
} from "viem";
import {
  alchemy,
  createAlchemySmartAccountClient,
  gensynTestnet,
} from "@account-kit/infra";
import { toAccount } from "viem/accounts";
import { WalletClientSigner } from "@aa-sdk/core";
import { createModularAccountV2 } from "@account-kit/smart-contracts";

const TURNKEY_BASE_URL = "https://api.turnkey.com";
const ALCHEMY_BASE_URL = "https://api.g.alchemy.com";

export async function POST(request: Request) {
  const body: { orgId: string; roundNumber: bigint; winners: string[] } = await request
    .json()
    .catch((err) => {
      console.error(err);
      console.log(body)
      return NextResponse.json(
        { error: "bad request generic" },
        {
          status: 400,
        },
      );
    });
  if (!body.orgId) {
    return NextResponse.json(
      { error: "bad request orgID" },
      {
        status: 400,
      },
    );
  }

  try {
    const user = getUser(body.orgId);
    if (!user) {
      return NextResponse.json(
        { error: "user not found" },
        {
          status: 404,
        },
      );
    }
    const apiKey = getLatestApiKey(body.orgId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "api key not found" },
        {
          status: 500,
        },
      );
    }
    const transport = alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
    });

    const account = await createModularAccountV2({
      transport,
      chain: gensynTestnet,
      signer: createSignerForUser(user, apiKey),
    });

    const client = createAlchemySmartAccountClient({
      account,
      chain: gensynTestnet,
      transport,
      policyId: process.env.NEXT_PUBLIC_PAYMASTER_POLICY_ID!,
    });

  const contractAdrr = process.env.SMART_CONTRACT_ADDRESS! as `0x${string}`;


    const { hash } = await client.sendUserOperation({
      uo: {
        target: contractAdrr,
        data: encodeFunctionData({
          abi: [
            {
              name: "submitWinners",
              type: "function",
              inputs: [
                {
                  internalType: "uint256",
                  name: "roundNumber",
                  type: "uint256",
                },
                {
                  internalType: "string[]",
                  name: "winners",
                  type: "string[]",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          functionName: "submitWinners",
          args: [body.roundNumber, body.winners], // Your function arguments
        }),
      },
    });

    return NextResponse.json(
      {
        hash,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "error" },
      {
        status: 500,
      },
    );
  }
}

function createSignerForUser(
  user: { orgId: string; address: string },
  apiKey: { publicKey: string; privateKey: string },
) {
  const stamper = new ApiKeyStamper({
    apiPublicKey: apiKey.publicKey,
    apiPrivateKey: apiKey.privateKey,
  });
  const tk = new TurnkeyClient({ baseUrl: TURNKEY_BASE_URL }, stamper);

  const signMessage = async (message: SignableMessage) => {
    const payload = hashMessage(message);

    // Sign with the api key stamper first.
    const stampedRequest = await tk.stampSignRawPayload({
      organizationId: user.orgId,
      timestampMs: Date.now().toString(),
      type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
      parameters: {
        signWith: user.address,
        payload,
        encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
        hashFunction: "HASH_FUNCTION_NO_OP",
      },
    });

    // Then submit to Alchemy.
    const alchemyResp = await fetch(
      `${ALCHEMY_BASE_URL}/signer/v1/sign-payload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          stampedRequest,
        }),
      },
    );
    if (!alchemyResp.ok) {
      console.error(await alchemyResp.text());
      throw new Error("Alchemy sign request failed");
    }

    const respJson = (await alchemyResp.json()) as { signature: Hex };
    return respJson.signature;
  };

  const signerAccount = toAccount({
    address: user.address as Address,
    signMessage: async ({ message }) => {
      return signMessage(message);
    },
    signTransaction: async () => {
      throw new Error("Not implemented");
    },
    signTypedData: async () => {
      throw new Error("Not implemented");
    },
  });

  const walletClient = createWalletClient({
    account: signerAccount,
    chain: gensynTestnet,
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
    }),
  });

  return new WalletClientSigner(walletClient, "custom");
}
