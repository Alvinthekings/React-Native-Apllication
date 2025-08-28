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
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fetchViolationDetails } from '../api';

const ViolationDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { violationId } = route.params;

  const [violation, setViolation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadViolationData();
  }, [violationId]);

  const loadViolationData = async () => {
    try {
      setIsLoading(true);
      const violationData = await fetchViolationDetails(violationId);
      console.log('Raw violation data:', violationData);

      if (violationData.success) {
        setViolation(violationData.violation);
        console.log('Violation date field:', violationData.violation.violation_date); // Fixed field name
      } else {
        Alert.alert('Error', violationData.message || 'Failed to load violation details');
      }
    } catch (error) {
      console.error('Error loading violation data:', error);
      Alert.alert('Error', 'Failed to load violation data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewEvidence = (evidenceUrl) => {
    if (evidenceUrl) {
      Linking.openURL(evidenceUrl).catch(() => {
        Alert.alert('Error', 'Could not open the evidence file');
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    
    // Try parsing as ISO first
    let date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      // If ISO fails, try other common formats
      date = new Date(dateString.replace(' ', 'T') + 'Z');
    }
    
    return isNaN(date.getTime()) 
      ? 'Invalid date' 
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return '#5A8F69';
      case 'medium': return '#E9B949';
      case 'high': return '#D9534F';
      default: return '#5A8F69';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return '#E9B949';
      case 'under_review': return '#5A8F69';
      case 'resolved': return '#2c683f';
      case 'dismissed': return '#9EC19A';
      default: return '#5A8F69';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#5A8F69" />
        <Text style={styles.loadingText}>Loading Violation Details...</Text>
      </SafeAreaView>
    );
  }

  if (!violation) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#D9534F" />
        <Text style={styles.errorText}>Violation not found</Text>
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
        <Text style={styles.headerTitle}>Violation Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        {/* Violation Overview */}
        <View style={styles.overviewSection}>
          <View style={styles.severityBadge}>
            <View 
              style={[
                styles.severityDot, 
                { backgroundColor: getSeverityColor(violation.severity) }
              ]} 
            />
            <Text style={styles.severityText}>
              {violation.severity.charAt(0).toUpperCase() + violation.severity.slice(1)} Severity
            </Text>
          </View>
          
          <Text style={styles.violationType}>{violation.type}</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(violation.status) }
            ]}>
              <Text style={styles.statusText}>
                {violation.status.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Violation Details */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Violation Information</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              {/* Fixed: changed violation.date to violation.violation_date */}
              <Text style={styles.detailValue}>{formatDate(violation.violation_date)}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{violation.location || 'Not specified'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color="#5A8F69" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{violation.description}</Text>
            </View>
          </View>
        </View>

        {/* Evidence */}
        {violation.evidence && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            
            {violation.evidence_type === 'image' ? (
              <TouchableOpacity onPress={() => handleViewEvidence(violation.evidence)}>
                <Image 
                  source={{ uri: violation.evidence }} 
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
                <Text style={styles.evidenceLink}>View Full Image</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.evidenceButton}
                onPress={() => handleViewEvidence(violation.evidence)}
              >
                <Ionicons name="document-outline" size={24} color="#5A8F69" />
                <Text style={styles.evidenceButtonText}>View Evidence Document</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={loadViolationData}
            >
              <Ionicons name="refresh-outline" size={20} color="#5A8F69" />
              <Text style={[styles.actionButtonText, { color: '#5A8F69' }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 4,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c683f',
  },
  headerRight: {
    width: 32,
  },
  overviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    alignItems: 'center',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A8F69',
  },
  violationType: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c683f',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#9EC19A',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
    alignItems: 'flex-start',
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
  evidenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  evidenceLink: {
    color: '#5A8F69',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FBF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  evidenceButtonText: {
    marginLeft: 8,
    color: '#5A8F69',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5A8F69',
  },
  actionButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default ViolationDetailScreen;