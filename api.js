import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Laravel API (your existing backend)
export const BASE_URL = 'http://192.168.208.46:8000/api';
// Flask encoder API (called directly from the mobile app)
export const FLASK_URL = 'http://192.168.208.46:5000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Interceptor: attach token if available
client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const flaskClient = axios.create({
  baseURL: FLASK_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

export const login = async (email, password) => {
  try {
    const deviceName = 'react-native-app'; // you can make this dynamic if needed
    const { data } = await client.post('/login', { 
      email, 
      password,
      device_name: deviceName 
    });
    return data;
  } catch (error) {
    return { 
      error: true, 
      message: error.response?.data?.message || error.response?.data?.error || 'Login failed' 
    };
  }
};

export const fetchStudents = async () => {
  try {
    const { data } = await client.get('/students'); 
    return data.students || [];
  } catch (error) {
    console.error('Error fetching students:', error?.response?.data || error.message);
    return [];
  }
};

// ✅ Call Flask encoder directly
export const encodeFace = async (imageBase64) => {
  try {
    const { data } = await flaskClient.post('/encode-face', { image_base64: imageBase64 });
    return data;
  } catch (error) {
    const msg = error.response?.data?.error || error.message || 'Encoder call failed';
    return { error: true, message: msg };
  }
};

// ✅ Register student face
export const registerFace = async (payload) => {
  try {
    const { data } = await client.post('/register-face', payload);
    return data;
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Face registration failed';
    return { error: true, message: msg };
  }
};

export const recognizeFace = async (faceEncoding, threshold = 0.6) => {
  try {
    const { data } = await client.post('/recognize-face', {
      face_encoding: faceEncoding,
      threshold: threshold,
    });
    return data;
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Face recognition failed';
    return { error: true, message: msg };
  }
};

// ✅ Submit violation
export const submitViolation = async (violation) => {
  try {
    const { data } = await client.post('/violations', violation);
    return data;
  } catch (error) {
    if (error.response?.status === 409) {
      return error.response.data;
    }
    console.error('Submit violation error:', error.response?.data || error.message);
    throw error;
  }
};

// ✅ Check duplicate violation
export const checkDuplicateViolation = async (violationData) => {
  try {
    console.log('Sending duplicate check request:', violationData);
    
    const response = await axios.post(`${BASE_URL}/check-duplicate-violation`, violationData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Duplicate check response:', response.data);
    
    if (typeof response.data.is_duplicate === 'boolean') {
      return response.data.is_duplicate;
    } else {
      console.error('Invalid response format:', response.data);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('Request timeout');
    }
    if (error.response) {
      console.log('Server responded with error:', error.response.status);
      console.log('Error data:', error.response.data);
    }
    return false;
  }
};

// ✅ Fetch all violations
export const fetchViolations = async () => {
  try {
    const { data } = await client.get('/violations');
    return data;
  } catch (error) {
    console.error('Error fetching violations:', error);
    return { success: false, violations: { data: [] } };
  }
};

// ✅ Fetch violation by ID
export const fetchViolationById = async (id) => {
  try {
    if (!id) throw new Error('Violation ID is required');
    const res = await client.get(`/violations/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching violation by ID:', error.response?.data || error.message);
    return { success: false, message: 'Failed to fetch violation by ID' };
  }
};

// ✅ Fetch statistics
export const fetchViolationStats = async () => {
  const res = await client.get('/violations/statistics');
  return res.data;
};

// ✅ Logout
export const logout = async () => {
  try {
    const { data } = await client.post('/logout');
    return data;
  } catch (error) {
    return { 
      error: true, 
      message: error.response?.data?.message || 'Logout failed' 
    };
  }
};


// ✅ Fetch violation details (use client + interceptor)
export const fetchViolationDetails = async (violationId) => {
  try {
    if (!violationId) throw new Error('Violation ID is required');
    const { data } = await client.get(`/violations/${violationId}`);
    return data;
  } catch (error) {
    console.error("Error fetching violation details:", error.response?.data || error.message);
    return { success: false, message: "Failed to fetch violation details" };
  }
};

// ✅ Fetch student details
export const fetchStudentDetails = async (studentId) => {
  try {
    if (!studentId || studentId === 'undefined' || studentId === null) {
      throw new Error('Invalid or missing student ID');
    }
    const { data } = await client.get(`/students/${studentId}`);
    return data;
  } catch (error) {
    console.error('Error fetching student details:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message 
      || error.response?.data?.error 
      || error.message 
      || 'Failed to fetch student details';
    return { success: false, message: errorMessage, status: error.response?.status };
  }
};

// ✅ Fetch student violations
export const fetchStudentViolations = async (studentId) => {
  try {
    if (!studentId || studentId === 'undefined' || studentId === null) {
      throw new Error('Invalid or missing student ID');
    }
    const { data } = await client.get(`/students/${studentId}/violations`);
    return data;
  } catch (error) {
    console.error('Error fetching student violations:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Failed to fetch student violations' };
  }
};

// ✅ Fetch students with face registration status
export const fetchStudentsWithFaceStatus = async () => {
  try {
    const { data } = await client.get('/students/face-registration-status');
    return data.students || [];
  } catch (error) {
    console.error('Error fetching students with face status:', error?.response?.data || error.message);
    return [];
  }
};

// ✅ Fetch face registrations for a student
export const fetchFaceRegistrations = async (studentId) => {
  try {
    if (!studentId || studentId === 'undefined' || studentId === null) {
      throw new Error('Invalid or missing student ID');
    }
    const { data } = await client.get(`/students/${studentId}/face-registrations`);
    return data;
  } catch (error) {
    console.error('Error fetching face registrations:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Failed to fetch face registrations' };
  }
};
