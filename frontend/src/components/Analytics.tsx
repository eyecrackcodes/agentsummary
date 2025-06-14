import React from "react";
import { AgentSummary } from "../../../shared/agentSummary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { Box, Typography, Grid, Card, CardContent, Alert } from "@mui/material";

interface AnalyticsProps {
  data: AgentSummary[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const Analytics: React.FC<AnalyticsProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Safe data filtering to remove any invalid records
  const validData = data.filter(
    (record) =>
      record &&
      typeof record.agent === "string" &&
      typeof record.week === "string" &&
      typeof record.firstQuotes === "number" &&
      typeof record.submitted === "number"
  );

  if (validData.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No valid data found for analysis
      </Alert>
    );
  }

  // Agent Performance Summary
  const getAgentPerformance = () => {
    try {
      const agentStats = validData.reduce((acc, record) => {
        if (!acc[record.agent]) {
          acc[record.agent] = {
            agent: record.agent,
            totalFirstQuotes: 0,
            totalSubmitted: 0,
            totalPreLapse: 0,
            avgIssuedPaidPlus: 0,
            records: 0,
          };
        }
        acc[record.agent].totalFirstQuotes += record.firstQuotes || 0;
        acc[record.agent].totalSubmitted += record.submitted || 0;
        acc[record.agent].totalPreLapse += record.preLapseCases || 0;
        acc[record.agent].avgIssuedPaidPlus += record.issuedPaidPlus || 0;
        acc[record.agent].records += 1;
        return acc;
      }, {} as any);

      return Object.values(agentStats)
        .map((agent: any) => ({
          ...agent,
          conversionRate:
            agent.totalFirstQuotes > 0
              ? ((agent.totalSubmitted / agent.totalFirstQuotes) * 100).toFixed(
                  1
                )
              : 0,
          avgIssuedPaidPlus:
            agent.records > 0
              ? (agent.avgIssuedPaidPlus / agent.records).toFixed(1)
              : 0,
        }))
        .sort(
          (a: any, b: any) => (b.totalSubmitted || 0) - (a.totalSubmitted || 0)
        )
        .slice(0, 20);
    } catch (error) {
      console.error("Error calculating agent performance:", error);
      return [];
    }
  };

  // Weekly Trends
  const getWeeklyTrends = () => {
    try {
      const weeklyStats = validData.reduce((acc, record) => {
        if (!acc[record.week]) {
          acc[record.week] = {
            week: record.week,
            totalFirstQuotes: 0,
            totalSubmitted: 0,
            totalPreLapse: 0,
            avgConversionRate: 0,
            records: 0,
          };
        }
        acc[record.week].totalFirstQuotes += record.firstQuotes || 0;
        acc[record.week].totalSubmitted += record.submitted || 0;
        acc[record.week].totalPreLapse += record.preLapseCases || 0;
        acc[record.week].records += 1;
        return acc;
      }, {} as any);

      return Object.values(weeklyStats)
        .map((week: any) => ({
          ...week,
          conversionRate:
            week.totalFirstQuotes > 0
              ? ((week.totalSubmitted / week.totalFirstQuotes) * 100).toFixed(1)
              : 0,
        }))
        .sort((a: any, b: any) => (a.week || "").localeCompare(b.week || ""));
    } catch (error) {
      console.error("Error calculating weekly trends:", error);
      return [];
    }
  };

  // Rating Distribution
  const getRatingDistribution = () => {
    try {
      const totals = validData.reduce(
        (acc, record) => {
          const secondQuotes = record.secondQuotes || 0;
          acc.smoker += ((record.smokerPercent || 0) * secondQuotes) / 100;
          acc.preferred +=
            ((record.preferredPercent || 0) * secondQuotes) / 100;
          acc.standard += ((record.standardPercent || 0) * secondQuotes) / 100;
          acc.graded += ((record.gradedPercent || 0) * secondQuotes) / 100;
          acc.gi += ((record.giPercent || 0) * secondQuotes) / 100;
          return acc;
        },
        { smoker: 0, preferred: 0, standard: 0, graded: 0, gi: 0 }
      );

      const total = Object.values(totals).reduce((sum, val) => sum + val, 0);

      if (total === 0) return [];

      return [
        {
          name: "Preferred",
          value: Math.round((totals.preferred / total) * 100),
          count: Math.round(totals.preferred),
        },
        {
          name: "Standard",
          value: Math.round((totals.standard / total) * 100),
          count: Math.round(totals.standard),
        },
        {
          name: "Smoker",
          value: Math.round((totals.smoker / total) * 100),
          count: Math.round(totals.smoker),
        },
        {
          name: "Graded",
          value: Math.round((totals.graded / total) * 100),
          count: Math.round(totals.graded),
        },
        {
          name: "GI",
          value: Math.round((totals.gi / total) * 100),
          count: Math.round(totals.gi),
        },
      ];
    } catch (error) {
      console.error("Error calculating rating distribution:", error);
      return [];
    }
  };

  // Compliance Risk Analysis
  const getComplianceRisks = () => {
    try {
      const risks = validData.filter((record) => {
        const conversionRate =
          (record.firstQuotes || 0) > 0
            ? ((record.submitted || 0) / record.firstQuotes) * 100
            : 0;
        const highPreferred = (record.preferredPercent || 0) > 60;
        const lowGraded =
          (record.gradedPercent || 0) < 5 && (record.secondQuotes || 0) > 10;
        const highConversion = conversionRate > 80;
        const lowIssuedPaid = (record.issuedPaidPlus || 0) < 50;

        return highPreferred || lowGraded || highConversion || lowIssuedPaid;
      });

      return risks.length;
    } catch (error) {
      console.error("Error calculating compliance risks:", error);
      return 0;
    }
  };

  const agentPerformance = getAgentPerformance();
  const weeklyTrends = getWeeklyTrends();
  const ratingDistribution = getRatingDistribution();
  const complianceRisks = getComplianceRisks();

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Performance Analytics
      </Typography>

      {complianceRisks > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {complianceRisks.toLocaleString()} records flagged for potential
          compliance review
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Top Agents by Submissions */}
        {agentPerformance.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Agents by Submissions
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="agent"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalSubmitted" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Weekly Trends */}
        {weeklyTrends.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Performance Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="totalSubmitted"
                      fill="#8884d8"
                      name="Submissions"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="conversionRate"
                      stroke="#ff7300"
                      name="Conversion %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Rating Distribution */}
        {ratingDistribution.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rating Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ratingDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ratingDistribution.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value}% (${props.payload.count} cases)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Conversion Rate vs Issued & Paid */}
        {agentPerformance.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Agent Performance Scatter
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={agentPerformance}>
                    <CartesianGrid />
                    <XAxis
                      dataKey="conversionRate"
                      name="Conversion Rate"
                      unit="%"
                    />
                    <YAxis
                      dataKey="avgIssuedPaidPlus"
                      name="Avg Issued & Paid"
                      unit="%"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => [
                        `${value}${String(name).includes("Rate") ? "%" : "%"}`,
                        String(name).includes("Rate")
                          ? "Conversion Rate"
                          : "Avg Issued & Paid",
                      ]}
                      labelFormatter={(label) =>
                        `Agent: ${agentPerformance[label]?.agent || "Unknown"}`
                      }
                    />
                    <Scatter dataKey="avgIssuedPaidPlus" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Pre-Lapse Cases Trend */}
        {weeklyTrends.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pre-Lapse Cases by Week
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="totalPreLapse"
                      stroke="#ff7300"
                      fill="#ff7300"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
