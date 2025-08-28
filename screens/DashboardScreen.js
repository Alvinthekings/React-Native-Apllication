import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Dimensions,
  Animated, Easing, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  fetchViolations, 
  fetchViolationStats, 
  fetchStudents 
} from '../api'; // Adjust the import path as needed

const SidebarMenu = ({ isOpen, onClose, user }) => {
  const navigation = useNavigation();
  
  const menuItems = [
{
  id: 1,
  title: 'Home',
  icon: 'home-outline',
  action: () => {
    onClose();
    navigation.navigate('Home', { user });
  }
},
  { 
    id: 2, 
    title: 'Dashboard', 
    icon: 'grid-outline', 
    action: () => {
      onClose();
      navigation.navigate('Dashboard', { user });
    }
  },
  { 
    id: 3, 
    title: 'Register Face', 
    icon: 'person-add-outline', 
    action: () => {
      onClose();
      navigation.navigate('RegisterFace');
    }
  },
  { 
    id: 4, 
    title: 'Auto Detect', 
    icon: 'camera-outline', 
    action: () => {
      onClose();
      navigation.navigate('AutoDetectScreen');
    }
  },
  { 
    id: 5, 
    title: 'Violations', 
    icon: 'alert-circle-outline', 
    action: () => {
      onClose();
      navigation.navigate('ViolationHistoryScreen');
    }
  },
  { 
    id: 6, 
    title: 'Students', 
    icon: 'people-outline', 
    action: () => {
      onClose();
      navigation.navigate('StudentFacesScreen');
    }
  },
  { 
    id: 7, 
    title: 'Settings', 
    icon: 'settings-outline', 
    action: () => {
      onClose();
      navigation.navigate('SettingsScreen');
    }
  },
  { 
    id: 8, 
    title: 'Logout', 
    icon: 'log-out-outline', 
    action: () => {
      onClose();
      // Handle logout logic here
      navigation.navigate('Login');
    }
  },
];


  if (!isOpen) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Ionicons name="person-circle-outline" size={60} color="#2c683f" />
          <Text style={styles.sidebarUserName}>{user?.name || 'User'}</Text>
          <Text style={styles.sidebarUserRole}>Security</Text>
        </View>
        
        <ScrollView style={styles.menuItems}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.action}
            >
              <Ionicons name={item.icon} size={24} color="#2c683f" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.sidebarFooter}>
          <Text style={styles.footerText}>v1.0.0</Text>
        </View>
      </Animated.View>
    </>
  );
};

const GuardDashboardScreens = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = route.params?.user;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState([
    { id: 1, title: 'Total Students', value: '0', icon: 'people', color: '#5A8F69', bgColor: '#E8F5E9' },
    { id: 2, title: 'Violations Today', value: '0', icon: 'alert-circle', color: '#D9534F', bgColor: '#FFEBEE' },
    { id: 3, title: 'Access Today', value: '0', icon: 'log-in', color: '#5A8F69', bgColor: '#E8F5E9' },
    { id: 4, title: 'Recognition Rate', value: '0%', icon: 'checkmark-circle', color: '#5A8F69', bgColor: '#E8F5E9' },
  ]);
  const [recentViolations, setRecentViolations] = useState([]);
  const [violationTrendData, setViolationTrendData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(122, 186, 120, ${opacity})`,
        strokeWidth: 2
      }
    ]
  });
  
  const sidebarAnimation = new Animated.Value(0);
  const screenWidth = Dimensions.get('window').width;
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData().then(() => setRefreshing(false));
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data from APIs in parallel
      const [studentsResponse, violationsResponse, statsResponse] = await Promise.all([
        fetchStudents(),
        fetchViolations(),
        fetchViolationStats()
      ]);
      
      // Process students data
      const totalStudents = studentsResponse.length || 0;
      
      // Process violations data
      const today = new Date().toDateString();
      const violationsToday = violationsResponse.violations?.data?.filter(v => {
        const violationDate = new Date(v.created_at).toDateString();
        return violationDate === today;
      }).length || 0;
      
      // Get recent violations (last 3)
      const recent = violationsResponse.violations?.data?.slice(0, 3) || [];
      setRecentViolations(recent);
      
      // Process stats data
      const accessToday = statsResponse.daily_access_count || 0;
      const recognitionRate = statsResponse.recognition_rate || 0;
      
      // Update stats cards
      const updatedStats = [...statsData];
      updatedStats[0].value = totalStudents.toString();
      updatedStats[1].value = violationsToday.toString();
      updatedStats[2].value = accessToday.toString();
      updatedStats[3].value = `${recognitionRate}%`;
      setStatsData(updatedStats);
      
      // Update violation trend data (this would ideally come from your API)
      if (statsResponse.violation_trend) {
        setViolationTrendData({
          labels: statsResponse.violation_trend.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            data: statsResponse.violation_trend.data || [0, 0, 0, 0, 0, 0, 0],
            color: (opacity = 1) => `rgba(122, 186, 120, ${opacity})`,
            strokeWidth: 2
          }]
        });
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event, date, type) => {
    setShowDatePicker(null);
    if (date) {
      setDateRange(prev => ({
        ...prev,
        [type]: date
      }));
      // Optionally reload data with new date range
      // loadDashboardData();
    }
  };

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(sidebarAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }).start(() => setIsSidebarOpen(false));
    } else {
      setIsSidebarOpen(true);
      Animated.timing(sidebarAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }).start();
    }
  };

  // Sample data for charts (you would replace this with actual data from your API)
  const violationByTypeData = [
    {
      name: 'Security Breach',
      population: 45,
      color: '#D9534F',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Recognition Failure',
      population: 30,
      color: '#F0AD4E',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Access Issue',
      population: 25,
      color: '#5A8F69',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  const dailyAccessData = {
    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [
      {
        data: [120, 145, 178, 130, 90, 45],
        color: (opacity = 1) => `rgba(90, 143, 105, ${opacity})`,
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(90, 143, 105, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 104, 63, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#5A8F69'
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#5A8F69" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#7ABA78" />
      
      <SidebarMenu isOpen={isSidebarOpen} onClose={toggleSidebar} user={user} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#2c683f" />
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.userName}>Security Overview</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={32} color="#2c683f" />
          </TouchableOpacity>
        </View>

        {/* Date Filter */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statistics Overview</Text>
          <TouchableOpacity 
            style={styles.dateFilterButton}
            onPress={() => setShowDatePicker('startDate')}
          >
            <Ionicons name="calendar" size={16} color="#7ABA78" />
            <Text style={styles.dateFilterText}>
              {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {statsData.map((stat) => (
            <View key={stat.id} style={[styles.statCard, { backgroundColor: stat.bgColor }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <View>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Violation Trend Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Violation Trend (Last 7 Days)</Text>
          <LineChart
            data={violationTrendData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Charts Row */}
        <View style={styles.chartsRow}>
          <View style={[styles.chartContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.chartTitle}>Violation Types</Text>
            <PieChart
              data={violationByTypeData}
              width={screenWidth / 2 - 48}
              height={160}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          
          <View style={[styles.chartContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.chartTitle}>Daily Access Pattern</Text>
            <BarChart
              data={dailyAccessData}
              width={screenWidth / 2 - 48}
              height={160}
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              fromZero
              style={styles.chart}
            />
          </View>
        </View>

        {/* Recent Violations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Violations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ViolationHistoryScreen')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityCard}>
          {recentViolations.length > 0 ? (
            recentViolations.map((item) => (
              <TouchableOpacity 
                key={item.id.toString()} 
                style={styles.activityItem}
                onPress={() => navigation.navigate('ViolationDetailScreen', { violationId: item.id })}
              >
                <View style={[styles.activityIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="alert-circle" size={20} color="#D9534F" />
                </View>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>{item.type || 'Security Violation'}</Text>
                  <Text style={styles.activityTime}>{new Date(item.created_at).toLocaleTimeString()} - {item.location || 'Unknown'}</Text>
                  <View style={styles.activityMeta}>
                    <View style={[styles.severityBadge, { backgroundColor: item.severity === 'high' ? '#D9534F' : item.severity === 'medium' ? '#F0AD4E' : '#5A8F69' }]}>
                      <Text style={styles.severityText}>{item.severity || 'Unknown'}</Text>
                    </View>
                    <Text style={styles.activityType}>{item.type || 'Violation'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9EC19A" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#9EC19A" />
              <Text style={styles.emptyStateText}>No recent violations</Text>
            </View>
          )}
        </View>

        {showDatePicker && (
          <RNDateTimePicker
            value={dateRange[showDatePicker]}
            mode="date"
            display="default"
            onChange={(event, date) => handleDateChange(event, date, showDatePicker)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FBF8' 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#5A8F69',
    fontSize: 16,
  },
  scrollContainer: { 
    flexGrow: 1,
    padding: 16, 
    paddingBottom: 40,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    paddingTop: 10
  },
  menuButton: {
    padding: 8,
  },
  greeting: { 
    fontSize: 16, 
    color: '#5A8F69',
    marginBottom: 4
  },
  userName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#2c683f' 
  },
  profileButton: {
    padding: 4
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#2c683f',
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  dateFilterButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 8, 
    borderRadius: 12,
    backgroundColor: '#E8F5E9', 
    borderWidth: 1, 
    borderColor: '#E8F5E9'
  },
  dateFilterText: { 
    marginLeft: 6, 
    color: '#7ABA78', 
    fontWeight: '500',
    fontSize: 12
  },
  viewAllText: {
    color: '#7ABA78',
    fontWeight: '600',
    fontSize: 14
  },
  statsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between', 
    marginBottom: 24 
  },
  statCard: {
    width: '48%', 
    padding: 16, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statNumber: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 4,
    color: '#2c683f'
  },
  statLabel: { 
    fontSize: 12, 
    color: '#5A8F69',
    fontWeight: '500'
  },
  chartContainer: {
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: '#E8F5E9', 
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c683f',
    marginBottom: 12,
    textAlign: 'center'
  },
  chart: {
    borderRadius: 12,
    alignSelf: 'center'
  },
  activityCard: {
    borderRadius: 16, 
    backgroundColor: '#ffffff', 
    padding: 16, 
    borderWidth: 1,
    borderColor: '#E8F5E9', 
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 200,
  },
  activityItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F8E9',
  },
  activityIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  activityText: { 
    flex: 1 
  },
  activityTitle: { 
    fontSize: 14, 
    color: '#2c683f', 
    marginBottom: 4, 
    fontWeight: '600' 
  },
  activityTime: { 
    fontSize: 12, 
    color: '#5A8F69',
    marginBottom: 6
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityType: {
    fontSize: 10,
    color: '#5A8F69',
    fontStyle: 'italic',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#5A8F69',
    fontSize: 16,
    fontWeight: '500',
  },
  // Sidebar styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#fff',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F8FBF8',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  sidebarUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c683f',
    marginTop: 10,
  },
  sidebarUserRole: {
    fontSize: 14,
    color: '#5A8F69',
    marginTop: 4,
  },
  menuItems: {
    flex: 1,
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2c683f',
    marginLeft: 15,
    fontWeight: '500',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  footerText: {
    fontSize: 12,
    color: '#5A8F69',
    textAlign: 'center',
  },
});

export default GuardDashboardScreens;