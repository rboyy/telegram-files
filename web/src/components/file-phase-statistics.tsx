import React, { useState } from "react";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import prettyBytes from "pretty-bytes";
import { useSettings } from "@/hooks/use-settings";

// Type definitions
type TimeRange = "1" | "2" | "3" | "4";

interface SpeedData {
  avgSpeed: number;
  medianSpeed: number;
  maxSpeed: number;
  minSpeed: number;
}

interface SpeedStats {
  time: string;
  data: SpeedData;
}

interface CompletedStats {
  time: string;
  total: number;
}

interface ApiResponse {
  speedStats: SpeedStats[];
  completedStats: CompletedStats[];
}

const formatDate = (dateStr: string, timeRange: TimeRange): string => {
  const date = new Date(dateStr);

  switch (timeRange) {
    case "1": // Last hour
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "2": // Last day
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "3": // Last week
    case "4": // Last month
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
  }
};

interface TelegramStatsProps {
  telegramId: string;
}

const timeRangeOptions = [
  { value: "1", label: "1小时" },
  { value: "2", label: "24小时" },
  { value: "3", label: "1周" },
  { value: "4", label: "30天" },
];

const axisStyle = {
  fontSize: 11,
  fill: "#6b7280", // text-gray-500
};

const TelegramStats: React.FC<TelegramStatsProps> = ({ telegramId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1");
  const { settings } = useSettings();

  const { data, error, isLoading } = useSWR<ApiResponse, Error>(
    `/telegram/${telegramId}/download-statistics?type=phase&timeRange=${timeRange}`,
  );

  if (error) {
    return <div className="p-4 text-red-500">加载统计失败</div>;
  }

  if (isLoading || !data) {
    return <div className="p-4 text-gray-500">加载统计中...</div>;
  }

  // Transform speed data for the chart
  const speedChartData = data.speedStats.map((stat) => ({
    time: formatDate(stat.time, timeRange),
    "平均速度": stat.data.avgSpeed,
    "中位速度": stat.data.medianSpeed,
    "最大速度": stat.data.maxSpeed,
    "最小速度": stat.data.minSpeed,
  }));

  // Transform completion data for the chart
  const completionChartData = data.completedStats.map((stat) => ({
    time: formatDate(stat.time, timeRange),
    "已完成下载": stat.total,
  }));

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-14 right-1">
        <Select
          value={timeRange}
          onValueChange={(value: TimeRange) => setTimeRange(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="px-1">下载速度趋势</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <div className="h-80">
            {!speedChartData || speedChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={speedChartData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={axisStyle}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(value: number) =>
                      prettyBytes(value, {
                        bits: settings?.speedUnits === "bits",
                      })
                    }
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      prettyBytes(value, {
                        bits: settings?.speedUnits === "bits",
                      })
                    }
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "none",
                      borderRadius: "6px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={axisStyle} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="最大速度"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="平均速度"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="中位速度"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="最小速度"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.7}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="px-1">完成下载趋势</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <div className="h-80">
            {!completionChartData || completionChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionChartData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={axisStyle}
                  />
                  <YAxis
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "none",
                      borderRadius: "6px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={axisStyle} iconType="rect" />
                  <Bar
                    dataKey="已完成下载"
                    fill="#299d90"
                    fillOpacity={0.8}
                    maxBarSize={100}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramStats;
