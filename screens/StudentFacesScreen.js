import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, FlatList,
  ActivityIndicator, Alert, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchStudentsWithFaceStatus } from '../api';

const StudentFacesScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [unregisteredStudents, setUnregisteredStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('registered');

  useEffect(() => {
    loadStudentData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadStudentData().then(() => setRefreshing(false));
  }, []);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      const studentsWithFaces = await fetchStudentsWithFaceStatus();
      
      setStudents(studentsWithFaces);
      
      // Separate registered and unregistered students using real data
      const registered = studentsWithFaces.filter(student => student.has_face_registered);
      const unregistered = studentsWithFaces.filter(student => !student.has_face_registered);
      
      setRegisteredStudents(registered);
      setUnregisteredStudents(unregistered);
      
    } catch (error) {
      console.error('Error loading student data:', error);
      Alert.alert('Error', 'Failed to load student data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStudentItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.studentCard}
        onPress={() => navigation.navigate('StudentDetailScreen', { studentId: item.id })}
      >
        <View style={styles.studentImagePlaceholder}>
          {item.latest_face && item.latest_face.face_image_data ? (
            <Image
              source={{
                uri: `data:${item.latest_face.face_image_mime_type};base64,${item.latest_face.face_image_data}`,
              }}
              style={styles.studentImage}
              onError={(e) => {
                console.log('Image loading error:', e.nativeEvent.error);
              }}
            />
          ) : (
            <Ionicons name="person" size={40} color="#5A8F69" />
          )}

          {item.has_face_registered && (
            <View style={styles.registeredBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.studentDetails}>
            Grade {item.grade_level} • LRN: {item.lrn}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: item.has_face_registered ? '#E8F5E9' : '#FFEBEE' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.has_face_registered ? '#5A8F69' : '#D9534F' }
              ]}>
                {item.has_face_registered ? 'Registered' : 'Not Registered'}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9EC19A" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'registered' ? 'people-outline' : 'person-remove-outline'} 
        size={48} 
        color="#9EC19A" 
      />
      <Text style={styles.emptyStateText}>
        {activeTab === 'registered' 
          ? 'No students with registered faces' 
          : 'All students have registered faces'
        }
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#5A8F69" />
        <Text style={styles.loadingText}>Loading Students...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#7ABA78" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2c683f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Faces</Text>
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => navigation.navigate('RegisterFace')}
        >
          <Ionicons name="person-add" size={24} color="#2c683f" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'registered' && styles.activeTab]}
          onPress={() => setActiveTab('registered')}
        >
          <Text style={[styles.tabText, activeTab === 'registered' && styles.activeTabText]}>
            Registered ({registeredStudents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'unregistered' && styles.activeTab]}
          onPress={() => setActiveTab('unregistered')}
        >
          <Text style={[styles.tabText, activeTab === 'unregistered' && styles.activeTabText]}>
            Unregistered ({unregisteredStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      <FlatList
        data={activeTab === 'registered' ? registeredStudents : unregisteredStudents}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
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
 header: {
  paddingTop: StatusBar.currentHeight, // pushes below status bar
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#E8F5E9',
  backgroundColor: '#fff',
},
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c683f',
  },
  registerButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#5A8F69',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A8F69',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    shadowColor: '#7ABA78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  studentImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  registeredBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5A8F69',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c683f',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 12,
    color: '#5A8F69',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  studentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'cover',
  },
  emptyStateText: {
    marginTop: 16,
    color: '#5A8F69',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default StudentFacesScreen;