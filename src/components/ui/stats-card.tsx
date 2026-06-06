import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCard1Props {
  title?: string;
  value?: string | number;
  change?: number;
  changeLabel?: string;
  className?: string;
}

const StatsCard1 = ({
  title = "Total Revenue",
  value = "$45,231.89",
  change = 20.1,
  changeLabel = "from last month",
  className,
}: StatsCard1Props) => {
  const isPositive = change >= 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-[12px]">
          {isPositive ? (
            <TrendingUp className="size-3.5 text-white/90" />
          ) : (
            <TrendingDown className="size-3.5 text-rose-500" />
          )}
          <span className={isPositive ? "text-white font-semibold" : "text-rose-500 font-semibold"}>
            {isPositive ? "+" : ""}
            {change}%
          </span>
          <span className="text-white/25">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export { StatsCard1 };
