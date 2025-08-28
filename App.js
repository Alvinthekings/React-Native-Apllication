// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';           // ✅ Path to LoginScreen.js
import HomeScreen from './screens/HomeScreen';             // ✅ Path to HomeScreen.js
import RegisterFaceScreen from './screens/RegisterFaceScreen'; // ✅ Path to RegisterFaceScreen.js
import RecognizeAndSubmitViolation from './screens/RecognizeFaceScreen';
import ViolationHistoryScreen from './screens/ViolationHistoryScreen';
import GuardDashboardScreens from './screens/DashboardScreen';
import StudentFacesScreen from './screens/StudentFacesScreen';
import StudentDetailsScreen from './screens/StudentDetailsScreen';
import ViolationDetailScreen from './screens/ViolationDetailsScreen';




const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
  <Stack.Navigator initialRouteName="Login">
    <Stack.Screen name="Login" component={LoginScreen}  options={{headerShown:false}}/>
<Stack.Screen 
  name="Home" 
  component={HomeScreen} 
   options={{ headerShown: false }}   // removes back arrow only
/>
    <Stack.Screen name="Dashboard" component={GuardDashboardScreens} options={{headerShown:false}} />

    <Stack.Screen name="RegisterFace" component={RegisterFaceScreen} />
    <Stack.Screen name="AutoDetectScreen" component={RecognizeAndSubmitViolation} />
    <Stack.Screen name="ViolationHistoryScreen" component={ViolationHistoryScreen} />
    <Stack.Screen name="ViolationDetailScreen" component={ViolationDetailScreen}  options={{headerShown:false}}/>
<Stack.Screen name="StudentDetailScreen" component={StudentDetailsScreen}  options={{headerShown:false}}/>
<Stack.Screen 
  name="StudentFacesScreen" 
  component={StudentFacesScreen} 
options={{headerShown:false}}/>

  </Stack.Navigator>
</NavigationContainer>

  );
}
