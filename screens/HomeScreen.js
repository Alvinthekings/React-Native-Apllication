import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Dimensions,
  Animated, Easing
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { logout } from '../api'; // Adjust the path as needed
import AsyncStorage from '@react-native-async-storage/async-storage';


const SidebarMenu = ({ isOpen, onClose, user }) => {
  const navigation = useNavigation();
  
  const handleLogout = async () => {
  try {
    // Call logout API
    const result = await logout();
    
    if (result.error) {
      console.log('Logout API error:', result.message);
      // Still proceed with local logout even if API fails
    }
    
    // Clear token from storage
    await AsyncStorage.removeItem('authToken');
    
    // ✅ FIX: Navigate to "Login" instead of "LoginScreen"
    navigation.navigate('Login');
    
  } catch (error) {
    console.error('Logout error:', error);
    // Ensure we still clear local storage and navigate
    await AsyncStorage.removeItem('authToken');
    navigation.navigate('Login'); // ✅ FIX: Use "Login" instead of "LoginScreen"
  }
};
  const menuItems = [
    { 
      id: 1, 
      title: 'Dashboard', 
      icon: 'grid-outline', 
      action: () => {
        onClose();
        navigation.navigate('Dashboard', { user });
      }
    },
    { 
      id: 2, 
      title: 'Register Face', 
      icon: 'person-add-outline', 
      action: () => {
        onClose();
        navigation.navigate('RegisterFace');
      }
    },
    { 
      id: 3, 
      title: 'Auto Detect', 
      icon: 'camera-outline', 
      action: () => {
        onClose();
        navigation.navigate('AutoDetectScreen');
      }
    },
    { 
      id: 4, 
      title: 'Violations', 
      icon: 'alert-circle-outline', 
      action: () => {
        onClose();
        navigation.navigate('ViolationHistoryScreen');
      }
    },
    { 
      id: 5, 
      title: 'Students', 
      icon: 'people-outline', 
      action: () => {
        onClose();
        navigation.navigate('StudentFacesScreen');
      }
    },
    { 
      id: 6, 
      title: 'Settings', 
      icon: 'settings-outline', 
      action: () => {
        onClose();
        navigation.navigate('SettingsScreen');
      }
    },
    { 
      id: 7, 
      title: 'Logout', 
      icon: 'log-out-outline', 
      action: handleLogout
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

// ...keep imports, SidebarMenu, and other parts the same

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = route.params?.user;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnimation = new Animated.Value(0);

  const screenWidth = Dimensions.get('window').width;
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(null);

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

  const handleRegisterFace = () => navigation.navigate('RegisterFace');
  const handleAutoDetectFace = () => navigation.navigate('AutoDetectScreen');

  const features = [
    { id: 1, title: 'Register Face', icon: 'person-add', color: '#7ABA78', bgColor: '#E8F5E9', action: handleRegisterFace },
    { id: 2, title: 'Auto Detect', icon: 'camera', color: '#5A8F69', bgColor: '#F1F8E9', action: handleAutoDetectFace },
    { id: 3, title: 'Violations', icon: 'alert-circle', color: '#D9534F', bgColor: '#FFEBEE', action: () => navigation.navigate('ViolationHistoryScreen') },
    { id: 4, title: 'Students', icon: 'people', color: '#5A8F69', bgColor: '#E8F5E9', action: () => navigation.navigate('StudentFacesScreen') },
  ];

  const recentViolations = [
    { id: 1, title: 'Unauthorized access attempt', time: '10:45 AM - Block A', date: 'Today', type: 'Security Breach', severity: 'High' },
    { id: 2, title: 'Face not recognized', time: '09:30 AM - Main Gate', date: 'Today', type: 'Recognition Failure', severity: 'Medium' },
    { id: 3, title: 'Multiple attempt failure', time: 'Yesterday - 4:15 PM', date: 'Yesterday', type: 'Access Issue', severity: 'High' }
  ];

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'High': return '#D9534F';
      case 'Medium': return '#F0AD4E';
      case 'Low': return '#5A8F69';
      default: return '#6c757d';
    }
  };

  const handleDateChange = (event, selectedDate, type) => {
    setShowDatePicker(null);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, [type]: selectedDate }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#7ABA78" />
      
      <SidebarMenu isOpen={isSidebarOpen} onClose={toggleSidebar} user={user} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#2c683f" />
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={32} color="#2c683f" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: feature.bgColor }]}
              onPress={feature.action}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                <Ionicons name={feature.icon} size={24} color="white" />
              </View>
              <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Violations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Violations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ViolationHistoryScreen')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityCard}>
          {recentViolations.map((item) => (
            <TouchableOpacity 
              key={item.id.toString()} 
              style={styles.activityItem}
              onPress={() => navigation.navigate('ViolationDetailScreen', { violationId: item.id })}
            >
              <View style={[styles.activityIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="alert-circle" size={20} color="#D9534F" />
              </View>
              <View style={styles.activityText}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
                <View style={styles.activityMeta}>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                    <Text style={styles.severityText}>{item.severity}</Text>
                  </View>
                  <Text style={styles.activityType}>{item.type}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9EC19A" />
            </TouchableOpacity>
          ))}
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
  scrollContainer: { 
   flexGrow: 1,
  padding: 30, 
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
    fontSize: 24, 
    fontWeight: '700', 
    color: '#2c683f' 
  },
  profileButton: {
    padding: 4
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#2c683f',
    marginBottom: 16
  },
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 24 
  },
  featureCard: {
    width: '48%', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 16,
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  featureIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  featureTitle: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 24 
  },
  statCard: {
    width: '48%', 
    padding: 16, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 24, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 14, 
    color: '#5A8F69',
    fontWeight: '500'
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
    padding: 10, 
    borderRadius: 12,
    backgroundColor: '#E8F5E9', 
    borderWidth: 1, 
    borderColor: '#E8F5E9'
  },
  dateFilterText: { 
    marginLeft: 6, 
    color: '#7ABA78', 
    fontWeight: '500',
    fontSize: 14
  },
  viewAllText: {
    color: '#7ABA78',
    fontWeight: '600',
    fontSize: 14
  },
  chartContainer: {
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 24,
    borderWidth: 1, 
    borderColor: '#E8F5E9', 
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chart: {
    borderRadius: 12,
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
    marginBottom: 20
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
    fontSize: 16, 
    color: '#2c683f', 
    marginBottom: 4, 
    fontWeight: '600' 
  },
  activityTime: { 
    fontSize: 14, 
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
    fontSize: 12,
    fontWeight: '600',
  },
  activityType: {
    fontSize: 12,
    color: '#5A8F69',
    fontStyle: 'italic'
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

export default HomeScreen;