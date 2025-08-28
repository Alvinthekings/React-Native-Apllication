import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, TextInput,
  Modal, TouchableWithoutFeedback, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchViolations } from '../api';

const ViolationHistoryScreen = () => {
  const navigation = useNavigation();
  const [violations, setViolations] = useState([]);
  const [filteredViolations, setFilteredViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViolationType, setSelectedViolationType] = useState('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [violationTypes, setViolationTypes] = useState([]);

  // Date filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadViolations();
  }, []);

  useEffect(() => {
    filterViolations();
  }, [violations, searchQuery, selectedViolationType, startDate, endDate]);

  const loadViolations = async () => {
    try {
      setError(null);
      const data = await fetchViolations();
      console.log("Violations API response:", data);
      
      let violationsData = [];
      if (data.success && data.violations?.data) {
        violationsData = data.violations.data;
      } else if (Array.isArray(data)) {
        violationsData = data;
      } else if (data.violations && Array.isArray(data.violations)) {
        violationsData = data.violations;
      }
      
      setViolations(violationsData);
      const types = [...new Set(violationsData.map(item => item.violation_type).filter(Boolean))];
      setViolationTypes(['All', ...types]);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setError('Failed to load violations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterViolations = () => {
    let filtered = [...violations];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.student?.first_name?.toLowerCase().includes(query) ||
        item.student?.last_name?.toLowerCase().includes(query) ||
        `${item.student?.first_name} ${item.student?.last_name}`.toLowerCase().includes(query))
      );
    }
    
    // Filter by violation type
    if (selectedViolationType !== 'All') {
      filtered = filtered.filter(item => item.violation_type === selectedViolationType);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(item => new Date(item.violation_date) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(item => new Date(item.violation_date) <= endDate);
    }
    
    setFilteredViolations(filtered);
  };

  const handleRetry = () => {
    setLoading(true);
    loadViolations();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ViolationDetailScreen', { violationId: item.id })}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name="alert-circle-outline" size={28} color="#d9534f" />
      </View>
      <View style={styles.info}>
        <Text style={styles.student}>
          {item.student?.first_name} {item.student?.last_name}
        </Text>
        <Text style={styles.violation}>{item.violation_type}</Text>
        <Text style={styles.meta}>
          {item.violation_date} • {item.location || 'N/A'}
        </Text>
      </View>
      <Text style={styles.confidence}>
        {item.confidence_level ? `${item.confidence_level}%` : ''}
      </Text>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.filterModal}>
              <Text style={styles.filterTitle}>Filter Options</Text>
              
              {/* Violation Type */}
              <Text style={styles.sectionTitle}>Violation Type</Text>
              {violationTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    selectedViolationType === type && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedViolationType(type)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedViolationType === type && styles.filterOptionTextSelected
                  ]}>
                    {type}
                  </Text>
                  {selectedViolationType === type && (
                    <Ionicons name="checkmark" size={20} color="#5cb85c" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Date Pickers */}
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar" size={18} color="#5cb85c" />
                  <Text style={styles.dateButtonText}>
                    {startDate ? startDate.toDateString() : "Start Date"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar" size={18} color="#5cb85c" />
                  <Text style={styles.dateButtonText}>
                    {endDate ? endDate.toDateString() : "End Date"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}

              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={() => {
                  setSelectedViolationType('All');
                  setStartDate(null);
                  setEndDate(null);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text style={styles.clearAllText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#5cb85c" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#d9534f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Search + Filter Button */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      
      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color="#6c757d" />
          <Text style={styles.emptyText}>
            {violations.length === 0 
              ? 'No violations found' 
              : 'No violations match your search criteria'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredViolations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
      
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5cb85c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  filterButtonText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  filterTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#343a40' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#495057' },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterOptionSelected: { backgroundColor: '#f8f9fa' },
  filterOptionText: { fontSize: 16, color: '#495057' },
  filterOptionTextSelected: { color: '#5cb85c', fontWeight: '600' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  dateButtonText: { marginLeft: 6, color: '#495057' },
  clearAllButton: { marginTop: 16, alignSelf: 'flex-end' },
  clearAllText: { color: '#d9534f', fontSize: 14, fontWeight: '600' },
  card: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e9ecef',
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 3, 
    elevation: 2
  },
  iconWrapper: { marginRight: 12 },
  info: { flex: 1 },
  student: { fontSize: 16, fontWeight: '600', color: '#343a40' },
  violation: { fontSize: 14, color: '#d9534f', marginVertical: 2 },
  meta: { fontSize: 12, color: '#6c757d' },
  confidence: { fontSize: 14, fontWeight: '600', color: '#5cb85c' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#d9534f', textAlign: 'center', marginVertical: 16 },
  retryButton: { backgroundColor: '#5cb85c', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  retryButtonText: { color: 'white', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginTop: 16 },
});

export default ViolationHistoryScreen;
