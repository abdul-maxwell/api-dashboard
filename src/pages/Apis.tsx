import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PaymentDialog from "@/components/dashboard/PaymentDialog";

export default function Apis() {
  return (
    <div className="min-h-screen bg-gradient-secondary animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent text-balance">
            Purchase API Keys
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-prose mt-1">
            Choose a plan and get instant access to secure API keys for your bot.
          </p>
        </div>

        <Card className="card-hover transition-smooth">
          <CardHeader>
            <CardTitle>Buy Access</CardTitle>
            <CardDescription>Pay securely and receive your key immediately</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <PaymentDialog onPaymentInitiated={() => {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


