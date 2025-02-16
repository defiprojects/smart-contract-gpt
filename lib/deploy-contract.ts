import { makeContractDeploy, broadcastTransaction, AnchorMode, getAddressFromPrivateKey, SignedContractDeployOptions } from "@stacks/transactions";
import { StacksNetworkName } from "@stacks/network";
import { getExplorerUrl, getNextPossibleNonce, nakamotoTestnet, requestFaucetFunds } from "@/lib/stacks";
import { nanoid } from "ai";
import { DeploymentData } from "@/lib/types";
import { DEPLOYER_PRIVATE_KEY } from "@/app/config";

type DeployContractParams = {
  networkName?: StacksNetworkName;
  contractName?: string;
  sourceCode: string;
};

export const deployContract = async ({
  networkName = "testnet",
  contractName = `smart-contract-gpt-${nanoid()}`,
  sourceCode,
}: DeployContractParams): Promise<
  { error: string } | { explorerUrl: string; contractName: string; network: string }
> => {
  //const network = networkName === "testnet" ? nakamotoTestnet : StacksNetwork.fromName(networkName);

  const formattedContractName = contractName?.replace(/([a-z])([A-Z])/g, "$1-$2")?.toLowerCase();

  const senderAddress = getAddressFromPrivateKey(DEPLOYER_PRIVATE_KEY, nakamotoTestnet.version);
  const nextPossibleNonce = await getNextPossibleNonce(senderAddress);

  if (networkName === "testnet") {
    const { success } = await requestFaucetFunds(senderAddress);
    if (!success) {
      console.error("Faucet request failed");
    }
  }

  const txOptions: SignedContractDeployOptions = {
    contractName: formattedContractName,
    codeBody: sourceCode,
    clarityVersion: 2,
    network: nakamotoTestnet,
    senderKey: DEPLOYER_PRIVATE_KEY,
    nonce: nextPossibleNonce,
    anchorMode: AnchorMode.Any,
    fee: BigInt(1000000), // 1 STX
  };

  const transaction = await makeContractDeploy(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, nakamotoTestnet);
  const { txid, error, reason, reason_data } = broadcastResponse;
  if (error) {
    console.error("Broadcast error", error, reason, reason_data);
    return {
      error: reason || error,
    };
  }

  const deploymentData: DeploymentData = {
    explorerUrl: getExplorerUrl(txid, nakamotoTestnet.chainId),
    contractName: formattedContractName,
    network: networkName,
  };
  return deploymentData;
};
