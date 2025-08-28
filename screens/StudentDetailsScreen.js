import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator, 
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fetchStudentDetails, fetchStudentViolations } from '../api';

const StudentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { studentId } = route.params;

  const [student, setStudent] = useState(null);
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch student details
      const studentData = await fetchStudentDetails(studentId);
      if (studentData.success) {
        setStudent(studentData.student);
      } else {
        Alert.alert('Error', studentData.message || 'Failed to load student details');
      }
      
      // Fetch student violations
      const violationsResponse = await fetchStudentViolations(studentId);
      if (violationsResponse.success) {
        setViolations(violationsResponse.violations || []);
      } else {
        Alert.alert('Error', 'Failed to load student violations');
      }
      
    } catch (error) {
      console.error('Error loading student data:', error);
      Alert.alert('Error', 'Failed to load student data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterFace = () => {
    navigation.navigate('RegisterFace', { studentId: studentId });
  };

  const handleViewViolationDetails = (violationId) => {
    navigation.navigate('ViolationDetailScreen', { violationId });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={20} color="#5A8F69" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Full Name</Text>
           <Text style={styles.detailValue}>
  {[student.first_name, student.middle_name, student.last_name, student.suffix]
    .filter(Boolean)   // remove any null/undefined/empty strings
    .join(' ')}       
</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="school-outline" size={20} color="#5A8F69" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Grade Level</Text>
            <Text style={styles.detailValue}>{student.grade_level}</Text>
          </View>
        </View>
        
        {student.strand && (
          <View style={styles.detailRow}>
            <Ionicons name="book-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Strand</Text>
              <Text style={styles.detailValue}>{student.strand}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Ionicons name="id-card-outline" size={20} color="#5A8F69" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>LRN</Text>
            <Text style={styles.detailValue}>{student.lrn}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Guardian Information</Text>
        
        {student.guardian_name && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Guardian Name</Text>
              <Text style={styles.detailValue}>{student.guardian_name}</Text>
            </View>
          </View>
        )}
        
        {student.guardian_contact && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Guardian Contact</Text>
              <Text style={styles.detailValue}>{student.guardian_contact}</Text>
            </View>
          </View>
        )}
      </View>

     <View style={styles.detailSection}>
  <Text style={styles.sectionTitle}>Face Registration Status</Text>

  {student.face_registrations && student.face_registrations.length > 0 ? (
    <View style={styles.facesContainer}>
      {student.face_registrations.map((face, index) => (
        <View 
          key={index} 
          style={[styles.statusContainer, { backgroundColor: '#E8F5E9' }]}
        >
          <Image
            source={{ uri: `data:${face.face_image_mime_type};base64,${face.face_image_data}` }}
            style={styles.registeredFaceImage}
          />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.statusText, { color: '#5A8F69' }]}>
              Registered on {new Date(face.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  ) : (
    <View style={[styles.statusContainer, { backgroundColor: '#FFF3CD' }]}>
      <Ionicons name="alert-circle" size={24} color="#FFC107" />
      <Text style={[styles.statusText, { color: '#856404', marginLeft: 8 }]}>
        No Face Registered
      </Text>
    </View>
  )}

  {!student.has_face_registered && (
    <TouchableOpacity 
      style={styles.registerButton}
      onPress={handleRegisterFace}
    >
      <Ionicons name="camera" size={20} color="#fff" />
      <Text style={styles.registerButtonText}>Register Face</Text>
    </TouchableOpacity>
  )}
</View>
    </View>
  );

  const renderViolationsTab = () => (
    <View style={styles.tabContent}>
      {violations.length > 0 ? (
        <View>
          <Text style={styles.violationCount}>
            {violations.length} violation{violations.length !== 1 ? 's' : ''} recorded
          </Text>
          
          {violations.map((violation) => (
            <TouchableOpacity 
              key={violation.id}
              style={styles.violationCard}
              onPress={() => handleViewViolationDetails(violation.id)}
            >
              <View style={styles.violationHeader}>
                <Text style={styles.violationType}>{violation.type}</Text>
                <Text style={[
                  styles.violationStatus,
                  { color: violation.status === 'resolved' ? '#5A8F69' : '#D9534F' }
                ]}>
                  {violation.status}
                </Text>
              </View>
              
              <Text style={styles.violationDescription}>
                {violation.description}
              </Text>
              
              <View style={styles.violationFooter}>
                <Text style={styles.violationDate}>
                  {formatDate(violation.date)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9EC19A" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={48} color="#9EC19A" />
          <Text style={styles.emptyStateText}>No violations recorded</Text>
          <Text style={styles.emptyStateSubtext}>
            This student has a clean record
          </Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#5A8F69" />
        <Text style={styles.loadingText}>Loading Student Details...</Text>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#D9534F" />
        <Text style={styles.errorText}>Student not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#7ABA78" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2c683f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        {/* Student Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {student.latest_face && student.latest_face.face_image_data ? (
              <Image
                source={{ uri: `data:${student.latest_face.face_image_mime_type};base64,${student.latest_face.face_image_data}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={40} color="#5A8F69" />
            )}
          </View>
          <Text style={styles.studentName}>
            {student.first_name} {student.last_name}
            {student.suffix ? ` ${student.suffix}` : ''}
          </Text>
          <Text style={styles.studentGrade}>{student.grade_level}</Text>
          {student.strand && (
            <Text style={styles.studentStrand}>{student.strand}</Text>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'violations' && styles.activeTab]}
            onPress={() => setActiveTab('violations')}
          >
            <Text style={[styles.tabText, activeTab === 'violations' && styles.activeTabText]}>
              Violations ({violations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'details' ? renderDetailsTab() : renderViolationsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FBF8',
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
  errorText: {
    marginTop: 16,
    color: '#D9534F',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#5A8F69',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c683f',
  },
  headerRight: {
    width: 32,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
  },
  studentName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c683f',
    marginBottom: 4,
    textAlign: 'center',
  },
  studentGrade: {
    fontSize: 16,
    color: '#5A8F69',
    marginBottom: 4,
  },
  studentStrand: {
    fontSize: 14,
    color: '#9EC19A',
    fontStyle: 'italic',
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
  tabContent: {
    padding: 16,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c683f',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9EC19A',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#2c683f',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A8F69',
    padding: 12,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  violationCount: {
    fontSize: 14,
    color: '#5A8F69',
    marginBottom: 16,
  },
  violationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c683f',
  },
  violationStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  violationDescription: {
    fontSize: 14,
    color: '#5A8F69',
    marginBottom: 12,
  },
  violationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  violationDate: {
    fontSize: 12,
    color: '#9EC19A',
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
    fontWeight: '600',
  },
  emptyStateSubtext: {
    marginTop: 4,
    color: '#9EC19A',
    fontSize: 14,
  },
  facesContainer: {
  flexDirection: 'column',
  gap: 12,
},
registeredFaceImage: {
  width: 60,
  height: 60,
  borderRadius: 8,
  resizeMode: 'cover',
},

});

export default StudentDetailScreen;