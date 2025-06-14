import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText as MuiListItemText,
  Button,
  TextField,
  Autocomplete,
  Stack,
} from "@mui/material";
import {
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
  ComposedChart,
} from "recharts";
import { AgentSummary } from "../../../shared/agentSummary";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InsightsIcon from "@mui/icons-material/Insights";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TimelineIcon from "@mui/icons-material/Timeline";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";

interface AnalyticsDashboardProps {
  data: AgentSummary[];
}

// Minimum data thresholds for meaningful analysis
const DATA_THRESHOLDS = {
  MIN_TOTAL_QUOTES: 50, // Minimum first quotes for inclusion
  MIN_SUBMISSIONS: 10, // Minimum submissions for inclusion
  MIN_WEEKS_ACTIVE: 2, // Minimum weeks of activity
  SIGNIFICANT_CHANGE: 15, // Percentage change considered significant
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  // Filter states
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<
    "all" | "last4weeks" | "last8weeks" | "custom"
  >("all");
  const [customStartWeek, setCustomStartWeek] = useState<string>("");
  const [customEndWeek, setCustomEndWeek] = useState<string>("");

  // Helper function to sort weeks chronologically
  const sortWeeksChronologically = (weeks: string[]) => {
    return weeks.sort((a, b) => {
      // Try to extract numbers from week strings for proper chronological sorting
      const extractWeekNumber = (week: string) => {
        const match = week.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const weekA = extractWeekNumber(a);
      const weekB = extractWeekNumber(b);

      // If both have numbers, sort by number
      if (weekA && weekB) {
        return weekA - weekB;
      }

      // Fallback to string comparison
      return a.localeCompare(b);
    });
  };

  // Get available filter options
  const filterOptions = useMemo(() => {
    if (!data || data.length === 0) return { agents: [], weeks: [] };

    const agents = [
      ...new Set(
        data
          .filter((item) => item.agent && item.week !== "Total")
          .map((item) => item.agent)
      ),
    ].sort();
    const weeks = sortWeeksChronologically([
      ...new Set(
        data
          .filter((item) => item.week && item.week !== "Total")
          .map((item) => item.week)
      ),
    ]);

    return { agents, weeks };
  }, [data]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return data;

    let filtered = [...data];

    // Apply agent filter
    if (selectedAgents.length > 0) {
      filtered = filtered.filter((item) =>
        item.week === "Total"
          ? selectedAgents.includes(item.agent)
          : selectedAgents.includes(item.agent)
      );
    }

    // Apply week/date range filter
    if (dateRange !== "all" || selectedWeeks.length > 0) {
      const individualAgents = filtered.filter((item) => item.week !== "Total");
      let filteredIndividuals = individualAgents;

      if (selectedWeeks.length > 0) {
        filteredIndividuals = individualAgents.filter((item) =>
          selectedWeeks.includes(item.week)
        );
      } else if (dateRange !== "all") {
        const sortedWeeks = sortWeeksChronologically([...filterOptions.weeks]);
        let weekFilter: string[] = [];

        switch (dateRange) {
          case "last4weeks":
            weekFilter = sortedWeeks.slice(-4);
            break;
          case "last8weeks":
            weekFilter = sortedWeeks.slice(-8);
            break;
          case "custom":
            if (customStartWeek && customEndWeek) {
              const startIndex = sortedWeeks.indexOf(customStartWeek);
              const endIndex = sortedWeeks.indexOf(customEndWeek);
              if (
                startIndex !== -1 &&
                endIndex !== -1 &&
                startIndex <= endIndex
              ) {
                weekFilter = sortedWeeks.slice(startIndex, endIndex + 1);
              }
            }
            break;
        }

        if (weekFilter.length > 0) {
          filteredIndividuals = individualAgents.filter((item) =>
            weekFilter.includes(item.week)
          );
        }
      }

      // Recalculate totals for filtered data
      const agentTotals = filteredIndividuals.reduce((acc, item) => {
        if (!acc[item.agent]) {
          acc[item.agent] = {
            agent: item.agent,
            week: "Total",
            firstQuotes: 0,
            secondQuotes: 0,
            submitted: 0,
            freeLooked: 0,
            smokerPercent: 0,
            preferredPercent: 0,
            standardPercent: 0,
            gradedPercent: 0,
            giPercent: 0,
            ccPercent: 0,
            issuedPaidPlus: 0,
            preLapseCases: 0,
            weightedSmoker: 0,
            weightedPreferred: 0,
            weightedStandard: 0,
            weightedGraded: 0,
            weightedGI: 0,
          };
        }

        const total = acc[item.agent];
        total.firstQuotes += item.firstQuotes;
        total.secondQuotes += item.secondQuotes;
        total.submitted += item.submitted;
        total.freeLooked += item.freeLooked;
        total.preLapseCases += item.preLapseCases;
        total.issuedPaidPlus += item.issuedPaidPlus;

        // Weight percentages by submissions
        total.weightedSmoker += item.smokerPercent * item.submitted;
        total.weightedPreferred += item.preferredPercent * item.submitted;
        total.weightedStandard += item.standardPercent * item.submitted;
        total.weightedGraded += item.gradedPercent * item.submitted;
        total.weightedGI += item.giPercent * item.submitted;

        return acc;
      }, {} as Record<string, any>);

      // Calculate final percentages
      Object.values(agentTotals).forEach((total: any) => {
        if (total.submitted > 0) {
          total.smokerPercent = Number(
            (total.weightedSmoker / total.submitted).toFixed(1)
          );
          total.preferredPercent = Number(
            (total.weightedPreferred / total.submitted).toFixed(1)
          );
          total.standardPercent = Number(
            (total.weightedStandard / total.submitted).toFixed(1)
          );
          total.gradedPercent = Number(
            (total.weightedGraded / total.submitted).toFixed(1)
          );
          total.giPercent = Number(
            (total.weightedGI / total.submitted).toFixed(1)
          );
        }
        total.ccPercent =
          total.submitted > 0
            ? Number(
                ((total.issuedPaidPlus / total.submitted) * 100).toFixed(1)
              )
            : 0;
      });

      filtered = [...filteredIndividuals, ...Object.values(agentTotals)];
    }

    return filtered;
  }, [
    data,
    selectedAgents,
    selectedWeeks,
    dateRange,
    customStartWeek,
    customEndWeek,
    filterOptions.weeks,
  ]);

  const analytics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    // Filter out "Total" rows for individual agent analysis
    const individualAgents = filteredData.filter(
      (item) => item.week !== "Total" && item.agent
    );
    const totalRows = filteredData.filter((item) => item.week === "Total");

    // Filter agents with adequate data for meaningful analysis
    const qualifiedAgents = totalRows.filter(
      (agent) =>
        agent.firstQuotes >= DATA_THRESHOLDS.MIN_TOTAL_QUOTES &&
        agent.submitted >= DATA_THRESHOLDS.MIN_SUBMISSIONS
    );

    // Calculate agent activity weeks
    const agentWeekCounts = individualAgents.reduce((acc, item) => {
      if (!acc[item.agent]) acc[item.agent] = new Set();
      acc[item.agent].add(item.week);
      return acc;
    }, {} as Record<string, Set<string>>);

    // Further filter by minimum weeks active
    const experiencedAgents = qualifiedAgents.filter(
      (agent) =>
        (agentWeekCounts[agent.agent]?.size || 0) >=
        DATA_THRESHOLDS.MIN_WEEKS_ACTIVE
    );

    console.log(
      `Filtered from ${totalRows.length} total agents to ${experiencedAgents.length} qualified agents`
    );

    // Calculate weighted metrics
    const calculateWeightedAverage = (
      items: AgentSummary[],
      valueKey: keyof AgentSummary,
      weightKey: keyof AgentSummary
    ) => {
      const totalWeight = items.reduce(
        (sum, item) => sum + (Number(item[weightKey]) || 0),
        0
      );
      if (totalWeight === 0) return 0;
      const weightedSum = items.reduce((sum, item) => {
        const value = Number(item[valueKey]) || 0;
        const weight = Number(item[weightKey]) || 0;
        return sum + value * weight;
      }, 0);
      return weightedSum / totalWeight;
    };

    // Performance metrics with statistical analysis (qualified agents only)
    const agentPerformance = experiencedAgents
      .map((agent) => {
        // CORRECT CONVERSION RATE: Submitted / Second Quotes (not First Quotes)
        // This represents how many 2nd quotes actually convert to submissions
        const conversionRate =
          agent.secondQuotes > 0
            ? (agent.submitted / agent.secondQuotes) * 100
            : 0;

        // Quote progression rate: How many 1st quotes become 2nd quotes
        const quoteProgressionRate =
          agent.firstQuotes > 0
            ? (agent.secondQuotes / agent.firstQuotes) * 100
            : 0;

        // Overall funnel conversion: How many 1st quotes become submissions
        const overallConversionRate =
          agent.firstQuotes > 0
            ? (agent.submitted / agent.firstQuotes) * 100
            : 0;

        const totalActivity =
          agent.firstQuotes + agent.secondQuotes + agent.submitted;
        const weeksActive = agentWeekCounts[agent.agent]?.size || 0;

        // Financial performance metrics
        const avgIssuedPaid =
          (agent.issuedPaidMinus + agent.issuedPaidPlus) / 2;
        const issuedPaidSpread = agent.issuedPaidPlus - agent.issuedPaidMinus;

        return {
          agent: agent.agent,
          firstQuotes: agent.firstQuotes,
          secondQuotes: agent.secondQuotes,
          submitted: agent.submitted,
          freeLooked: agent.freeLooked || 0,
          conversionRate: Number(conversionRate.toFixed(2)), // 2nd Quote → Submission
          quoteProgressionRate: Number(quoteProgressionRate.toFixed(2)), // 1st Quote → 2nd Quote
          overallConversionRate: Number(overallConversionRate.toFixed(2)), // 1st Quote → Submission
          totalActivity,
          weeksActive,
          avgWeeklySubmissions: Number(
            (agent.submitted / weeksActive).toFixed(1)
          ),
          efficiency: Number(
            ((agent.submitted / Math.max(totalActivity, 1)) * 100).toFixed(2)
          ),
          preferredPercent: agent.preferredPercent,
          standardPercent: agent.standardPercent,
          gradedPercent: agent.gradedPercent,
          giPercent: agent.giPercent,
          ccPercent: agent.ccPercent,
          issuedPaidMinus: agent.issuedPaidMinus,
          issuedPaidPlus: agent.issuedPaidPlus,
          avgIssuedPaid: Number(avgIssuedPaid.toFixed(1)),
          issuedPaidSpread: Number(issuedPaidSpread.toFixed(1)),
          preLapseCases: agent.preLapseCases,
          qualityScore: Number(
            (
              (agent.preferredPercent * 1.5 + agent.standardPercent * 1.0) /
              2.5
            ).toFixed(1)
          ),
        };
      })
      .sort((a, b) => b.submitted - a.submitted);

    // Timeline analysis for underwriting changes
    const timelineAnalysis = individualAgents.reduce((acc, item) => {
      if (!experiencedAgents.find((agent) => agent.agent === item.agent))
        return acc;

      if (!acc[item.agent]) {
        acc[item.agent] = [];
      }
      acc[item.agent].push({
        week: item.week,
        preferredPercent: item.preferredPercent,
        standardPercent: item.standardPercent,
        gradedPercent: item.gradedPercent,
        giPercent: item.giPercent,
        submitted: item.submitted,
        conversionRate:
          item.secondQuotes > 0
            ? (item.submitted / item.secondQuotes) * 100
            : 0,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Detect dramatic changes in underwriting
    const underwritingChanges = Object.entries(timelineAnalysis)
      .map(([agent, timeline]) => {
        if (timeline.length < 2) return null;

        const sortedTimeline = timeline.sort((a, b) =>
          a.week.localeCompare(b.week)
        );
        const changes = [];

        for (let i = 1; i < sortedTimeline.length; i++) {
          const prev = sortedTimeline[i - 1];
          const curr = sortedTimeline[i];

          const preferredChange = curr.preferredPercent - prev.preferredPercent;
          const giChange = curr.giPercent - prev.giPercent;
          const conversionChange = curr.conversionRate - prev.conversionRate;

          if (
            Math.abs(preferredChange) >= DATA_THRESHOLDS.SIGNIFICANT_CHANGE ||
            Math.abs(giChange) >= DATA_THRESHOLDS.SIGNIFICANT_CHANGE ||
            Math.abs(conversionChange) >= DATA_THRESHOLDS.SIGNIFICANT_CHANGE
          ) {
            changes.push({
              fromWeek: prev.week,
              toWeek: curr.week,
              preferredChange: Number(preferredChange.toFixed(1)),
              giChange: Number(giChange.toFixed(1)),
              conversionChange: Number(conversionChange.toFixed(1)),
              severity: Math.max(
                Math.abs(preferredChange),
                Math.abs(giChange),
                Math.abs(conversionChange)
              ),
            });
          }
        }

        return changes.length > 0 ? { agent, changes } : null;
      })
      .filter(Boolean);

    // Top performers (top 25% by submissions among qualified agents)
    const topPerformersCount = Math.max(
      1,
      Math.ceil(agentPerformance.length * 0.25)
    );
    const topPerformers = agentPerformance.slice(0, topPerformersCount);

    // Weekly trends analysis (qualified agents only)
    const weeklyData = individualAgents
      .filter((item) =>
        experiencedAgents.find((agent) => agent.agent === item.agent)
      )
      .reduce((acc, item) => {
        if (!acc[item.week]) {
          acc[item.week] = {
            week: item.week,
            totalFirstQuotes: 0,
            totalSecondQuotes: 0,
            totalSubmitted: 0,
            agentCount: 0,
            totalPreLapse: 0,
            totalPreferred: 0,
            totalGI: 0,
            weightedPreferred: 0,
            weightedGI: 0,
          };
        }
        acc[item.week].totalFirstQuotes += item.firstQuotes;
        acc[item.week].totalSecondQuotes += item.secondQuotes;
        acc[item.week].totalSubmitted += item.submitted;
        acc[item.week].totalPreLapse += item.preLapseCases;
        acc[item.week].agentCount += 1;
        acc[item.week].weightedPreferred +=
          item.preferredPercent * item.submitted;
        acc[item.week].weightedGI += item.giPercent * item.submitted;
        return acc;
      }, {} as Record<string, any>);

    const weeklyTrends = Object.values(weeklyData)
      .map((week: any) => ({
        ...week,
        avgConversionRate:
          week.totalSecondQuotes > 0
            ? Number(
                ((week.totalSubmitted / week.totalSecondQuotes) * 100).toFixed(
                  2
                )
              )
            : 0,
        avgQuotesPerAgent: Number(
          (week.totalFirstQuotes / week.agentCount).toFixed(1)
        ),
        avgSubmissionsPerAgent: Number(
          (week.totalSubmitted / week.agentCount).toFixed(1)
        ),
        avgPreferredRate:
          week.totalSubmitted > 0
            ? Number((week.weightedPreferred / week.totalSubmitted).toFixed(1))
            : 0,
        avgGIRate:
          week.totalSubmitted > 0
            ? Number((week.weightedGI / week.totalSubmitted).toFixed(1))
            : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Enhanced risk analysis
    const riskAnalysis = agentPerformance.map((agent) => {
      let riskScore = 0;
      const issues = [];

      // Low conversion rate risk
      if (agent.conversionRate < 20) {
        riskScore += 3;
        issues.push(`Low conversion rate (${agent.conversionRate}%)`);
      }

      // Free Look cancellation risk (early cancellations within 30 days)
      const freeLookRate =
        agent.submitted > 0 ? (agent.freeLooked / agent.submitted) * 100 : 0;
      if (freeLookRate > 15) {
        riskScore += 3;
        issues.push(
          `High free look cancellation rate (${freeLookRate.toFixed(1)}%)`
        );
      } else if (freeLookRate > 10) {
        riskScore += 1;
        issues.push(
          `Elevated free look cancellation rate (${freeLookRate.toFixed(1)}%)`
        );
      }

      // Quality degradation risk - High GI percentage
      if (agent.giPercent > 40) {
        riskScore += 2;
        issues.push(`High GI percentage (${agent.giPercent}%)`);
      }

      // Underwriting class mixture risk - Low preferred percentage
      if (agent.preferredPercent < 20) {
        riskScore += 2;
        issues.push(
          `Low preferred rate (${agent.preferredPercent}%) - quality concern`
        );
      }

      // Combined high-risk underwriting (GI + Graded > 60%)
      const highRiskPercent = agent.giPercent + agent.gradedPercent;
      if (highRiskPercent > 60) {
        riskScore += 2;
        issues.push(
          `High-risk underwriting mix (${highRiskPercent.toFixed(
            1
          )}% GI+Graded)`
        );
      }

      // Low activity consistency
      if (agent.avgWeeklySubmissions < 5) {
        riskScore += 1;
        issues.push(
          `Low weekly productivity (${agent.avgWeeklySubmissions}/week)`
        );
      }

      // Quality score risk
      if (agent.qualityScore < 50) {
        riskScore += 2;
        issues.push(`Poor quality score (${agent.qualityScore})`);
      }

      // Financial performance risk - Low issued & paid success
      if (agent.issuedPaidPlus < 50) {
        riskScore += 1;
        issues.push(
          `Low policy success rate (${agent.issuedPaidPlus}% issued & paid)`
        );
      }

      return {
        agent: agent.agent,
        riskScore,
        riskLevel: riskScore >= 6 ? "High" : riskScore >= 4 ? "Medium" : "Low",
        issues,
        freeLookRate: Number(freeLookRate.toFixed(2)),
        highRiskPercent: Number(highRiskPercent.toFixed(1)),
        weeksActive: agent.weeksActive,
        qualityScore: agent.qualityScore,
      };
    });

    // Underwriting Class Mixture Analysis
    const underwritingMixture = agentPerformance
      .map((agent) => ({
        agent: agent.agent,
        submitted: agent.submitted,
        preferredPercent: agent.preferredPercent,
        standardPercent: agent.standardPercent,
        gradedPercent: agent.gradedPercent,
        giPercent: agent.giPercent,
        qualityTier:
          agent.preferredPercent >= 40
            ? "Excellent"
            : agent.preferredPercent >= 30
            ? "Good"
            : agent.preferredPercent >= 20
            ? "Average"
            : "Poor",
        riskProfile:
          agent.giPercent <= 20
            ? "Low Risk"
            : agent.giPercent <= 35
            ? "Medium Risk"
            : "High Risk",
        freeLookRate:
          agent.submitted > 0 ? (agent.freeLooked / agent.submitted) * 100 : 0,
      }))
      .sort((a, b) => b.submitted - a.submitted);

    // Industry Benchmarks for Underwriting Mix
    const industryBenchmarks = {
      preferred: { excellent: 45, good: 35, average: 25, poor: 15 },
      standard: { excellent: 35, good: 40, average: 40, poor: 35 },
      graded: { excellent: 15, good: 20, average: 25, poor: 30 },
      gi: { excellent: 5, good: 15, average: 25, poor: 35 },
      freeLook: { excellent: 5, good: 8, average: 12, poor: 20 },
    };

    // Rating distribution analysis (weighted by submissions, qualified agents only)
    const ratingDistribution = [
      {
        name: "Preferred",
        value: calculateWeightedAverage(
          experiencedAgents,
          "preferredPercent",
          "submitted"
        ),
        color: "#4caf50",
      },
      {
        name: "Standard",
        value: calculateWeightedAverage(
          experiencedAgents,
          "standardPercent",
          "submitted"
        ),
        color: "#2196f3",
      },
      {
        name: "Graded",
        value: calculateWeightedAverage(
          experiencedAgents,
          "gradedPercent",
          "submitted"
        ),
        color: "#ff9800",
      },
      {
        name: "GI",
        value: calculateWeightedAverage(
          experiencedAgents,
          "giPercent",
          "submitted"
        ),
        color: "#f44336",
      },
    ].map((item) => ({ ...item, value: Number(item.value.toFixed(1)) }));

    // Enhanced insights
    const insights = [];

    const avgConversion =
      agentPerformance.reduce((sum, agent) => sum + agent.conversionRate, 0) /
      agentPerformance.length;
    const topConversion = Math.max(
      ...agentPerformance.map((a) => a.conversionRate)
    );
    const lowConversion = Math.min(
      ...agentPerformance.map((a) => a.conversionRate)
    );

    // Add filter context to insights
    let filterContext = "";
    if (selectedAgents.length > 0) {
      filterContext += `${selectedAgents.length} selected agent${
        selectedAgents.length > 1 ? "s" : ""
      }`;
    }
    if (selectedWeeks.length > 0 || dateRange !== "all") {
      const weekContext =
        selectedWeeks.length > 0
          ? `${selectedWeeks.length} selected weeks`
          : dateRange === "last4weeks"
          ? "last 4 weeks"
          : dateRange === "last8weeks"
          ? "last 8 weeks"
          : dateRange === "custom"
          ? "custom date range"
          : "";
      filterContext += filterContext ? ` over ${weekContext}` : weekContext;
    }

    insights.push(
      `📊 Analyzing ${experiencedAgents.length} qualified agents${
        filterContext ? ` (${filterContext})` : ""
      }`
    );
    insights.push(
      `🎯 Average conversion rate: ${avgConversion.toFixed(
        1
      )}% (Range: ${lowConversion.toFixed(1)}% - ${topConversion.toFixed(1)}%)`
    );

    const highRiskAgents = riskAnalysis.filter(
      (r) => r.riskLevel === "High"
    ).length;
    if (highRiskAgents > 0) {
      insights.push(
        `⚠️ ${highRiskAgents} high-risk agents requiring immediate coaching and support`
      );
    }

    const totalSubmissions = agentPerformance.reduce(
      (sum, agent) => sum + agent.submitted,
      0
    );
    const weightedPreferredRate = calculateWeightedAverage(
      experiencedAgents,
      "preferredPercent",
      "submitted"
    );
    insights.push(
      `💎 ${weightedPreferredRate.toFixed(
        1
      )}% preferred rate across ${totalSubmissions.toLocaleString()} qualified submissions`
    );

    if (underwritingChanges.length > 0) {
      insights.push(
        `📈 ${underwritingChanges.length} agents show significant underwriting pattern changes requiring review`
      );
    }

    // Data quality insights
    const excludedAgents = totalRows.length - experiencedAgents.length;
    if (excludedAgents > 0) {
      insights.push(
        `📋 ${excludedAgents} agents excluded from analysis due to insufficient data volume`
      );
    }

    return {
      agentPerformance,
      topPerformers,
      weeklyTrends,
      riskAnalysis,
      ratingDistribution,
      underwritingChanges,
      timelineAnalysis,
      insights,
      totalQualifiedAgents: experiencedAgents.length,
      totalSubmissions,
      avgConversion: Number(avgConversion.toFixed(2)),
      dataThresholds: DATA_THRESHOLDS,
      underwritingMixture,
      industryBenchmarks,
    };
  }, [filteredData]);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedAgents([]);
    setSelectedWeeks([]);
    setDateRange("all");
    setCustomStartWeek("");
    setCustomEndWeek("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedAgents.length > 0 ||
    selectedWeeks.length > 0 ||
    dateRange !== "all";

  if (!analytics) {
    return (
      <Box p={3}>
        <Typography variant="h6">No data available for analytics</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: "bold" }}>
        📊 Qualified Agent Performance Analytics
      </Typography>

      {/* Dynamic Filters */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: "#f8f9fa" }}>
        <Box display="flex" alignItems="center" mb={2}>
          <FilterListIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight="bold">
            Dynamic Filters
          </Typography>
          {hasActiveFilters && (
            <Button
              startIcon={<ClearIcon />}
              onClick={clearAllFilters}
              sx={{ ml: 2 }}
              size="small"
              variant="outlined"
            >
              Clear All
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Agent Filter */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Agents</InputLabel>
              <Select
                multiple
                value={selectedAgents}
                onChange={(e) => setSelectedAgents(e.target.value as string[])}
                input={<OutlinedInput label="Filter by Agents" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {filterOptions.agents.map((agent) => (
                  <MenuItem key={agent} value={agent}>
                    <Checkbox checked={selectedAgents.indexOf(agent) > -1} />
                    <MuiListItemText primary={agent} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range Filter */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                label="Date Range"
              >
                <MenuItem value="all">All Weeks</MenuItem>
                <MenuItem value="last4weeks">Last 4 Weeks</MenuItem>
                <MenuItem value="last8weeks">Last 8 Weeks</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Week Filter */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Weeks</InputLabel>
              <Select
                multiple
                value={selectedWeeks}
                onChange={(e) => setSelectedWeeks(e.target.value as string[])}
                input={<OutlinedInput label="Filter by Weeks" />}
                disabled={dateRange !== "all"}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {filterOptions.weeks.map((week) => (
                  <MenuItem key={week} value={week}>
                    <Checkbox checked={selectedWeeks.indexOf(week) > -1} />
                    <MuiListItemText primary={week} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filterOptions.weeks}
                  value={customStartWeek}
                  onChange={(_, newValue) => setCustomStartWeek(newValue || "")}
                  renderInput={(params) => (
                    <TextField {...params} label="Start Week" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filterOptions.weeks}
                  value={customEndWeek}
                  onChange={(_, newValue) => setCustomEndWeek(newValue || "")}
                  renderInput={(params) => (
                    <TextField {...params} label="End Week" fullWidth />
                  )}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedAgents.map((agent) => (
                <Chip
                  key={`agent-${agent}`}
                  label={`Agent: ${agent}`}
                  onDelete={() =>
                    setSelectedAgents((prev) => prev.filter((a) => a !== agent))
                  }
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
              {selectedWeeks.map((week) => (
                <Chip
                  key={`week-${week}`}
                  label={`Week: ${week}`}
                  onDelete={() =>
                    setSelectedWeeks((prev) => prev.filter((w) => w !== week))
                  }
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              ))}
              {dateRange !== "all" && (
                <Chip
                  label={`Range: ${
                    dateRange === "last4weeks"
                      ? "Last 4 Weeks"
                      : dateRange === "last8weeks"
                      ? "Last 8 Weeks"
                      : "Custom Range"
                  }`}
                  onDelete={() => setDateRange("all")}
                  color="info"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>

            {/* Debug info for date range filtering */}
            {dateRange !== "all" && (
              <Box sx={{ mt: 1, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  📅 Filtered weeks:{" "}
                  {(() => {
                    const sortedWeeks = sortWeeksChronologically([
                      ...filterOptions.weeks,
                    ]);
                    const weekFilter =
                      dateRange === "last4weeks"
                        ? sortedWeeks.slice(-4)
                        : dateRange === "last8weeks"
                        ? sortedWeeks.slice(-8)
                        : dateRange === "custom" &&
                          customStartWeek &&
                          customEndWeek
                        ? (() => {
                            const startIndex =
                              sortedWeeks.indexOf(customStartWeek);
                            const endIndex = sortedWeeks.indexOf(customEndWeek);
                            return startIndex !== -1 &&
                              endIndex !== -1 &&
                              startIndex <= endIndex
                              ? sortedWeeks.slice(startIndex, endIndex + 1)
                              : [];
                          })()
                        : [];
                    return weekFilter.join(", ") || "None";
                  })()}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Data Quality Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          📋 Data Quality Standards Applied
        </Typography>
        <Typography variant="body2">
          Analysis includes only agents with ≥
          {analytics.dataThresholds.MIN_TOTAL_QUOTES} first quotes, ≥
          {analytics.dataThresholds.MIN_SUBMISSIONS} submissions, and ≥
          {analytics.dataThresholds.MIN_WEEKS_ACTIVE} weeks of activity for
          statistically meaningful insights.
        </Typography>
      </Alert>

      {/* Key Metrics Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#e3f2fd" }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Qualified Agents
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {analytics.totalQualifiedAgents}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Meeting data thresholds
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#e8f5e8" }}>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Quality Submissions
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {analytics.totalSubmissions.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                From experienced agents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#fff3e0" }}>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Avg Conversion
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {analytics.avgConversion}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Qualified agents only
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#fce4ec" }}>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Pattern Changes
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {analytics.underwritingChanges.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Significant shifts detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enhanced Insights */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: "#f8f9fa" }}>
        <Box display="flex" alignItems="center" mb={2}>
          <InsightsIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h5" fontWeight="bold">
            Executive Summary
          </Typography>
        </Box>
        <List dense>
          {analytics.insights.map((insight, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={insight}
                primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Statistical Analysis & Metric Explanations */}
      <Accordion sx={{ mb: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center">
            <AssessmentIcon sx={{ mr: 1, color: "info.main" }} />
            <Typography variant="h6" fontWeight="bold">
              📊 Statistical Analysis & Metric Definitions
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Conversion Rate Explanation */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    🎯 Conversion Rate Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Primary Conversion Rate: {analytics.avgConversion}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Formula:</strong> Submitted ÷ Second Quotes × 100
                    </Typography>
                    <Typography variant="body2">
                      This measures how effectively agents convert qualified
                      prospects (2nd quotes) into actual submissions. Industry
                      benchmark: 60-80%.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Quote Progression Rate
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Formula:</strong> Second Quotes ÷ First Quotes ×
                      100
                    </Typography>
                    <Typography variant="body2">
                      Shows how many initial quotes progress to serious
                      consideration. Higher rates indicate better lead
                      qualification.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Overall Funnel Conversion
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Formula:</strong> Submitted ÷ First Quotes × 100
                    </Typography>
                    <Typography variant="body2">
                      End-to-end conversion from initial contact to submission.
                      Reflects overall sales effectiveness.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Financial Metrics Explanation */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    💳 Financial Performance Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Credit Card Percentage (CC%)
                    </Typography>
                    <Typography variant="body2">
                      Percentage of submissions paid via credit card. Higher CC%
                      typically indicates better cash flow and customer
                      commitment.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Issued & Paid %- (Negative Scenarios)
                    </Typography>
                    <Typography variant="body2">
                      Percentage of policies that were issued but had payment
                      issues, cancellations, or other negative outcomes.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Issued & Paid %+ (Positive Scenarios)
                    </Typography>
                    <Typography variant="body2">
                      Percentage of policies successfully issued and paid
                      without issues. This is the true "success rate" for
                      completed business.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Quality Metrics Explanation */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="warning.main" gutterBottom>
                    🏅 Quality & Risk Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Quality Score Calculation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Formula:</strong> (Preferred% × 1.5 + Standard% ×
                      1.0) ÷ 2.5
                    </Typography>
                    <Typography variant="body2">
                      Weighted score favoring preferred rates. Higher scores
                      indicate better underwriting quality and lower risk
                      profiles.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Risk Categories
                    </Typography>
                    <Typography variant="body2">
                      <strong>Preferred:</strong> Lowest risk, best rates
                      <br />
                      <strong>Standard:</strong> Average risk, standard rates
                      <br />
                      <strong>Graded:</strong> Higher risk, modified coverage
                      <br />
                      <strong>GI (Guaranteed Issue):</strong> Highest risk,
                      limited coverage
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Statistical Significance */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="info.main" gutterBottom>
                    📈 Statistical Significance
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Data Quality Thresholds
                    </Typography>
                    <Typography variant="body2">
                      • Minimum {analytics.dataThresholds.MIN_TOTAL_QUOTES}{" "}
                      first quotes
                      <br />• Minimum {
                        analytics.dataThresholds.MIN_SUBMISSIONS
                      }{" "}
                      submissions
                      <br />• Minimum{" "}
                      {analytics.dataThresholds.MIN_WEEKS_ACTIVE} weeks of
                      activity
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Significant Change Detection
                    </Typography>
                    <Typography variant="body2">
                      Changes ≥{analytics.dataThresholds.SIGNIFICANT_CHANGE}% in
                      key metrics are flagged for review. This helps identify
                      coaching opportunities and compliance issues early.
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Weighted Calculations
                    </Typography>
                    <Typography variant="body2">
                      All averages are weighted by submission volume to prevent
                      low-volume agents from skewing results. This provides more
                      accurate business insights.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Business Implications */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              🚨 Key Business Implications
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Alert severity="info">
                  <Typography variant="subtitle2" fontWeight="bold">
                    Conversion Rate Impact
                  </Typography>
                  <Typography variant="body2">
                    A 10% improvement in conversion rate can increase revenue by
                    15-20% without additional lead costs.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="warning">
                  <Typography variant="subtitle2" fontWeight="bold">
                    Quality vs Volume
                  </Typography>
                  <Typography variant="body2">
                    High GI% may indicate volume focus over quality. Monitor for
                    compliance and long-term customer satisfaction.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="success">
                  <Typography variant="subtitle2" fontWeight="bold">
                    Payment Success
                  </Typography>
                  <Typography variant="body2">
                    Higher Issued & Paid %+ correlates with better customer
                    experience and reduced churn.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Underwriting Timeline Changes */}
      {analytics.underwritingChanges.length > 0 && (
        <Accordion sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <TimelineIcon sx={{ mr: 1, color: "warning.main" }} />
              <Typography variant="h6" fontWeight="bold">
                📈 Underwriting Pattern Changes (
                {analytics.underwritingChanges.length} agents)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {analytics.underwritingChanges
                .slice(0, 6)
                .map((change, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          gutterBottom
                        >
                          {change?.agent || "Unknown Agent"}
                        </Typography>
                        {change?.changes?.map((ch, idx) => (
                          <Box key={idx} sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {ch.fromWeek} → {ch.toWeek}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {Math.abs(ch.preferredChange) >=
                                DATA_THRESHOLDS.SIGNIFICANT_CHANGE && (
                                <Chip
                                  size="small"
                                  label={`Preferred: ${
                                    ch.preferredChange > 0 ? "+" : ""
                                  }${ch.preferredChange}%`}
                                  color={
                                    ch.preferredChange > 0 ? "success" : "error"
                                  }
                                />
                              )}
                              {Math.abs(ch.giChange) >=
                                DATA_THRESHOLDS.SIGNIFICANT_CHANGE && (
                                <Chip
                                  size="small"
                                  label={`GI: ${ch.giChange > 0 ? "+" : ""}${
                                    ch.giChange
                                  }%`}
                                  color={ch.giChange > 0 ? "error" : "success"}
                                />
                              )}
                              {Math.abs(ch.conversionChange) >=
                                DATA_THRESHOLDS.SIGNIFICANT_CHANGE && (
                                <Chip
                                  size="small"
                                  label={`Conversion: ${
                                    ch.conversionChange > 0 ? "+" : ""
                                  }${ch.conversionChange}%`}
                                  color={
                                    ch.conversionChange > 0
                                      ? "success"
                                      : "error"
                                  }
                                />
                              )}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      <Grid container spacing={4}>
        {/* Top Qualified Performers Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🏆 Top Qualified Performers (≥
                {analytics.dataThresholds.MIN_TOTAL_QUOTES} quotes)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={analytics.topPerformers.slice(0, 12)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="agent"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    fontSize={10}
                    interval={0}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => [
                      typeof value === "number"
                        ? value.toLocaleString()
                        : value,
                      name,
                    ]}
                    labelFormatter={(label) => `Agent: ${label}`}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="submitted"
                    fill="#4caf50"
                    name="Submissions"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversionRate"
                    stroke="#ff7300"
                    strokeWidth={3}
                    name="Conversion Rate % (2nd→Sub)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="qualityScore"
                    stroke="#9c27b0"
                    strokeWidth={2}
                    name="Quality Score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Rating Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                📈 Quality Distribution (Submission-Weighted)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.ratingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Quality Benchmarks:
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">
                      Preferred + Standard:
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {(
                        analytics.ratingDistribution[0].value +
                        analytics.ratingDistribution[1].value
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">High Risk (GI):</Typography>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color="error.main"
                    >
                      {analytics.ratingDistribution[3].value}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Trends with Underwriting Quality */}
        <Grid item xs={12}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                📅 Weekly Performance & Quality Trends (Qualified Agents)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={analytics.weeklyTrends}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="totalSubmitted"
                    fill="#4caf50"
                    name="Total Submissions"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgConversionRate"
                    stroke="#ff7300"
                    strokeWidth={3}
                    name="Avg Conversion % (2nd→Sub)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgPreferredRate"
                    stroke="#2196f3"
                    strokeWidth={2}
                    name="Avg Preferred %"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgGIRate"
                    stroke="#f44336"
                    strokeWidth={2}
                    name="Avg GI %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Risk Analysis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                ⚠️ Risk Analysis & Coaching Priorities
              </Typography>
              <Grid container spacing={2}>
                {analytics.riskAnalysis
                  .filter((risk) => risk.riskLevel !== "Low")
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .slice(0, 8)
                  .map((risk, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Alert
                        severity={
                          risk.riskLevel === "High" ? "error" : "warning"
                        }
                        sx={{ height: "100%" }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          {risk.agent}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Risk Score: {risk.riskScore} | Active:{" "}
                          {risk.weeksActive} weeks
                        </Typography>
                        <Box>
                          {risk.issues.map((issue, idx) => (
                            <Typography
                              key={idx}
                              variant="caption"
                              display="block"
                            >
                              • {issue}
                            </Typography>
                          ))}
                        </Box>
                      </Alert>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Underwriting Class Mixture Analysis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🎯 Underwriting Class Mixture Analysis
              </Typography>

              {/* Industry Benchmarks Reference */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: "#f8f9fa" }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  📊 Industry Benchmarks (by Performance Tier)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography
                      variant="subtitle2"
                      color="success.main"
                      fontWeight="bold"
                    >
                      Excellent Tier
                    </Typography>
                    <Typography variant="body2">
                      Preferred: 45%+ | GI: ≤5% | Free Look: ≤5%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography
                      variant="subtitle2"
                      color="info.main"
                      fontWeight="bold"
                    >
                      Good Tier
                    </Typography>
                    <Typography variant="body2">
                      Preferred: 35%+ | GI: ≤15% | Free Look: ≤8%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography
                      variant="subtitle2"
                      color="warning.main"
                      fontWeight="bold"
                    >
                      Average Tier
                    </Typography>
                    <Typography variant="body2">
                      Preferred: 25%+ | GI: ≤25% | Free Look: ≤12%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography
                      variant="subtitle2"
                      color="error.main"
                      fontWeight="bold"
                    >
                      Poor Tier
                    </Typography>
                    <Typography variant="body2">
                      Preferred: &lt;25% | GI: &gt;25% | Free Look: &gt;12%
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Agent Performance Matrix */}
              <Grid container spacing={3}>
                {analytics.underwritingMixture
                  .slice(0, 12)
                  .map((agent, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: "100%",
                          borderColor:
                            agent.qualityTier === "Excellent"
                              ? "success.main"
                              : agent.qualityTier === "Good"
                              ? "info.main"
                              : agent.qualityTier === "Average"
                              ? "warning.main"
                              : "error.main",
                          borderWidth: 2,
                        }}
                      >
                        <CardContent>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                          >
                            <Typography variant="subtitle1" fontWeight="bold">
                              {agent.agent}
                            </Typography>
                            <Chip
                              label={agent.qualityTier}
                              color={
                                agent.qualityTier === "Excellent"
                                  ? "success"
                                  : agent.qualityTier === "Good"
                                  ? "info"
                                  : agent.qualityTier === "Average"
                                  ? "warning"
                                  : "error"
                              }
                              size="small"
                            />
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                          >
                            {agent.submitted} submissions | {agent.riskProfile}
                          </Typography>

                          {/* Underwriting Mix Breakdown */}
                          <Box sx={{ mt: 2 }}>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              mb={0.5}
                            >
                              <Typography variant="caption">
                                Preferred:
                              </Typography>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                color={
                                  agent.preferredPercent >= 35
                                    ? "success.main"
                                    : agent.preferredPercent >= 25
                                    ? "warning.main"
                                    : "error.main"
                                }
                              >
                                {agent.preferredPercent}%
                              </Typography>
                            </Box>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              mb={0.5}
                            >
                              <Typography variant="caption">
                                Standard:
                              </Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {agent.standardPercent}%
                              </Typography>
                            </Box>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              mb={0.5}
                            >
                              <Typography variant="caption">Graded:</Typography>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                color={
                                  agent.gradedPercent > 25
                                    ? "warning.main"
                                    : "text.primary"
                                }
                              >
                                {agent.gradedPercent}%
                              </Typography>
                            </Box>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              mb={0.5}
                            >
                              <Typography variant="caption">GI:</Typography>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                color={
                                  agent.giPercent > 25
                                    ? "error.main"
                                    : agent.giPercent > 15
                                    ? "warning.main"
                                    : "success.main"
                                }
                              >
                                {agent.giPercent}%
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="caption">
                                Free Look Rate:
                              </Typography>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                color={
                                  agent.freeLookRate > 12
                                    ? "error.main"
                                    : agent.freeLookRate > 8
                                    ? "warning.main"
                                    : "success.main"
                                }
                              >
                                {agent.freeLookRate.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>

              {/* Summary Statistics */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📈 Portfolio Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Alert severity="success">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Excellent Tier
                      </Typography>
                      <Typography variant="body2">
                        {
                          analytics.underwritingMixture.filter(
                            (a) => a.qualityTier === "Excellent"
                          ).length
                        }{" "}
                        agents
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="info">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Good Tier
                      </Typography>
                      <Typography variant="body2">
                        {
                          analytics.underwritingMixture.filter(
                            (a) => a.qualityTier === "Good"
                          ).length
                        }{" "}
                        agents
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="warning">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Average Tier
                      </Typography>
                      <Typography variant="body2">
                        {
                          analytics.underwritingMixture.filter(
                            (a) => a.qualityTier === "Average"
                          ).length
                        }{" "}
                        agents
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="error">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Poor Tier
                      </Typography>
                      <Typography variant="body2">
                        {
                          analytics.underwritingMixture.filter(
                            (a) => a.qualityTier === "Poor"
                          ).length
                        }{" "}
                        agents
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
