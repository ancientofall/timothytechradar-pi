import { axiosClient } from "./axiosClient";
import { getPiSdk } from "./piSdk";
import { products } from "../products";
import type { PaymentDTO } from "../types/pi";

export async function recoverPiPayment(payment: PaymentDTO) {
  const { data } = await axiosClient.post("/payments/incomplete", { paymentId: payment.identifier });
  if (data.completed !== true) throw new Error("Pi payment recovery is still pending. Do not pay again.");
}

export async function buyPiKit(productId: string): Promise<boolean> {
  const product = products.find(item => item.id === productId);
  if (!product) throw new Error("Unknown kit.");
  const pi = await getPiSdk();
  const recoveries: Promise<void>[] = [];
  let recoveryFailed = false;
  await pi.authenticate(["username", "payments"], payment => {
    recoveries.push(recoverPiPayment(payment).catch(() => { recoveryFailed = true; }));
  });
  await Promise.all(recoveries);
  if (recoveryFailed) throw new Error("An earlier payment needs verification. Sign in again to retry; do not pay again.");
  // A recovered purchase should go to downloads, not open another charge.
  if (recoveries.length) return true;
  return new Promise<boolean>((resolve, reject) => {
    const fail = () => reject(new Error("Payment could not be confirmed. Sign in again to recover it; do not pay again."));
    try {
      Promise.resolve(pi.createPayment({ amount: product.price, memo: `Order ${product.name}`, metadata: { productId } }, {
        onReadyForServerApproval: async paymentId => {
          try { await axiosClient.post("/payments/approve", { paymentId }); } catch { fail(); }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const { data } = await axiosClient.post("/payments/complete", { paymentId, txid });
            if (data.completed !== true) return fail();
            resolve(true);
          } catch { fail(); }
        },
        onCancel: async paymentId => {
          try { await axiosClient.post("/payments/cancelled_payment", { paymentId }); resolve(false); }
          catch { reject(new Error("Could not confirm cancellation. Check your Pi Wallet before trying again.")); }
        },
        onError: fail,
      })).catch(fail);
    } catch { fail(); }
  });
}
