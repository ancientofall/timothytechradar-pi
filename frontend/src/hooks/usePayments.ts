import { useCallback, useRef, useState } from "react";
import { buyPiKit } from "../lib/piPayments";

type UsePaymentsArgs = {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onPaymentComplete?: () => void;
};
export const usePayments = ({ isAuthenticated, onRequireAuth, onPaymentComplete }: UsePaymentsArgs) => {
  const busy = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const orderProduct = useCallback(async (productId: string) => {
    if (!isAuthenticated) { onRequireAuth(); return; }
    if (busy.current) return;
    busy.current = true; setIsLoading(true); setPaymentError("");
    try { if (await buyPiKit(productId)) onPaymentComplete?.(); }
    catch (error) { setPaymentError(error instanceof Error ? error.message : "Payment could not be confirmed. Do not pay again."); }
    finally { busy.current = false; setIsLoading(false); }
  }, [isAuthenticated, onRequireAuth, onPaymentComplete]);
  return { orderProduct, isLoading, paymentError };
};
