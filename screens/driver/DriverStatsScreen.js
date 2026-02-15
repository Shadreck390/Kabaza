// screens/driver/DriverStatsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const STATS_PERIODS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'week', label: 'Week', icon: 'date-range' },
  { id: 'month', label: 'Month', icon: 'calendar-today' },
  { id: 'year', label: 'Year', icon: 'event' },
  { id: 'all', label: 'All Time', icon: 'history' },
];

export default function DriverStatsScreen() {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('earnings');
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    loadStatsData();
  }, [selectedPeriod]);

  const loadStatsData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call with more detailed data
      setTimeout(() => {
        const mockData = {
          today: generateTodayData(),
          week: generateWeekData(),
          month: generateMonthData(),
          year: generateYearData(),
          all: generateAllTimeData(),
        };

        setStatsData(mockData[selectedPeriod]);
        
        // Generate comparison data (vs previous period)
        const comparison = generateComparisonData(selectedPeriod, mockData[selectedPeriod]);
        setComparisonData(comparison);
        
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTodayData = () => ({
    summary: {
      totalRides: 8,
      totalEarnings: 12500,
      onlineHours: 6.5,
      averageRating: 4.8,
      acceptanceRate: 92,
      cancellationRate: 3,
      totalDistance: 48, // km
      fuelCost: 2500,
      netEarnings: 10000,
      peakEarningsHour: 10,
      peakRidesHour: 8,
    },
    hourlyData: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      rides: Math.floor(Math.random() * 4),
      earnings: Math.floor(Math.random() * 2000),
      distance: Math.floor(Math.random() * 10),
    })),
    rideTypes: [
      { type: 'Kabaza', count: 5, earnings: 6250, color: '#3B82F6' },
      { type: 'Taxi', count: 2, earnings: 4000, color: '#22C55E' },
      { type: 'Delivery', count: 1, earnings: 2250, color: '#F59E0B' },
    ],
    performance: {
      avgSpeed: '32 km/h',
      fuelEfficiency: '18 km/L',
      avgRideTime: '15 mins',
      idleTime: '1.2 hours',
      bestArea: 'Area 3',
      worstArea: 'Suburb A',
      satisfactionScore: 4.7,
    },
    goals: {
      rides: { target: 10, current: 8 },
      earnings: { target: 15000, current: 12500 },
      rating: { target: 4.9, current: 4.8 },
    },
  });

  const generateWeekData = () => ({
    summary: {
      totalRides: 56,
      totalEarnings: 87500,
      onlineHours: 42,
      averageRating: 4.7,
      acceptanceRate: 88,
      cancellationRate: 5,
      totalDistance: 420,
      fuelCost: 21000,
      netEarnings: 66500,
      peakEarningsDay: 'Saturday',
      peakRidesDay: 'Saturday',
    },
    dailyData: [
      { day: 'Mon', rides: 7, earnings: 12000, distance: 60, hours: 6 },
      { day: 'Tue', rides: 8, earnings: 12500, distance: 65, hours: 6.5 },
      { day: 'Wed', rides: 7, earnings: 11000, distance: 55, hours: 5.5 },
      { day: 'Thu', rides: 8, earnings: 13000, distance: 70, hours: 7 },
      { day: 'Fri', rides: 9, earnings: 14500, distance: 80, hours: 7.5 },
      { day: 'Sat', rides: 10, earnings: 15500, distance: 85, hours: 8 },
      { day: 'Sun', rides: 7, earnings: 9000, distance: 45, hours: 4.5 },
    ],
    rideTypes: [
      { type: 'Kabaza', count: 35, earnings: 55000, color: '#3B82F6' },
      { type: 'Taxi', count: 14, earnings: 25000, color: '#22C55E' },
      { type: 'Delivery', count: 7, earnings: 7500, color: '#F59E0B' },
    ],
    performance: {
      avgSpeed: '35 km/h',
      fuelEfficiency: '17 km/L',
      avgRideTime: '18 mins',
      idleTime: '8.5 hours',
      bestArea: 'City Center',
      worstArea: 'Industrial Area',
      satisfactionScore: 4.6,
    },
    goals: {
      rides: { target: 60, current: 56 },
      earnings: { target: 90000, current: 87500 },
      rating: { target: 4.8, current: 4.7 },
    },
  });

  const generateMonthData = () => ({
    summary: {
      totalRides: 240,
      totalEarnings: 350000,
      onlineHours: 180,
      averageRating: 4.75,
      acceptanceRate: 85,
      cancellationRate: 4,
      totalDistance: 1800,
      fuelCost: 90000,
      netEarnings: 260000,
      peakEarningsDay: 15,
      peakRidesDay: 15,
    },
    dailyData: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      rides: Math.floor(Math.random() * 15) + 5,
      earnings: Math.floor(Math.random() * 20000) + 8000,
    })),
    // ... similar structure
  });

  const generateYearData = () => ({
    summary: {
      totalRides: 2880,
      totalEarnings: 4200000,
      onlineHours: 2160,
      averageRating: 4.8,
      acceptanceRate: 87,
      cancellationRate: 3,
      totalDistance: 21600,
      fuelCost: 1080000,
      netEarnings: 3120000,
      peakEarningsMonth: 'December',
      peakRidesMonth: 'December',
    },
    // ... similar structure
  });

  const generateAllTimeData = () => ({
    summary: {
      totalRides: 12500,
      totalEarnings: 18750000,
      onlineHours: 9375,
      averageRating: 4.82,
      acceptanceRate: 89,
      cancellationRate: 2,
      totalDistance: 93750,
      fuelCost: 4687500,
      netEarnings: 14062500,
      totalPassengers: 18750,
      joinDate: '2022-01-15',
    },
    // ... similar structure
  });

  const generateComparisonData = (period, data) => {
    const comparisons = {
      rides: { value: data.summary.totalRides, change: 12, trend: 'up' },
      earnings: { value: data.summary.totalEarnings, change: 18, trend: 'up' },
      rating: { value: data.summary.averageRating, change: 0.2, trend: 'up' },
      hours: { value: data.summary.onlineHours, change: 2.5, trend: 'up' },
      acceptance: { value: data.summary.acceptanceRate, change: 2, trend: 'up' },
      cancellation: { value: data.summary.cancellationRate, change: -1, trend: 'down' },
    };
    return comparisons;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatsData();
  };

  const handleShareStats = async () => {
    try {
      const message = `🚗 My Kabaza Driver Stats (${selectedPeriod.toUpperCase()})
📊 Rides: ${statsData.summary.totalRides}
💰 Earnings: MK ${statsData.summary.totalEarnings.toLocaleString()}
⭐ Rating: ${statsData.summary.averageRating.toFixed(1)}
⏱️ Online: ${statsData.summary.onlineHours} hours
📈 Acceptance: ${statsData.summary.acceptanceRate}%
📉 Cancellation: ${statsData.summary.cancellationRate}%

#KabazaDriver #Stats`;

      await Share.share({
        message,
        title: 'My Driver Statistics',
      });
    } catch (error) {
      console.error('Error sharing stats:', error);
    }
  };

  const handleExportData = () => {
    setShowExportModal(true);
  };

  const renderSummaryCards = () => {
    const cards = [
      {
        key: 'rides',
        label: 'Total Rides',
        value: statsData.summary.totalRides,
        icon: 'directions-car',
        color: '#3B82F6',
        unit: '',
        comparison: comparisonData?.rides,
      },
      {
        key: 'earnings',
        label: 'Earnings',
        value: statsData.summary.totalEarnings,
        icon: 'attach-money',
        color: '#22C55E',
        unit: 'MK ',
        comparison: comparisonData?.earnings,
      },
      {
        key: 'rating',
        label: 'Rating',
        value: statsData.summary.averageRating.toFixed(1),
        icon: 'star',
        color: '#F59E0B',
        unit: '',
        comparison: comparisonData?.rating,
      },
      {
        key: 'hours',
        label: 'Online Hours',
        value: statsData.summary.onlineHours,
        icon: 'timer',
        color: '#8B5CF6',
        unit: '',
        comparison: comparisonData?.hours,
      },
    ];

    return (
      <View style={styles.summaryGrid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={styles.summaryCard}
            onPress={() => setSelectedMetric(card.key)}
          >
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: `${card.color}15` }]}>
                <MaterialIcon name={card.icon} size={20} color={card.color} />
              </View>
              {card.comparison && (
                <View style={[
                  styles.changeBadge,
                  card.comparison.trend === 'up' ? styles.changeUp : styles.changeDown
                ]}>
                  <MaterialIcon 
                    name={card.comparison.trend === 'up' ? 'trending-up' : 'trending-down'} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.changeText}>
                    {card.comparison.trend === 'up' ? '+' : ''}{card.comparison.change}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.summaryValue}>
              {card.unit}{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            
            {selectedMetric === card.key && (
              <View style={[styles.selectedIndicator, { backgroundColor: card.color }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderProgressChart = () => {
    const progressData = {
      labels: ["Rides", "Earnings", "Rating"],
      data: [
        statsData.goals.rides.current / statsData.goals.rides.target,
        statsData.goals.earnings.current / statsData.goals.earnings.target,
        statsData.goals.rating.current / statsData.goals.rating.target,
      ],
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Goals Progress</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GoalsScreen')}>
            <Text style={styles.chartAction}>Set Goals</Text>
          </TouchableOpacity>
        </View>
        <ProgressChart
          data={progressData}
          width={width - 64}
          height={160}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 2,
            color: (opacity = 1, index) => {
              const colors = ['#3B82F6', '#22C55E', '#F59E0B'];
              return `rgba(${parseInt(colors[index].slice(1, 3), 16)}, ${parseInt(colors[index].slice(3, 5), 16)}, ${parseInt(colors[index].slice(5, 7), 16)}, ${opacity})`;
            },
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
          hideLegend={false}
        />
        <View style={styles.goalsDetails}>
          {progressData.labels.map((label, index) => (
            <View key={label} style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <View style={[styles.goalColor, { backgroundColor: progressData.data[index] >= 1 ? '#22C55E' : '#F59E0B' }]} />
                <Text style={styles.goalLabel}>{label}</Text>
              </View>
              <Text style={styles.goalProgress}>
                {Math.round(progressData.data[index] * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRidesChart = () => {
    const labels = selectedPeriod === 'today' 
      ? statsData.hourlyData?.map(h => `${h.hour}h`) 
      : statsData.dailyData?.map(d => typeof d.day === 'number' ? d.day.toString() : d.day.substring(0, 3));
    
    const data = selectedPeriod === 'today'
      ? statsData.hourlyData?.map(h => h.rides)
      : statsData.dailyData?.map(d => d.rides);

    const chartData = {
      labels: labels || [],
      datasets: [{
        data: data || [],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'today' ? 'Hourly Rides' : `${selectedPeriod === 'week' ? 'Daily' : selectedPeriod} Rides`}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RidesDetails')}>
            <Text style={styles.chartAction}>Details</Text>
          </TouchableOpacity>
        </View>
        <LineChart
          data={chartData}
          width={width - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: selectedPeriod === 'today' ? '4' : '5',
              strokeWidth: '2',
              stroke: '#3B82F6',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E5E7EB',
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero
          segments={selectedPeriod === 'today' ? 6 : 5}
        />
      </View>
    );
  };

  const renderEarningsChart = () => {
    const earningsData = selectedPeriod === 'today'
      ? statsData.hourlyData?.map(h => h.earnings / 1000)
      : statsData.dailyData?.map(d => d.earnings / 1000);

    const labels = selectedPeriod === 'today'
      ? statsData.hourlyData?.map(h => `${h.hour}h`)
      : statsData.dailyData?.map(d => typeof d.day === 'number' ? d.day.toString() : d.day.substring(0, 3));

    const chartData = {
      labels: labels || [],
      datasets: [{
        data: earningsData || [],
      }],
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'today' ? 'Hourly Earnings (K)' : `${selectedPeriod === 'week' ? 'Daily' : selectedPeriod} Earnings (K)`}
          </Text>
          <View style={styles.chartActions}>
            <Text style={styles.netEarnings}>
              Net: MK {statsData.summary.netEarnings?.toLocaleString()}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('EarningsBreakdown')}>
              <Text style={styles.chartAction}>Breakdown</Text>
            </TouchableOpacity>
          </View>
        </View>
        <BarChart
          data={chartData}
          width={width - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: selectedPeriod === 'today' ? 0.4 : 0.6,
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E5E7EB',
              strokeWidth: 1,
            },
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          fromZero
          withInnerLines={true}
          segments={5}
        />
      </View>
    );
  };

  const renderRideTypeDistribution = () => {
    const totalEarnings = statsData.rideTypes.reduce((sum, type) => sum + type.earnings, 0);
    const totalRides = statsData.rideTypes.reduce((sum, type) => sum + type.count, 0);

    const pieData = statsData.rideTypes.map((type, index) => ({
      name: type.type,
      population: (type.earnings / totalEarnings) * 100,
      color: type.color,
      legendFontColor: '#000',
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Earnings by Ride Type</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RideTypeAnalysis')}>
            <Text style={styles.chartAction}>Analysis</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.pieChartContainer}>
          <PieChart
            data={pieData}
            width={width - 64}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
            hasLegend={false}
          />
        </View>
        
        <View style={styles.rideTypeDetails}>
          {statsData.rideTypes.map((type, index) => {
            const percentage = ((type.earnings / totalEarnings) * 100).toFixed(1);
            const ridesPercentage = ((type.count / totalRides) * 100).toFixed(1);
            
            return (
              <TouchableOpacity key={type.type} style={styles.rideTypeItem}>
                <View style={styles.rideTypeHeader}>
                  <View style={[styles.rideTypeColor, { backgroundColor: type.color }]} />
                  <Text style={styles.rideTypeName}>{type.type}</Text>
                  <Text style={styles.rideTypePercentage}>{percentage}%</Text>
                </View>
                <View style={styles.rideTypeStats}>
                  <Text style={styles.rideTypeStat}>
                    MK {type.earnings.toLocaleString()} • {type.count} rides ({ridesPercentage}%)
                  </Text>
                  <Text style={styles.rideTypeAvg}>
                    Avg: MK {(type.earnings / type.count).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPerformanceMetrics = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PerformanceDetails')}>
          <Text style={styles.seeAllText}>Details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <MaterialCommunityIcon name="speedometer" size={24} color="#3B82F6" />
          <Text style={styles.metricValue}>{statsData.performance.avgSpeed}</Text>
          <Text style={styles.metricLabel}>Avg Speed</Text>
          <Text style={styles.metricSubtext}>Optimal range</Text>
        </View>
        
        <View style={styles.metricItem}>
          <MaterialCommunityIcon name="gas-station" size={24} color="#22C55E" />
          <Text style={styles.metricValue}>{statsData.performance.fuelEfficiency}</Text>
          <Text style={styles.metricLabel}>Fuel Efficiency</Text>
          <Text style={styles.metricSubtext}>Above average</Text>
        </View>
        
        <View style={styles.metricItem}>
          <MaterialIcon name="schedule" size={24} color="#F59E0B" />
          <Text style={styles.metricValue}>{statsData.performance.avgRideTime}</Text>
          <Text style={styles.metricLabel}>Avg Ride Time</Text>
          <Text style={styles.metricSubtext}>Efficient</Text>
        </View>
        
        <View style={styles.metricItem}>
          <MaterialIcon name="hourglass-empty" size={24} color="#EF4444" />
          <Text style={styles.metricValue}>{statsData.performance.idleTime}</Text>
          <Text style={styles.metricLabel}>Idle Time</Text>
          <Text style={styles.metricSubtext}>Can improve</Text>
        </View>
        
        <View style={styles.metricItem}>
          <MaterialIcon name="thumb-up" size={24} color="#8B5CF6" />
          <Text style={styles.metricValue}>{statsData.performance.satisfactionScore}/5</Text>
          <Text style={styles.metricLabel}>Satisfaction</Text>
          <Text style={styles.metricSubtext}>Excellent</Text>
        </View>
        
        <View style={styles.metricItem}>
          <MaterialIcon name="place" size={24} color="#EC4899" />
          <Text style={styles.metricValue}>{statsData.performance.bestArea}</Text>
          <Text style={styles.metricLabel}>Best Area</Text>
          <Text style={styles.metricSubtext}>Highest earnings</Text>
        </View>
      </View>
    </View>
  );

  const renderAcceptanceStats = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Acceptance & Cancellation</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DriverStatsDetails')}>
          <Text style={styles.seeAllText}>Trends</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <View style={styles.statTitleContainer}>
              <MaterialIcon name="check-circle" size={18} color="#22C55E" />
              <Text style={styles.statLabel}>Acceptance Rate</Text>
            </View>
            {comparisonData?.acceptance && (
              <View style={[styles.changePill, styles.changeUp]}>
                <Text style={styles.changePillText}>
                  +{comparisonData.acceptance.change}%
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statValue}>{statsData.summary.acceptanceRate}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${statsData.summary.acceptanceRate}%`, 
                  backgroundColor: '#22C55E',
                  borderTopRightRadius: statsData.summary.acceptanceRate === 100 ? 4 : 0,
                  borderBottomRightRadius: statsData.summary.acceptanceRate === 100 ? 4 : 0,
                }
              ]} 
            />
          </View>
          <Text style={styles.statDescription}>
            Target: 90% • {statsData.summary.totalRides} rides accepted
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <View style={styles.statTitleContainer}>
              <MaterialIcon name="cancel" size={18} color="#EF4444" />
              <Text style={styles.statLabel}>Cancellation Rate</Text>
            </View>
            {comparisonData?.cancellation && (
              <View style={[styles.changePill, styles.changeDown]}>
                <Text style={styles.changePillText}>
                  {comparisonData.cancellation.change}%
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statValue}>{statsData.summary.cancellationRate}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${statsData.summary.cancellationRate}%`, 
                  backgroundColor: '#EF4444',
                  borderTopRightRadius: statsData.summary.cancellationRate === 100 ? 4 : 0,
                  borderBottomRightRadius: statsData.summary.cancellationRate === 100 ? 4 : 0,
                }
              ]} 
            />
          </View>
          <Text style={styles.statDescription}>
            Target: {'<5%'} • Keep it low for better matching
          </Text>
        </View>
      </View>
    </View>
  );

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowExportModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export Statistics</Text>
            <TouchableOpacity onPress={() => setShowExportModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              Export {selectedPeriod} statistics as:
            </Text>
            
            <TouchableOpacity style={styles.exportOption}>
              <MaterialIcon name="picture-as-pdf" size={24} color="#EF4444" />
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>PDF Report</Text>
                <Text style={styles.exportOptionDescription}>
                  Detailed report with charts and analysis
                </Text>
              </View>
              <MaterialIcon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption}>
              <MaterialIcon name="grid-on" size={24} color="#22C55E" />
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>Excel/CSV</Text>
                <Text style={styles.exportOptionDescription}>
                  Raw data for further analysis
                </Text>
              </View>
              <MaterialIcon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={handleShareStats}>
              <MaterialIcon name="share" size={24} color="#3B82F6" />
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>Share Summary</Text>
                <Text style={styles.exportOptionDescription}>
                  Share key stats via social media
                </Text>
              </View>
              <MaterialIcon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Statistics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleExportData}
          >
            <MaterialIcon name="download" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleShareStats}
          >
            <MaterialIcon name="share" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.periodsContainer}
        contentContainerStyle={styles.periodsContent}
      >
        {STATS_PERIODS.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              selectedPeriod === period.id && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.id)}
          >
            <MaterialIcon 
              name={period.icon} 
              size={16} 
              color={selectedPeriod === period.id ? '#FFFFFF' : '#666'} 
              style={styles.periodIcon}
            />
            <Text style={[
              styles.periodText,
              selectedPeriod === period.id && styles.periodTextActive,
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick Stats Bar */}
      {statsData && (
        <View style={styles.quickStatsBar}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{statsData.summary.totalDistance} km</Text>
            <Text style={styles.quickStatLabel}>Distance</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>MK {statsData.summary.fuelCost?.toLocaleString()}</Text>
            <Text style={styles.quickStatLabel}>Fuel Cost</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              MK {(statsData.summary.netEarnings / statsData.summary.onlineHours).toFixed(0)}/h
            </Text>
            <Text style={styles.quickStatLabel}>Hourly Rate</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderSummaryCards()}
          {renderProgressChart()}
          {renderRidesChart()}
          {renderEarningsChart()}
          {renderRideTypeDistribution()}
          {renderPerformanceMetrics()}
          {renderAcceptanceStats()}
          
          {/* Tips & Recommendations */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
              <Text style={styles.tipsTitle}>Performance Tips</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcon name="check-circle" size={16} color="#22C55E" />
              <Text style={styles.tipText}>
                Your acceptance rate is excellent! Keep it above 85% for priority matching.
              </Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcon name="schedule" size={16} color="#3B82F6" />
              <Text style={styles.tipText}>
                Try working during {selectedPeriod === 'today' ? statsData.summary.peakEarningsHour + ':00' : statsData.summary.peakEarningsDay} for higher earnings.
              </Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcon name="place" size={16} color="#8B5CF6" />
              <Text style={styles.tipText}>
                Focus on {statsData.performance.bestArea} area where you earn the most.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Export Modal */}
      {renderExportModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  periodButtonActive: {
    backgroundColor: '#22C55E',
  },
  periodIcon: {
    marginRight: 6,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  quickStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#666',
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  summaryCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  changeUp: {
    backgroundColor: '#22C55E',
  },
  changeDown: {
    backgroundColor: '#EF4444',
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  seeAllText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  netEarnings: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chartAction: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  goalsDetails: {
    marginTop: 16,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goalLabel: {
    fontSize: 14,
    color: '#000000',
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  rideTypeDetails: {
    marginTop: 16,
  },
  rideTypeItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  rideTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideTypeColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rideTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  rideTypePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  rideTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideTypeStat: {
    fontSize: 12,
    color: '#666',
  },
  rideTypeAvg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  metricItem: {
    width: (width - 64) / 3,
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  changePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  changePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: '#F0F9F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  exportOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 12,
    color: '#666',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});