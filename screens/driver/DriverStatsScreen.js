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
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');

const STATS_PERIODS = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function DriverStatsScreen() {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatsData();
  }, [selectedPeriod]);

  const loadStatsData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const mockData = {
          day: {
            summary: {
              totalRides: 8,
              totalEarnings: 12500,
              onlineHours: 6.5,
              averageRating: 4.8,
              acceptanceRate: 92,
              cancellationRate: 3,
            },
            hourlyData: Array.from({ length: 12 }, (_, i) => ({
              hour: `${i + 8}:00`,
              rides: Math.floor(Math.random() * 4),
              earnings: Math.floor(Math.random() * 2000),
            })),
            rideTypes: [
              { type: 'Kabaza', count: 5, percentage: 62.5 },
              { type: 'Taxi', count: 2, percentage: 25 },
              { type: 'Delivery', count: 1, percentage: 12.5 },
            ],
            performance: {
              peakHour: '10:00 AM',
              bestArea: 'Area 3',
              avgSpeed: '32 km/h',
              fuelEfficiency: '18 km/L',
            },
          },
          week: {
            summary: {
              totalRides: 56,
              totalEarnings: 87500,
              onlineHours: 42,
              averageRating: 4.7,
              acceptanceRate: 88,
              cancellationRate: 5,
            },
            dailyData: [
              { day: 'Mon', rides: 7, earnings: 12000 },
              { day: 'Tue', rides: 8, earnings: 12500 },
              { day: 'Wed', rides: 7, earnings: 11000 },
              { day: 'Thu', rides: 8, earnings: 13000 },
              { day: 'Fri', rides: 9, earnings: 14500 },
              { day: 'Sat', rides: 10, earnings: 15500 },
              { day: 'Sun', rides: 7, earnings: 9000 },
            ],
            rideTypes: [
              { type: 'Kabaza', count: 35, percentage: 62.5 },
              { type: 'Taxi', count: 14, percentage: 25 },
              { type: 'Delivery', count: 7, percentage: 12.5 },
            ],
            performance: {
              peakDay: 'Saturday',
              bestArea: 'City Center',
              avgSpeed: '35 km/h',
              fuelEfficiency: '17 km/L',
            },
          },
          // ... similar structure for month and year
        };

        setStatsData(mockData[selectedPeriod]);
        setLoading(false);
        setRefreshing(false);
      }, 1500);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatsData();
  };

  const renderSummaryCards = () => {
    const cards = [
      {
        key: 'rides',
        label: 'Total Rides',
        value: statsData.summary.totalRides,
        icon: 'directions-car',
        color: '#3B82F6',
        change: '+12%',
      },
      {
        key: 'earnings',
        label: 'Earnings',
        value: `MK ${statsData.summary.totalEarnings.toLocaleString()}`,
        icon: 'attach-money',
        color: '#22C55E',
        change: '+18%',
      },
      {
        key: 'rating',
        label: 'Rating',
        value: statsData.summary.averageRating.toFixed(1),
        icon: 'star',
        color: '#F59E0B',
        change: '+0.2',
      },
      {
        key: 'hours',
        label: 'Online Hours',
        value: statsData.summary.onlineHours,
        icon: 'timer',
        color: '#8B5CF6',
        change: '+2.5h',
      },
    ];

    return (
      <View style={styles.summaryGrid}>
        {cards.map((card) => (
          <View key={card.key} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: `${card.color}15` }]}>
                <MaterialIcon name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={[styles.summaryChange, { color: '#22C55E' }]}>
                {card.change}
              </Text>
            </View>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRidesChart = () => {
    const chartData = {
      labels: statsData.dailyData?.map(d => d.day.substring(0, 3)) || 
               statsData.hourlyData?.map(h => h.hour.substring(0, 2)) || [],
      datasets: [{
        data: statsData.dailyData?.map(d => d.rides) || 
              statsData.hourlyData?.map(h => h.rides) || [],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'day' ? 'Hourly Rides' : 'Daily Rides'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.chartAction}>Details</Text>
          </TouchableOpacity>
        </View>
        <LineChart
          data={chartData}
          width={width - 64}
          height={200}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#3B82F6',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero
        />
      </View>
    );
  };

  const renderEarningsChart = () => {
    const earningsData = statsData.dailyData?.map(d => d.earnings / 1000) || 
                         statsData.hourlyData?.map(h => h.earnings / 1000) || [];

    const chartData = {
      labels: statsData.dailyData?.map(d => d.day.substring(0, 3)) || 
               statsData.hourlyData?.map(h => h.hour.substring(0, 2)) || [],
      datasets: [{
        data: earningsData,
      }],
    };

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'day' ? 'Hourly Earnings (K)' : 'Daily Earnings (K)'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.chartAction}>Details</Text>
          </TouchableOpacity>
        </View>
        <BarChart
          data={chartData}
          width={width - 64}
          height={200}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: 0.6,
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          fromZero
        />
      </View>
    );
  };

  const renderRideTypeDistribution = () => {
    const pieData = statsData.rideTypes.map((type, index) => ({
      name: type.type,
      population: type.percentage,
      color: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'][index % 4],
      legendFontColor: '#000',
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Ride Type Distribution</Text>
        <View style={styles.pieChartContainer}>
          <PieChart
            data={pieData}
            width={width - 64}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
        <View style={styles.legendContainer}>
          {statsData.rideTypes.map((type, index) => (
            <View key={type.type} style={styles.legendItem}>
              <View style={[styles.legendColor, { 
                backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'][index % 4] 
              }]} />
              <Text style={styles.legendLabel}>{type.type}</Text>
              <Text style={styles.legendValue}>{type.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPerformanceMetrics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Metrics</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <MaterialIcon name="speed" size={24} color="#3B82F6" />
          <Text style={styles.metricValue}>{statsData.performance.avgSpeed}</Text>
          <Text style={styles.metricLabel}>Avg Speed</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialIcon name="local-gas-station" size={24} color="#22C55E" />
          <Text style={styles.metricValue}>{statsData.performance.fuelEfficiency}</Text>
          <Text style={styles.metricLabel}>Fuel Efficiency</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialIcon name="schedule" size={24} color="#F59E0B" />
          <Text style={styles.metricValue}>
            {selectedPeriod === 'day' ? statsData.performance.peakHour : statsData.performance.peakDay}
          </Text>
          <Text style={styles.metricLabel}>Peak {selectedPeriod === 'day' ? 'Hour' : 'Day'}</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialIcon name="place" size={24} color="#EF4444" />
          <Text style={styles.metricValue}>{statsData.performance.bestArea}</Text>
          <Text style={styles.metricLabel}>Best Area</Text>
        </View>
      </View>
    </View>
  );

  const renderAcceptanceStats = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Acceptance & Cancellation</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DriverStatsDetails')}>
          <Text style={styles.seeAllText}>Details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Acceptance Rate</Text>
            <MaterialIcon name="check-circle" size={16} color="#22C55E" />
          </View>
          <Text style={styles.statValue}>{statsData.summary.acceptanceRate}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${statsData.summary.acceptanceRate}%`, backgroundColor: '#22C55E' }
              ]} 
            />
          </View>
          <Text style={styles.statChange}>+2% from last {selectedPeriod}</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Cancellation Rate</Text>
            <MaterialIcon name="cancel" size={16} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{statsData.summary.cancellationRate}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${statsData.summary.cancellationRate}%`, backgroundColor: '#EF4444' }
              ]} 
            />
          </View>
          <Text style={styles.statChange}>-1% from last {selectedPeriod}</Text>
        </View>
      </View>
    </View>
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
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {/* Share stats */}}
        >
          <MaterialIcon name="share" size={24} color="#000000" />
        </TouchableOpacity>
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
            <Text style={[
              styles.periodText,
              selectedPeriod === period.id && styles.periodTextActive,
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          {renderRidesChart()}
          {renderEarningsChart()}
          {renderRideTypeDistribution()}
          {renderPerformanceMetrics()}
          {renderAcceptanceStats()}
        </ScrollView>
      )}
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
  shareButton: {
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
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  periodButtonActive: {
    backgroundColor: '#22C55E',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodTextActive: {
    color: '#FFFFFF',
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
  summaryChange: {
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 16,
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
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
  pieChartContainer: {
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  metricItem: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 12,
    margin: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
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
  statLabel: {
    fontSize: 14,
    color: '#000000',
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
  statChange: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});