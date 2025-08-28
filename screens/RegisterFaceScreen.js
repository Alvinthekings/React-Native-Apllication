import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  ScrollView,
  Keyboard
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { fetchStudents, encodeFace, registerFace } from '../api';

const toMessage = (val, fallback = 'Unknown error') => {
  if (val === null || val === undefined) return String(fallback);
  if (typeof val === 'string') return val;
  try {
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  } catch {
    return String(fallback);
  }
};

const RegisterFaceScreen = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [source] = useState('camera_capture');
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedBase64, setCapturedBase64] = useState(null);
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [faceData, setFaceData] = useState({ landmarks: null, confidence: 0 });
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Select Student, 2: Capture Face, 3: Review & Register
  const [encodingPhoto, setEncodingPhoto] = useState(false);

  // Fetch students
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchStudents();
        const list = Array.isArray(data) ? data : (data?.students ?? []);
        setStudents(list || []);
        setFilteredStudents(list || []);
      } catch (err) {
        Alert.alert('Students Load Failed', toMessage(err?.message || err));
      }
    })();
  }, []);

  // Filter students by search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(student =>
        student.first_name.toLowerCase().includes(query) ||
        student.last_name.toLowerCase().includes(query) ||
        student.grade_level?.toLowerCase().includes(query) ||
        student.lrn?.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setShowDropdown(false);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const toggleCameraFacing = () => setFacing(c => (c === 'back' ? 'front' : 'back'));

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      setEncodingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.8, 
        base64: true, 
        skipProcessing: false 
      });
      
      if (!photo?.base64) {
        setEncodingPhoto(false);
        return Alert.alert('Capture failed', 'No image data captured.');
      }

      setCapturedPhoto(photo.uri);
      setCapturedBase64(photo.base64);
      
      // Encode face immediately after capture to get confidence score
      try {
        const encResponse = await encodeFace(photo.base64);
        if (encResponse?.confidence !== undefined) {
          setFaceData({
            landmarks: encResponse.landmarks ?? null,
            confidence: encResponse.confidence * 100, // Convert to percentage
          });
        } else if (encResponse?.error) {
          Alert.alert('Face Detection', 'No face detected. Please try again.');
          setCapturedPhoto(null);
          setCapturedBase64(null);
          setEncodingPhoto(false);
          return;
        }
      } catch (encodeError) {
        console.error('Face encoding error:', encodeError);
        // Continue to review step even if encoding fails
      }
      
      setEncodingPhoto(false);
      setCurrentStep(3); // Move to review step
    } catch (e) {
      setEncodingPhoto(false);
      Alert.alert('Capture error', toMessage(e?.message || e));
    }
  };

  const handleSubmit = async () => {
  if (!selectedStudent) return Alert.alert('Error', 'Please select a student.');
  if (!capturedBase64) return Alert.alert('Error', 'Please capture a face first.');

  setLoading(true);
  try {
    // Re-encode face to get fresh encoding for registration
    const encResponse = await encodeFace(capturedBase64);
    if (!encResponse?.encoding) {
      setLoading(false);
      return Alert.alert('Encoding failed', toMessage(encResponse?.error || 'No face detected'));
    }

    const payload = {
      student_id: selectedStudent.id,
      face_encoding: encResponse.encoding,
      face_image_data: capturedBase64,
      face_image_mime_type: 'image/jpeg',
      source,
      device_id: 'MOBILE_APP',
      confidence_score: encResponse.confidence * 100, // Convert to percentage
      face_landmarks: encResponse.landmarks ?? null,
    };

    const result = await registerFace(payload);
    setLoading(false);

    if (result?.error || result?.success === false) {
      const errorMessage = toMessage(result?.message || result?.errors || 'Server rejected the request');
      
      // Check if error indicates face already registered
      if (errorMessage.toLowerCase().includes('already registered') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('exists')) {
        
        return Alert.alert(
          'Face Already Registered',
          'This student already has a registered face. Please select a different student.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset to step 1 to select a different student
                setCapturedPhoto(null);
                setCapturedBase64(null);
                setFaceData({ landmarks: null, confidence: 0 });
                setSelectedStudent(null);
                setSearchQuery('');
                setCurrentStep(1);
              }
            }
          ]
        );
      }
      
      return Alert.alert('Registration Failed', errorMessage);
    }

    Alert.alert('Success', 'Face registered successfully!');
    
    // Reset the process
    setCapturedPhoto(null);
    setCapturedBase64(null);
    setFaceData({ landmarks: null, confidence: 0 });
    setSelectedStudent(null);
    setSearchQuery('');
    setCurrentStep(1);
  } catch (err) {
    setLoading(false);
    const errorMessage = toMessage(err?.message || err);
    
    // Check if error indicates face already registered
    if (errorMessage.toLowerCase().includes('already registered') || 
        errorMessage.toLowerCase().includes('duplicate') ||
        errorMessage.toLowerCase().includes('exists')) {
      
      return Alert.alert(
        'Face Already Registered',
        'This student already has a registered face. Please select a different student or contact administration if this is an error.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset to step 1 to select a different student
              setCapturedPhoto(null);
              setCapturedBase64(null);
              setFaceData({ landmarks: null, confidence: 0 });
              setSelectedStudent(null);
              setSearchQuery('');
              setCurrentStep(1);
            }
          }
        ]
      );
    }
    
    Alert.alert('Registration Failed', errorMessage);
  }
};

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.first_name} ${student.last_name}`);
    setShowDropdown(false);
    setCurrentStep(2); // Move to capture face step
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity style={styles.studentItem} onPress={() => selectStudent(item)}>
      <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
      <Text style={styles.studentMeta}>
        Grade: {item.grade_level} | LRN: {item.lrn}
      </Text>
    </TouchableOpacity>
  );

  if (!permission) return <View style={styles.container}><Text>Loading camera permissions...</Text></View>;
  if (!permission.granted) return (
    <View style={styles.container}>
      <Text style={styles.permissionText}>We need your permission to use the camera.</Text>
      <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
        <Text style={styles.permissionButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepContainer}>
        <View style={[styles.step, currentStep === 1 && styles.activeStep]}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>Select Student</Text>
        </View>
        
        <View style={[styles.stepConnector, (currentStep >= 2) && styles.activeConnector]} />
        
        <View style={[styles.step, currentStep === 2 && styles.activeStep]}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>Capture Face</Text>
        </View>
        
        <View style={[styles.stepConnector, (currentStep >= 3) && styles.activeConnector]} />
        
        <View style={[styles.step, currentStep === 3 && styles.activeStep]}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>Register</Text>
        </View>
      </View>

      {/* Step 1: Select Student */}
      {currentStep === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.sectionTitle}>Select Student</Text>
          <Text style={styles.label}>Search by name, grade, or LRN:</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Type to search students..."
              value={searchQuery}
              onChangeText={text => { 
                setSearchQuery(text); 
                setShowDropdown(true); 
                if (!text) setSelectedStudent(null); 
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && filteredStudents.length > 0 && (
              <View style={styles.dropdown}>
                <FlatList
                  data={filteredStudents}
                  renderItem={renderStudentItem}
                  keyExtractor={item => item.id.toString()}
                  style={styles.dropdownList}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled={true}
                />
              </View>
            )}
          </View>

          {selectedStudent && (
            <View style={styles.selectedStudent}>
              <Text style={styles.selectedText}>Selected: {selectedStudent.first_name} {selectedStudent.last_name}</Text>
              <Text style={styles.selectedMeta}>
                Grade: {selectedStudent.grade_level} | LRN: {selectedStudent.lrn}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.continueButton, !selectedStudent && { opacity: 0.5 }]}
            onPress={() => setCurrentStep(2)}
            disabled={!selectedStudent}
          >
            <Text style={styles.continueButtonText}>Continue to Capture</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Capture Face */}
      {currentStep === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.sectionTitle}>Capture Face Image</Text>
          
          <View style={styles.cameraWrapper}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
              <View style={styles.faceGuide}>
                <View style={styles.faceOutline} />
              </View>
            </CameraView>
            
            <View style={styles.captureTips}>
              <Text style={styles.tipText}>• Ensure good lighting on the face</Text>
              <Text style={styles.tipText}>• Face should be centered in the circle</Text>
              <Text style={styles.tipText}>• Remove sunglasses or hats</Text>
              <Text style={styles.tipText}>• Maintain a neutral expression</Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.circleButton} onPress={toggleCameraFacing}>
                <Ionicons name="camera-reverse" size={30} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.captureButton, encodingPhoto && { opacity: 0.7 }]} 
                onPress={takePhoto}
                disabled={encodingPhoto}
              >
                {encodingPhoto ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <MaterialIcons name="camera" size={32} color="white" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => setCurrentStep(1)}
              >
                <Ionicons name="arrow-back" size={24} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Step 3: Review & Register */}
      {currentStep === 3 && (
        <ScrollView style={styles.stepContent} nestedScrollEnabled={true}>
          <Text style={styles.sectionTitle}>Review & Register</Text>
          
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedPhoto }} style={styles.preview} />
            
            <View style={styles.selectedStudent}>
              <Text style={styles.selectedText}>{selectedStudent.first_name} {selectedStudent.last_name}</Text>
              <Text style={styles.selectedMeta}>
                Grade: {selectedStudent.grade_level} | LRN: {selectedStudent.lrn}
              </Text>
            </View>
            
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Face Detection Confidence:</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${faceData.confidence}%` }
                  ]} 
                />
              </View>
              <Text style={styles.confidenceValue}>{faceData.confidence.toFixed(1)}%</Text>
              
              {faceData.confidence > 0 && (
                <Text style={[
                  styles.confidenceStatus,
                  faceData.confidence > 70 ? styles.confidenceGood : 
                  faceData.confidence > 40 ? styles.confidenceMedium : styles.confidencePoor
                ]}>
                  {faceData.confidence > 70 ? 'Good quality' : 
                   faceData.confidence > 40 ? 'Fair quality' : 'Poor quality - consider retaking'}
                </Text>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={() => {
                  setCapturedPhoto(null);
                  setCapturedBase64(null);
                  setFaceData({ landmarks: null, confidence: 0 });
                  setCurrentStep(2);
                }}
              >
                <Ionicons name="refresh" size={20} color="#2E7D32" />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.registerButton, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.registerButtonText}>Register Face</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.backToStart}
              onPress={() => {
                setCapturedPhoto(null);
                setCapturedBase64(null);
                setFaceData({ landmarks: null, confidence: 0 });
                setSelectedStudent(null);
                setSearchQuery('');
                setCurrentStep(1);
              }}
            >
              <Text style={styles.backToStartText}>Select Different Student</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default RegisterFaceScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  permissionButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  step: {
    alignItems: 'center',
    opacity: 0.5,
  },
  activeStep: {
    opacity: 1,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepNumberText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E8F5E9',
    marginHorizontal: 5,
  },
  activeConnector: {
    backgroundColor: '#4CAF50',
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: { 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#2E7D32', 
    fontSize: 16 
  },
  searchContainer: { 
    position: 'relative', 
    zIndex: 1000, 
    marginBottom: 15 
  },
  searchInput: { 
    borderWidth: 1, 
    borderColor: '#A5D6A7', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: '#F1F8E9' 
  },
  dropdown: { 
    position: 'absolute', 
    top: 50, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#C8E6C9', 
    borderRadius: 8, 
    maxHeight: 200, 
    zIndex: 1001, 
    elevation: 5 
  },
  dropdownList: { 
    maxHeight: 200 
  },
  studentItem: { 
    paddingVertical: 12, 
    paddingHorizontal: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  studentName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#2E7D32' 
  },
  studentMeta: { 
    fontSize: 14, 
    color: '#388E3C', 
    marginTop: 2 
  },
  selectedStudent: { 
    backgroundColor: '#E8F5E9', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  selectedText: { 
    fontWeight: 'bold', 
    color: '#1B5E20', 
    fontSize: 17 
  },
  selectedMeta: { 
    color: '#388E3C', 
    marginTop: 3 
  },
  continueButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  continueButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  cameraWrapper: {
    position: 'relative',
    height: '85%',
  },
  camera: { 
    width: '100%', 
    height: 300, 
    borderRadius: 8, 
    overflow: 'hidden'
  },
  faceGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  faceOutline: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#FFFFFFAA',
    borderStyle: 'dashed',
  },
  captureTips: {
    padding: 10,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 2,
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
  },
  captureButton: { 
    backgroundColor: '#2E7D32', 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  circleButton: { 
    backgroundColor: '#4CAF50', 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  previewContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  preview: { 
    width: '100%', 
    height: 300, 
    borderRadius: 8, 
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E8F5E9'
  },
  confidenceContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    marginBottom: 20,
  },
  confidenceLabel: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  confidenceBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  confidenceValue: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2E7D32',
    fontSize: 16,
  },
  confidenceStatus: {
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '600',
  },
  confidenceGood: {
    color: '#4CAF50',
  },
  confidenceMedium: {
    color: '#FF9800',
  },
  confidencePoor: {
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  backToStart: {
    padding: 10,
  },
  backToStartText: {
    color: '#2E7D32',
    textDecorationLine: 'underline',
  },
});