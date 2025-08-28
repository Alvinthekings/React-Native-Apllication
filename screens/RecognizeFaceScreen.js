import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, Button, StyleSheet, Alert, TouchableOpacity, 
  Image, ActivityIndicator, TextInput, ScrollView 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { encodeFace, recognizeFace, submitViolation, checkDuplicateViolation } from '../api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

const RecognizeAndSubmitViolation = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('front');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [faceData, setFaceData] = useState({ landmarks: null, confidence: 0 });
  const [recognizedStudent, setRecognizedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveRecognition, setLiveRecognition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState("recognize");
  const [detectionStatus, setDetectionStatus] = useState('no_face');
  const [confidenceLevel, setConfidenceLevel] = useState(0); // Add confidence level state

  // Form state
const [violation, setViolation] = useState({
  student_id: '',
  violation_type: 'late_arrival',
  description: '',
  violation_date: new Date(),
  severity: 'minor',
  location: '',
  evidence: '',
  notes: '',
  reported_by: 1,
});
const [showDatePicker, setShowDatePicker] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [submittedViolation, setSubmittedViolation] = useState(null); // Track submitted violation

// Fixed descriptions for each violation type
const violationTypes = [
  { 
    label: 'Late Arrival', 
    value: 'late_arrival',
    description: 'Student arrived late to class or school activity',
    severity: 'minor'
  },
  { 
    label: 'Uniform Violation', 
    value: 'uniform_violation',
    description: 'Student not wearing proper uniform or violating dress code',
    severity: 'minor'
  },
  { 
    label: 'Misconduct', 
    value: 'misconduct',
    description: 'Student engaged in disruptive or inappropriate behavior',
    severity: 'major'
  },
  { 
    label: 'Academic Dishonesty', 
    value: 'academic_dishonesty',
    description: 'Student involved in cheating, plagiarism, or other dishonest practices',
    severity: 'severe'
  },
  { 
    label: 'Other', 
    value: 'other',
    description: 'Other violation not covered by standard categories',
    severity: 'minor'
  },
];

  const severityLevels = [
    { label: 'Minor', value: 'minor' },
    { label: 'Major', value: 'major' },
    { label: 'Severe', value: 'severe' },
  ];

  // Update description when violation type changes
  useEffect(() => {
    const selectedType = violationTypes.find(type => type.value === violation.violation_type);
    if (selectedType) {
      setViolation(prev => ({
        ...prev,
        description: selectedType.description,
        severity: selectedType.severity
      }));
    }
  }, [violation.violation_type]);

  // Live recognition every 3 seconds
  useEffect(() => {
    let interval;
    if (!capturedPhoto && permission?.granted && !isProcessing && step === "recognize") {
      interval = setInterval(async () => {
        try {
          if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            setDetectionStatus('detecting');
            
            const photo = await cameraRef.current.takePictureAsync({
              quality: 0.3,
              base64: true,
              skipProcessing: true,
              exif: false
            });

            if (photo?.base64) {
              const encResponse = await encodeFace(photo.base64);

              if (encResponse?.encoding && encResponse?.bbox) {
                const [x1, y1, x2, y2] = encResponse.bbox;
                const faceCenterX = (x1 + x2) / 2;
                const faceCenterY = (y1 + y2) / 2;

                // Circle guide (same as styles.faceGuide)
                const circleTop = photo.height * 0.25;
                const circleLeft = photo.width * 0.15;
                const circleDiameter = photo.width * 0.70;
                const circleRadius = circleDiameter / 2;
                const circleCenterX = circleLeft + circleRadius;
                const circleCenterY = circleTop + circleRadius;

                // Distance check
                const dx = faceCenterX - circleCenterX;
                const dy = faceCenterY - circleCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const insideCircle = distance <= circleRadius;

                setFaceData({
                  landmarks: encResponse.landmarks,
                  confidence: encResponse.confidence,
                  bbox: encResponse.bbox,
                  insideCircle
                });

                if (insideCircle) {
                  const recognition = await recognizeFace(encResponse.encoding);

                  if (recognition?.recognized) {
                    setLiveRecognition({
                      confidence: recognition.confidence,
                      student: recognition.student
                    });
                    setDetectionStatus('recognized');
                    setConfidenceLevel(recognition.confidence); // Set confidence level

                    if (recognition.confidence >= 0.5 && recognition.confidence < 0.8) {
                      setRecognizedStudent(recognition.student);
                      setViolation((prev) => ({
                        ...prev,
                        student_id: recognition.student.id
                      }));
                      setStep("submit");
                    }
                  } else {
                    setLiveRecognition(null);
                    setDetectionStatus('no_face');
                  }
                } else {
                  setDetectionStatus('no_face'); // face outside guide
                }
              }
            }
          }
        } catch (error) {
          console.log("Live recognition error:", error);
          setDetectionStatus('no_face');
        } finally {
          setIsProcessing(false);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [capturedPhoto, permission, isProcessing, step]);

  const toggleCameraFacing = () => {
    setFacing((c) => (c === 'back' ? 'front' : 'back'));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setViolation({ ...violation, violation_date: selectedDate });
    }
  };

  const handleSubmit = async () => {
  if (!violation.student_id) {
    Alert.alert('Error', 'No student selected');
    return;
  }
  if (!violation.description) {
    Alert.alert('Error', 'Please enter a description');
    return;
  }

  // Check for duplicate violation on the same day
  try {
    const formattedDate = violation.violation_date.toISOString().split('T')[0];
    console.log('Checking duplicate for:', {
      student_id: violation.student_id,
      violation_type: violation.violation_type,
      date: formattedDate,
    });

    // Add a timestamp to see when this is called
    console.log('Duplicate check called at:', new Date().toISOString());
    
    const isDuplicate = await checkDuplicateViolation({
      student_id: violation.student_id,
      violation_type: violation.violation_type,
      date: formattedDate,
    });

    console.log('Duplicate check result:', isDuplicate, 'Type:', typeof isDuplicate);

    if (isDuplicate) {
      Alert.alert(
        'Duplicate Violation', 
        'This student already has a similar violation recorded today. Do you want to proceed anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Proceed', 
            onPress: () => submitViolationData()
          }
        ]
      );
    } else {
      submitViolationData();
    }
  } catch (error) {
    console.log("Error checking duplicate:", error);
    // Let's see the actual error response
    if (error.response) {
      console.log("Error response data:", error.response.data);
      console.log("Error response status:", error.response.status);
    }
    submitViolationData();
  }
};

 const submitViolationData = async () => {
  setIsSubmitting(true);
  try {
    const formattedDate = new Date(violation.violation_date.getTime() - 
      (violation.violation_date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    const response = await submitViolation({
      ...violation,
      date: formattedDate,
    });

    if (response.success) {
      setSubmittedViolation({
        ...violation,
        id: response.violation_id,
        student_name: `${recognizedStudent?.first_name} ${recognizedStudent?.last_name}`,
      });
      setStep("submitted");
    } else if (response.is_duplicate) {
      Alert.alert(
        'Duplicate Violation',
        'This violation already exists in the system. You cannot submit it again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } else {
      Alert.alert('Error', response.message || 'Failed to submit violation');
    }
  } catch (error) {
    console.log("Submit violation error:", error);
    if (error.response?.status === 409) {
      Alert.alert(
        'Duplicate Violation',
        'Duplicate violation found for this student on the same day.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } else {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  } finally {
    setIsSubmitting(false);
  }
};
  const handleEditViolation = () => {
    setStep("submit");
  };

  const handleNewViolation = () => {
    setStep("recognize");
    setRecognizedStudent(null);
    setConfidenceLevel(0);
    setSubmittedViolation(null);
    // Reset form
    setViolation({
      student_id: '',
      violation_type: 'tardiness',
      description: '',
      violation_date: new Date(),
      severity: 'minor',
      location: '',
      evidence: '',
      notes: '',
      reported_by: 1,
    });
  };

  const renderDetectionStatus = () => {
    switch (detectionStatus) {
      case 'no_face':
        return (
          <View style={styles.statusMessage}>
            <MaterialIcons name="person-off" size={24} color="white" />
            <Text style={styles.statusText}>No face detected. Please come closer to the camera.</Text>
          </View>
        );
      case 'detecting':
        return (
          <View style={styles.statusMessage}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.statusText}>Detecting face...</Text>
          </View>
        );
      case 'recognized':
        return (
          <View style={styles.statusMessage}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={[styles.statusText, {color: '#4CAF50'}]}>
              Face recognized! {(liveRecognition?.confidence * 100 || 0).toFixed(1)}% match
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (!permission) return <View style={styles.container}><Text>Loading camera permissions...</Text></View>;
  if (!permission.granted) return (
    <View style={styles.container}>
      <Text>We need your permission to use the camera.</Text>
      <Button title="Grant permission" onPress={requestPermission} />
    </View>
  );

  // Step 1: Face Recognition
  if (step === "recognize") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Face Recognition</Text>
        <Text style={styles.subtitle}>Position your face in the frame</Text>
        
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.faceGuide} />
          
          <View style={styles.overlayInfo}>
            {renderDetectionStatus()}
            
            {liveRecognition?.student && (
              <View style={styles.recognizedInfo}>
                <Text style={styles.overlayText}>
                  {liveRecognition.student.first_name} {liveRecognition.student.last_name}
                </Text>
                <Text style={[styles.overlayText, { 
                  color: liveRecognition.confidence >= 0.8 ? '#4CAF50' : 
                         liveRecognition.confidence >= 0.5 ? '#FFC107' : '#F44336' 
                }]}>
                  Confidence: {(liveRecognition.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <MaterialIcons name="flip-camera-ios" size={24} color="white" />
              <Text style={styles.buttonText}>Flip</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            • Ensure good lighting on your face
          </Text>
          <Text style={styles.instructionText}>
            • Remove sunglasses or hats
          </Text>
          <Text style={styles.instructionText}>
            • Look directly at the camera
          </Text>
        </View>
      </View>
    );
  }

  // Step 2: Submit Violation Form
  if (step === "submit") {
    return (
      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.title}>Submit Violation Report</Text>

        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            Student: {recognizedStudent?.first_name} {recognizedStudent?.last_name}
          </Text>
          <Text style={styles.confidenceLevel}>
            Recognition Confidence: {(confidenceLevel * 100).toFixed(1)}%
          </Text>
          <Text style={styles.studentId}>ID: {recognizedStudent?.id || 'N/A'}</Text>
          <Text style={styles.reportedBy}>Reported by: Guard #1</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Violation Type*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={violation.violation_type}
              onValueChange={(itemValue) =>
                setViolation({ ...violation, violation_type: itemValue })
              }
            >
              {violationTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Severity Level*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={violation.severity}
              onValueChange={(itemValue) =>
                setViolation({ ...violation, severity: itemValue })
              }
            >
              {severityLevels.map((level) => (
                <Picker.Item key={level.value} label={level.label} value={level.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Violation*</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Text>{violation.violation_date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={violation.violation_date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Where did the violation occur?"
            value={violation.location}
            onChangeText={(text) =>
              setViolation({ ...violation, location: text })
            }
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description*</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            placeholder="Provide detailed description of the violation..."
            value={violation.description}
            onChangeText={(text) =>
              setViolation({ ...violation, description: text })
            }
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Evidence (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={2}
            placeholder="Describe any evidence (photos, witnesses, etc.)"
            value={violation.evidence}
            onChangeText={(text) =>
              setViolation({ ...violation, evidence: text })
            }
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={2}
            placeholder="Any additional information..."
            value={violation.notes}
            onChangeText={(text) =>
              setViolation({ ...violation, notes: text })
            }
          />
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                Submit Violation Report
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => setStep("recognize")}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Step 3: Submission Success
  if (step === "submitted" && submittedViolation) {
    return (
      <View style={styles.submissionContainer}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
        </View>
        
        <Text style={styles.successTitle}>Violation Submitted Successfully</Text>
        
        <View style={styles.submissionDetails}>
          <Text style={styles.detailTitle}>Violation Details:</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student:</Text>
            <Text style={styles.detailValue}>{submittedViolation.student_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recognition Confidence:</Text>
            <Text style={styles.detailValue}>{(confidenceLevel * 100).toFixed(1)}%</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Violation Type:</Text>
            <Text style={styles.detailValue}>
              {violationTypes.find(t => t.value === submittedViolation.violation_type)?.label}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Severity:</Text>
            <Text style={styles.detailValue}>
              {severityLevels.find(s => s.value === submittedViolation.severity)?.label}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {submittedViolation.violation_date.toLocaleDateString()}
            </Text>
          </View>
          
          {submittedViolation.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{submittedViolation.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.submissionButtons}>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={handleEditViolation}
          >
            <Text style={styles.editButtonText}>Edit Violation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.newButton} 
            onPress={handleNewViolation}
          >
            <Text style={styles.newButtonText}>Report New Violation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    padding: 20,
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  submissionContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 5, 
    color: 'green' 
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  camera: { 
    flex: 1, 
    margin: 20,
    borderRadius: 12, 
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  faceGuide: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.7)',
    borderRadius: 100,
    borderStyle: 'dashed',
  },
  overlayInfo: { 
    position: 'absolute', 
    top: 10, 
    left: 0, 
    right: 0, 
    alignItems: 'center',
    padding: 10,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  recognizedInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  overlayText: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonContainer: { 
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center',
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  instructions: {
    margin: 20,
    padding: 15,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 5,
  },
  studentInfo: { 
    marginBottom: 20, 
    padding: 15, 
    backgroundColor: '#E8F5E9', 
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  studentName: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 5, 
    color: '#1B5E20' 
  },
  confidenceLevel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#2E7D32',
    fontWeight: '500',
  },
  studentId: { 
    fontSize: 16, 
    marginBottom: 3, 
    color: '#388E3C' 
  },
  reportedBy: { 
    fontSize: 16, 
    fontStyle: 'italic', 
    color: '#4CAF50' 
  },
  formGroup: { 
    marginBottom: 15 
  },
  label: { 
    fontWeight: 'bold', 
    marginBottom: 8, 
    fontSize: 16, 
    color: '#2E7D32' 
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#A5D6A7', 
    borderRadius: 8, 
    padding: 12, 
    backgroundColor: '#F1F8E9', 
    fontSize: 16 
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  dateInput: { 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#A5D6A7', 
    borderRadius: 8, 
    backgroundColor: '#F1F8E9' 
  },
  formButtons: {
    marginTop: 20,
    marginBottom: 30,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  cancelButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successIcon: {
    marginBottom: 20,
  },
  submissionDetails: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1B5E20',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E7D32',
  },
  detailValue: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  submissionButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  newButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  newButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
export default RecognizeAndSubmitViolation;