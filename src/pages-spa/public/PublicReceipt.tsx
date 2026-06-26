import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicReceipt } from "@/lib/client-payments";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Printer, Download, CheckCircle, Clock } from "lucide-react";

export default function PublicReceipt() {
  const { token } = useParams<{ token: string }>();
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (token) {
      getPublicReceipt(token).then(data => {
        if (!data) {
          setError(true);
        } else {
          setReceipt(data);
        }
      }).catch(() => setError(true));
    }
  }, [token]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md text-center p-8">
          <CardTitle className="text-red-500 mb-2">Receipt Not Found</CardTitle>
          <p className="text-muted-foreground">This receipt may have been cancelled, or the link is invalid.</p>
        </Card>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="animate-pulse">Loading secure receipt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-start justify-center">
      <Card className="w-full max-w-2xl bg-white shadow-xl mt-12 print:shadow-none print:mt-0 print:border-none">
        <CardHeader className="border-b pb-6 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto overflow-hidden flex items-center justify-center">
            {receipt.company_logo ? (
              <img src={receipt.company_logo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-400">{receipt.company_name?.charAt(0) || "C"}</span>
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{receipt.company_name}</CardTitle>
            <p className="text-muted-foreground">Payment Receipt</p>
          </div>
        </CardHeader>
        
        <CardContent className="pt-8 space-y-8">
          <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100">
            <div>
              <p className="text-sm font-medium text-green-800">Amount Paid</p>
              <h2 className="text-4xl font-bold text-green-600">${Number(receipt.amount).toFixed(2)}</h2>
            </div>
            <div className="text-right">
              <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1">
                <CheckCircle className="w-4 h-4 mr-1" /> Payment Received
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">{format(new Date(receipt.payment_date), "MMMM d, yyyy")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4 px-2">
            <div>
              <p className="text-sm text-muted-foreground">Received From</p>
              <p className="font-semibold text-lg">{receipt.customer_name || "Valued Customer"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold text-lg capitalize">{receipt.method.replace('_', ' ')}</p>
            </div>
            {receipt.estimate_id && (
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-semibold text-lg">Estimate / Invoice</p>
              </div>
            )}
            {receipt.note && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Note</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md mt-1">{receipt.note}</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-4 bg-gray-50 border-t p-6 rounded-b-xl print:hidden">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" /> Print Receipt
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
