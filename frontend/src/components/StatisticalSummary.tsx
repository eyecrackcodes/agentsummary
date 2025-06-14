import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from "@mui/material";
import { AgentSummary } from "../../../shared/agentSummary";

interface StatisticalSummaryProps {
  data: AgentSummary[];
}

interface StatisticalMetrics {
  mean: number;
  median: number;
  standardDeviation: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  range: number;
  coefficientOfVariation: number;
}

const StatisticalSummary: React.FC<StatisticalSummaryProps> = ({ data }) => {
  const statistics = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalRows = data.filter(
      (item) => item.week === "Total" && item.agent
    );

    const calculateStats = (values: number[]): StatisticalMetrics => {
      const sorted = values.sort((a, b) => a - b);
      const n = sorted.length;

      const mean = values.reduce((sum, val) => sum + val, 0) / n;
      const median =
        n % 2 === 0
          ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
          : sorted[Math.floor(n / 2)];

      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      const standardDeviation = Math.sqrt(variance);

      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];

      const min = sorted[0];
      const max = sorted[n - 1];
      const range = max - min;
      const coefficientOfVariation =
        mean !== 0 ? (standardDeviation / mean) * 100 : 0;

      return {
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
        q1: Number(q1.toFixed(2)),
        q3: Number(q3.toFixed(2)),
        min,
        max,
        range: Number(range.toFixed(2)),
        coefficientOfVariation: Number(coefficientOfVariation.toFixed(2)),
      };
    };

    // Calculate conversion rates
    const conversionRates = totalRows.map((agent) =>
      agent.firstQuotes > 0 ? (agent.submitted / agent.firstQuotes) * 100 : 0
    );

    // Calculate efficiency scores
    const efficiencyScores = totalRows.map((agent) => {
      const totalActivity =
        agent.firstQuotes + agent.secondQuotes + agent.submitted;
      return totalActivity > 0 ? (agent.submitted / totalActivity) * 100 : 0;
    });

    // Calculate quality scores (weighted average of preferred + standard)
    const qualityScores = totalRows.map(
      (agent) =>
        (agent.preferredPercent * 1.5 + agent.standardPercent * 1.0) / 2.5
    );

    // Performance benchmarks
    const benchmarks = {
      excellent: { min: 90, color: "#4caf50", label: "Excellent" },
      good: { min: 75, color: "#8bc34a", label: "Good" },
      average: { min: 60, color: "#ff9800", label: "Average" },
      belowAverage: { min: 45, color: "#ff5722", label: "Below Average" },
      poor: { min: 0, color: "#f44336", label: "Poor" },
    };

    const getBenchmarkLevel = (score: number) => {
      if (score >= benchmarks.excellent.min) return benchmarks.excellent;
      if (score >= benchmarks.good.min) return benchmarks.good;
      if (score >= benchmarks.average.min) return benchmarks.average;
      if (score >= benchmarks.belowAverage.min) return benchmarks.belowAverage;
      return benchmarks.poor;
    };

    // Correlation analysis
    const calculateCorrelation = (x: number[], y: number[]): number => {
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
      );

      return denominator === 0 ? 0 : numerator / denominator;
    };

    const submissions = totalRows.map((agent) => agent.submitted);
    const firstQuotes = totalRows.map((agent) => agent.firstQuotes);
    const preferredRates = totalRows.map((agent) => agent.preferredPercent);

    const correlations = {
      quotesToSubmissions: calculateCorrelation(firstQuotes, submissions),
      preferredToSubmissions: calculateCorrelation(preferredRates, submissions),
      efficiencyToQuality: calculateCorrelation(
        efficiencyScores,
        qualityScores
      ),
    };

    // Performance distribution
    const performanceDistribution = conversionRates.reduce((acc, rate) => {
      const level = getBenchmarkLevel(rate);
      acc[level.label] = (acc[level.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      conversionStats: calculateStats(conversionRates),
      efficiencyStats: calculateStats(efficiencyScores),
      qualityStats: calculateStats(qualityScores),
      submissionStats: calculateStats(submissions),
      correlations,
      performanceDistribution,
      totalAgents: totalRows.length,
      benchmarks,
      getBenchmarkLevel,
    };
  }, [data]);

  if (!statistics) {
    return (
      <Box p={3}>
        <Typography variant="h6">
          No data available for statistical analysis
        </Typography>
      </Box>
    );
  }

  const StatCard: React.FC<{
    title: string;
    stats: StatisticalMetrics;
    unit?: string;
  }> = ({ title, stats, unit = "" }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Mean
            </Typography>
            <Typography variant="h6">
              {stats.mean}
              {unit}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Median
            </Typography>
            <Typography variant="h6">
              {stats.median}
              {unit}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Std Dev
            </Typography>
            <Typography variant="h6">
              {stats.standardDeviation}
              {unit}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              CV
            </Typography>
            <Typography variant="h6">
              {stats.coefficientOfVariation}%
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="textSecondary">
              Q1
            </Typography>
            <Typography variant="body1">
              {stats.q1}
              {unit}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="textSecondary">
              Q3
            </Typography>
            <Typography variant="body1">
              {stats.q3}
              {unit}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="textSecondary">
              Range
            </Typography>
            <Typography variant="body1">
              {stats.range}
              {unit}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: "bold" }}>
        📈 Statistical Analysis & Benchmarks
      </Typography>

      {/* Key Statistical Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Conversion Rate"
            stats={statistics.conversionStats}
            unit="%"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Efficiency Score"
            stats={statistics.efficiencyStats}
            unit="%"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Quality Score"
            stats={statistics.qualityStats}
            unit="%"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard title="Submissions" stats={statistics.submissionStats} />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Correlation Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🔗 Correlation Analysis
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  First Quotes → Submissions
                </Typography>
                <Box display="flex" alignItems="center">
                  <LinearProgress
                    variant="determinate"
                    value={
                      Math.abs(statistics.correlations.quotesToSubmissions) *
                      100
                    }
                    sx={{ flexGrow: 1, mr: 2 }}
                    color={
                      statistics.correlations.quotesToSubmissions > 0.7
                        ? "success"
                        : "warning"
                    }
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {statistics.correlations.quotesToSubmissions.toFixed(3)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Preferred Rate → Submissions
                </Typography>
                <Box display="flex" alignItems="center">
                  <LinearProgress
                    variant="determinate"
                    value={
                      Math.abs(statistics.correlations.preferredToSubmissions) *
                      100
                    }
                    sx={{ flexGrow: 1, mr: 2 }}
                    color={
                      statistics.correlations.preferredToSubmissions > 0.5
                        ? "success"
                        : "warning"
                    }
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {statistics.correlations.preferredToSubmissions.toFixed(3)}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  Efficiency → Quality
                </Typography>
                <Box display="flex" alignItems="center">
                  <LinearProgress
                    variant="determinate"
                    value={
                      Math.abs(statistics.correlations.efficiencyToQuality) *
                      100
                    }
                    sx={{ flexGrow: 1, mr: 2 }}
                    color={
                      statistics.correlations.efficiencyToQuality > 0.3
                        ? "success"
                        : "warning"
                    }
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {statistics.correlations.efficiencyToQuality.toFixed(3)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                📊 Performance Distribution
              </Typography>
              {Object.entries(statistics.performanceDistribution).map(
                ([level, count]) => {
                  const benchmark = Object.values(statistics.benchmarks).find(
                    (b) => b.label === level
                  );
                  const percentage = (
                    (count / statistics.totalAgents) *
                    100
                  ).toFixed(1);

                  return (
                    <Box key={level} sx={{ mb: 2 }}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Chip
                          label={level}
                          size="small"
                          sx={{ bgcolor: benchmark?.color, color: "white" }}
                        />
                        <Typography variant="body2">
                          {count} agents ({percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Number(percentage)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  );
                }
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Benchmarks Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🎯 Performance Benchmarks & Interpretation
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Metric</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Excellent (90%+)</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Good (75-89%)</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Average (60-74%)</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Below Avg (45-59%)</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Poor (&lt;45%)</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <strong>Conversion Rate</strong>
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#e8f5e8" }}>
                        Industry leading performance
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#f1f8e9" }}>
                        Above average performance
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#fff3e0" }}>
                        Meets expectations
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffebee" }}>
                        Needs improvement
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffcdd2" }}>
                        Requires immediate attention
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <strong>Efficiency Score</strong>
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#e8f5e8" }}>
                        Optimal resource utilization
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#f1f8e9" }}>
                        Good productivity
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#fff3e0" }}>
                        Standard efficiency
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffebee" }}>
                        Low productivity
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffcdd2" }}>
                        Poor resource management
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <strong>Quality Score</strong>
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#e8f5e8" }}>
                        Premium client base
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#f1f8e9" }}>
                        High-quality prospects
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#fff3e0" }}>
                        Mixed quality portfolio
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffebee" }}>
                        Lower quality leads
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#ffcdd2" }}>
                        High-risk client base
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistical Insights */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: "#f8f9fa" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🧠 Statistical Insights & Recommendations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    gutterBottom
                  >
                    Variability Analysis:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Conversion Rate CV:{" "}
                    {statistics.conversionStats.coefficientOfVariation}%
                    {statistics.conversionStats.coefficientOfVariation > 30
                      ? " (High variability - consider standardizing processes)"
                      : " (Acceptable consistency)"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Efficiency Score CV:{" "}
                    {statistics.efficiencyStats.coefficientOfVariation}%
                    {statistics.efficiencyStats.coefficientOfVariation > 25
                      ? " (High variability - training opportunities exist)"
                      : " (Good consistency)"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    gutterBottom
                  >
                    Correlation Insights:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Strong quote-to-submission correlation (
                    {statistics.correlations.quotesToSubmissions.toFixed(2)})
                    indicates
                    {statistics.correlations.quotesToSubmissions > 0.7
                      ? " effective lead qualification"
                      : " potential lead quality issues"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Preferred rate correlation (
                    {statistics.correlations.preferredToSubmissions.toFixed(2)})
                    suggests
                    {statistics.correlations.preferredToSubmissions > 0.3
                      ? " quality-focused approach"
                      : " volume-over-quality strategy"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatisticalSummary;
